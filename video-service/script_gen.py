import json
import os
import re
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def _load_env():
    for p in [Path(__file__).resolve().parent / ".env", Path(__file__).resolve().parent.parent / ".env"]:
        if p.exists():
            try:
                for line in p.read_text(encoding="utf-8").splitlines():
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        os.environ[k.strip()] = v.strip().strip("'\"")
            except Exception:
                pass


_load_env()

MODEL = os.environ.get("OLLAMA_MODEL") or os.environ.get("LOCAL_LLM_MODEL", "qwen2.5:7b")
OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://127.0.0.1:11434").rstrip("/")
TIMEOUT = int(os.environ.get("LOCAL_LLM_TIMEOUT_SECONDS", "300"))


def _offline_fallback_enabled():
    return os.environ.get("ENABLE_OFFLINE_FALLBACK", "true").lower() not in {"0", "false", "no", "off"}


def _get_gemini_candidate_models(api_key):
    _load_env()
    configured = os.environ.get("GEMINI_MODEL", "").strip()
    if configured:
        return [configured]

    candidates = [
        "gemini-3.6-flash",
        "gemini-flash-latest",
        "gemini-3-flash-preview",
        "gemini-3.1-flash-lite-preview",
        "gemini-3.1-flash-lite",
        "gemini-pro-latest",
        "gemini-flash-lite-latest",
    ]

    deprecated = {
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-2.0-flash-001",
        "gemini-2.0-flash-exp",
        "gemini-1.5-flash",
        "gemini-1.5-flash-latest",
        "gemini-1.5-pro",
        "gemini-1.0-pro",
    }

    for version in ["v1beta", "v1"]:
        try:
            url = f"https://generativelanguage.googleapis.com/{version}/models?key={api_key}"
            req = Request(url, headers={"Content-Type": "application/json"})
            with urlopen(req, timeout=10) as r:
                data = json.loads(r.read().decode("utf-8"))
                models = [
                    m.get("name", "").replace("models/", "")
                    for m in data.get("models", [])
                    if "generateContent" in m.get("supportedGenerationMethods", [])
                    and m.get("name", "").replace("models/", "") not in deprecated
                    and not any(dep in m.get("name", "") for dep in ["2.5-flash", "2.0-flash"])
                ]
                matched = [m for m in candidates if m in models]
                if matched:
                    return matched
                if models:
                    return models
        except Exception:
            pass

    return candidates


def _generate_with_gemini(prompt):
    _load_env()
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None

    candidate_models = _get_gemini_candidate_models(api_key)
    last_error = None

    for model in candidate_models:
        for version in ["v1beta", "v1"]:
            url = f"https://generativelanguage.googleapis.com/{version}/models/{model}:generateContent?key={api_key}"
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.35,
                }
            }
            # responseMimeType is only supported in v1beta
            if version == "v1beta":
                payload["generationConfig"]["responseMimeType"] = "application/json"

            request = Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            try:
                with urlopen(request, timeout=TIMEOUT) as response:
                    data = json.loads(response.read().decode("utf-8"))
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            print(f"[video-service] Gemini succeeded with model: {model} ({version})")
                            return parts[0].get("text", "").strip()
            except HTTPError as error:
                last_error = error
                err_msg = ""
                try:
                    err_msg = error.read().decode("utf-8", errors="ignore")[:300]
                except Exception:
                    pass
                print(f"[video-service] Gemini {model} ({version}) HTTP {error.code}: {err_msg}")
            except Exception as error:
                last_error = error
                print(f"[video-service] Gemini {model} ({version}) error: {error}")

    if last_error:
        raise last_error
    return None


def _generate_with_groq(prompt):
    api_key = os.environ.get("GROQ_API_KEY", "").strip()
    if not api_key:
        return None
    model = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile").strip()
    url = "https://api.groq.com/openai/v1/chat/completions"
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.35,
        "response_format": {"type": "json_object"}
    }
    request = Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        },
        method="POST"
    )
    with urlopen(request, timeout=TIMEOUT) as response:
        data = json.loads(response.read().decode("utf-8"))
        choices = data.get("choices", [])
        if choices:
            return choices[0].get("message", {}).get("content", "").strip()
    return None


def _generate_with_ollama(prompt, temperature=0.35):
    request = Request(
        f"{OLLAMA_HOST}/api/generate",
        data=json.dumps({"model": MODEL, "prompt": prompt, "stream": False, "options": {"temperature": temperature}}).encode("utf-8"),
        headers={"Content-Type": "application/json"}, method="POST"
    )
    try:
        with urlopen(request, timeout=TIMEOUT) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        body = error.read().decode("utf-8", errors="ignore")[:800]
        if error.code == 404:
            raise RuntimeError(f'Ollama model "{MODEL}" is not available.') from error
        raise RuntimeError(f"Ollama request failed ({error.code}): {body}") from error
    except (URLError, TimeoutError, OSError) as error:
        raise RuntimeError(f"Could not reach Ollama: {error}") from error
    result = str(payload.get("response", "")).strip()
    if not result:
        raise RuntimeError("Local LLM returned an empty response.")
    return result


def _generate_ai(prompt, temperature=0.35):
    if os.environ.get("GEMINI_API_KEY"):
        try:
            res = _generate_with_gemini(prompt)
            if res:
                return res
        except Exception as e:
            print(f"[video-service] Gemini call failed: {e}")

    if os.environ.get("GROQ_API_KEY"):
        try:
            res = _generate_with_groq(prompt)
            if res:
                return res
        except Exception as e:
            print(f"[video-service] Groq call failed: {e}")

    return _generate_with_ollama(prompt, temperature)


def _parse_json(text):
    """Robust JSON parser that repairs LaTeX escapes, bad unicode, and unescaped newlines."""
    cleaned = re.sub(r"^```(?:json)?\s*", "", text.strip(), flags=re.I)
    cleaned = re.sub(r"\s*```$", "", cleaned).strip()

    # 1. Try direct parse
    try:
        return json.loads(cleaned)
    except Exception:
        pass

    # 2. Extract outermost { ... }
    first_brace = cleaned.find("{")
    last_brace = cleaned.rfind("}")
    if first_brace != -1 and last_brace > first_brace:
        cleaned = cleaned[first_brace:last_brace + 1]

    try:
        return json.loads(cleaned)
    except Exception:
        pass

    # 3. State machine repair for bad escapes (LaTeX formulas, bad unicode, unescaped newlines)
    result = []
    in_string = False
    escaped = False
    valid_escapes = {'"', '\\', '/', 'b', 'f', 'n', 'r', 't'}

    i = 0
    n = len(cleaned)
    while i < n:
        char = cleaned[i]
        if in_string:
            if escaped:
                if char in valid_escapes:
                    result.append('\\' + char)
                elif char == 'u':
                    # Check next 4 hex digits
                    hex_part = cleaned[i + 1:i + 5]
                    if len(hex_part) == 4 and all(c in "0123456789abcdefABCDEF" for c in hex_part):
                        result.append('\\u')
                    else:
                        result.append('\\\\u')
                else:
                    # e.g. \alpha, \frac, \sigma, \d -> escape the backslash
                    result.append('\\\\' + char)
                escaped = False
            elif char == '\\':
                escaped = True
            elif char == '"':
                in_string = False
                result.append('"')
            elif char == '\n':
                result.append('\\n')
            elif char == '\r':
                result.append('\\r')
            elif char == '\t':
                result.append('\\t')
            else:
                result.append(char)
        else:
            if char == '"':
                in_string = True
            result.append(char)
        i += 1

    if escaped:
        result.append('\\\\')

    repaired = "".join(result)
    # Remove trailing commas before } or ]
    repaired = re.sub(r",\s*([}\]])", r"\1", repaired)

    return json.loads(repaired)


def _clean_text(text):
    return re.sub(r"\s+", " ", str(text or "")).strip()


def _fallback(text, total_slides=1):
    # Extract actual conceptual words, ignoring metadata
    clean = re.sub(r"\b(nptel|iit|prof\.|module|lecture|slide|copyright)\b.*", "", text, flags=re.I)
    words = [w for w in re.findall(r"[A-Za-z][A-Za-z0-9'-]{2,}", clean) if len(w) > 3]
    topic = " ".join(words[:4]).title() if words else "Core Subject Overview"

    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if len(s.strip()) > 30]
    if not sentences:
        sentences = [
            f"Let's explore the fundamental principles of {topic}.",
            f"Notice how these foundational mechanisms operate systematically in practice.",
            f"Understanding these key relationships allows us to master the topic effortlessly."
        ]

    titles = [
        "Core Intuition & Big Picture",
        "Key Architectural Principles",
        "Step-by-Step Mechanism",
        "Worked Real-World Application",
        "Concept Checkpoint & Quiz",
        "Mastery Summary & Takeaways"
    ]

    scenes = []
    for i, title in enumerate(titles):
        slide_idx = min(i + 1, total_slides) if total_slides > 0 else 1
        s_text = sentences[i % len(sentences)]
        scenes.append({
            "sceneNumber": i + 1,
            "sourceSlide": slide_idx,
            "slideType": "quiz" if i == 4 else "standard",
            "title": title,
            "narration": f"In this section, we examine {title.lower()}. {s_text} Let's break down how this works step-by-step on the board.",
            "keyPoints": [
                f"Core foundation: {s_text[:70]}...",
                f"Practical takeaway for {topic}",
                "Key exam revision principle"
            ],
            "visual": {
                "type": "concept-map" if i in (0, 3) else "flowchart" if i == 1 else "comparison" if i == 2 else "none",
                "title": f"{topic} Breakdown",
                "data": {
                    "nodes": [
                        {"id": "1", "label": "Foundation"},
                        {"id": "2", "label": "Processing"},
                        {"id": "3", "label": "Output"}
                    ],
                    "edges": [{"from": "1", "to": "2"}, {"from": "2", "to": "3"}]
                }
            },
            "quiz": {
                "question": f"What is the central takeaway regarding {topic}?",
                "options": [
                    f"Understanding {topic} is based on systematic principles.",
                    "The material contains no structured mechanisms.",
                    "This concept is independent of the study guide.",
                    "None of the above."
                ],
                "answerIndex": 0,
                "explanation": f"This reflects the core principle of {topic}."
            }
        })

    return scenes


def generate_curriculum(full_text: str, options=None, total_slides=1):
    options = options or {}
    language = options.get("language", "English")
    level = options.get("level", "College")
    style = options.get("style", "Teacher")
    duration = options.get("duration", "5")
    clean = _clean_text(full_text)
    if not clean:
        return _fallback("Uploaded Study Material", total_slides)

    # Condense document text (take representative parts up to 25,000 chars)
    source = clean[:25000]

    prompt = f"""You are Learnify's 3D MASTER PROFESSOR & STORYTELLER.
You stand beside a digital classroom smartboard, teaching students like 3Blue1Brown and Khan Academy meets a brilliant Indian mentor.

Total slides available in original document: {total_slides}.
Target Language: {language}. Audience: {level}. Presentation Style: {style} (Enthusiastic, clear, pedagogical).

CRITICAL TEACHING PRINCIPLES:
1. NEVER READ RAW SLIDE TITLES OR HEADERS (Do NOT say things like "Sudeshna Sarkar Kharagpur Module 1"). Explain the actual SCIENCE and CONCEPTS in your own engaging words!
2. HOOK & INTUITION FIRST: Scene 1 must start with an engaging hook or relatable real-world dilemma ("Ever wondered how...", "Imagine you have to...").
3. CONVERSATIONAL TEACHER NARRATION:
   - If Hindi/Hinglish: Speak warmly and naturally ("Dosto, chaliye samajhte hain...", "Screen par dhyan se dekhiye...", "Iska ek bohot simple real-life example lete hain...").
   - If English: Speak like an engaging tech storyteller—punchy, insightful, and crystal clear.
   - Synchronize with the board: Actively point the student to the board ("Look at the diagram on the board...", "Notice this connection...", "As you can see in the comparison...").
4. ORIGINAL SLIDES VS DIAGRAMS:
   - For each scene, specify "sourceSlide": <1 to {max(1, total_slides)}> to show the corresponding slide from the PDF, OR
   - Specify a rich visual ("flowchart", "concept-map", "comparison", "bar-chart", "equation", "timeline") to draw on the smartboard!
5. KNOWLEDGE CHECK: Include an interactive checkpoint question in scene 5 or near the end.

Return ONLY valid JSON:
{{
  "topic": "Main Topic Name",
  "scenes": [
    {{
      "sceneNumber": 1,
      "sourceSlide": 1,
      "slideType": "standard",
      "title": "Clear Punchy Title",
      "narration": "Charismatic, conversational lecture narration explaining this step in detail.",
      "keyPoints": ["Takeaway 1 (concise)", "Takeaway 2 (concise)", "Takeaway 3 (concise)"],
      "visual": {{
        "type": "flowchart|concept-map|comparison|line-chart|bar-chart|equation|slide|none",
        "title": "Diagram Title",
        "data": {{
          "nodes": [{{"id": "1", "label": "Short label"}}, {{"id": "2", "label": "Short label"}}],
          "edges": [{{"from": "1", "to": "2"}}],
          "columns": ["Method A", "Method B"],
          "rows": [["Advantage", "Tradeoff"]],
          "labels": ["Item 1", "Item 2", "Item 3"],
          "values": [25, 45, 80],
          "equation": "LaTeX formula if relevant",
          "steps": ["Step 1", "Step 2", "Step 3"]
        }}
      }},
      "quiz": {{
        "question": "Engaging checkpoint question?",
        "options": ["Correct option", "Distractor 1", "Distractor 2", "Distractor 3"],
        "answerIndex": 0,
        "explanation": "Why this is correct."
      }}
    }}
  ]
}}

SOURCE STUDY MATERIAL:
{source}"""

    try:
        raw_response = _generate_ai(prompt, 0.3)
        parsed = _parse_json(raw_response)
        scenes = parsed.get("scenes", []) if isinstance(parsed, dict) else []
        if len(scenes) < 2:
            raise ValueError("Insufficient scenes returned by AI.")
        for i, scene in enumerate(scenes):
            scene.setdefault("sceneNumber", i + 1)
            scene.setdefault("sourceSlide", min(i + 1, total_slides) if total_slides > 0 else 1)
            scene.setdefault("title", f"Concept {i + 1}")
            scene.setdefault("narration", "")
            scene.setdefault("keyPoints", [])
            scene.setdefault("visual", {"type": "none", "data": {}})
        return scenes
    except Exception as e:
        print(f"[script_gen] AI generation failed ({e}), using grounded structured fallback.")
        if not _offline_fallback_enabled():
            raise
        return _fallback(clean, total_slides)


def generate_scene(page_text: str, page_number: int, options=None):
    scenes = generate_curriculum(page_text, options, 1)
    return scenes[min(max(page_number - 1, 0), len(scenes) - 1)]


def generate_script(page_text: str, page_number: int, options=None) -> str:
    return generate_scene(page_text, page_number, options).get("narration", "")
