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
    clean = re.sub(r"\b(nptel|iit|prof\.|module|lecture|slide|copyright|coursera|dept)\b.*", "", text, flags=re.I)
    words = [w for w in re.findall(r"[A-Za-z][A-Za-z0-9'-]{2,}", clean) if len(w) > 3]
    topic = " ".join(words[:4]).title() if words else "Core Subject Overview"

    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if len(s.strip()) > 25]
    if not sentences:
        sentences = [
            f"Let's explore the fundamental principles of {topic}.",
            f"Notice how these foundational mechanisms operate systematically in practice.",
            f"Understanding these key relationships allows us to master the topic effortlessly."
        ]

    s1 = sentences[0] if len(sentences) > 0 else f"{topic} defines the foundation of this domain."
    s2 = sentences[1] if len(sentences) > 1 else "The core mechanism processes inputs through structured stages."
    s3 = sentences[2] if len(sentences) > 2 else "Performance converges toward optimal stability under these constraints."

    scenes = [
        {
            "sceneNumber": 1,
            "slideType": "definition-unpack",
            "title": f"Core Intuition & Definition: {topic}",
            "narration": f"Welcome! Today we are exploring {topic}. On the smartboard, notice the formal definition from your study material: {s1[:120]}. But what does this actually mean in plain terms? Let's unpack the intuition together.",
            "keyPoints": [
                f"Formal Concept: {s1[:65]}...",
                "Plain Intuition: Translating academic theory into mental models",
                "Foundation for subsequent technical mechanisms"
            ],
            "visual": {
                "type": "definition-unpack",
                "title": f"Unpacking {topic}",
                "data": {
                    "term": topic,
                    "formalDefinition": s1[:180],
                    "plainMeaning": f"In simple terms, this establishes how {topic} operates systematically to solve real-world problems.",
                    "analogy": "Think of it like a smart navigation system that continuously recalculates the most efficient route.",
                    "keyMechanisms": ["Foundation Principle", "Systematic Transformation", "Verified Outcome"]
                }
            },
            "visualBeats": [
                {"beat": 1, "fraction": 0.35, "focus": "definition", "teacherPose": "explaining"},
                {"beat": 2, "fraction": 0.75, "focus": "plainMeaning", "teacherPose": "pointing"},
                {"beat": 3, "fraction": 1.00, "focus": "analogy", "teacherPose": "pointing"}
            ]
        },
        {
            "sceneNumber": 2,
            "slideType": "algorithm-trace",
            "title": "Step-by-Step Operational Mechanism",
            "narration": f"Now, let's look at how this process executes step-by-step. On the board, follow the active pointer across our state sequence. Notice how in Step 1 we initialize our inputs, in Step 2 we execute the primary transformation, and in Step 3 we finalize the validated result.",
            "keyPoints": [
                "Step 1: Input initialization and validation",
                "Step 2: Intermediate state processing and state transformation",
                "Step 3: Termination and verified output state"
            ],
            "visual": {
                "type": "algorithm-trace",
                "title": f"{topic} Execution Pipeline",
                "data": {
                    "algorithmName": f"{topic} State Progression",
                    "timeComplexity": "O(n)",
                    "steps": [
                        {"step": 1, "label": "Initialize State", "action": "Parse raw inputs", "active": 0},
                        {"step": 2, "label": "Transform Data", "action": "Apply core rule", "active": 1},
                        {"step": 3, "label": "Evaluate Boundary", "action": "Validate criteria", "active": 2},
                        {"step": 4, "label": "Optimal Output", "action": "Finalize result", "active": 3}
                    ]
                }
            },
            "visualBeats": [
                {"beat": 1, "fraction": 0.30, "focus": "step1", "teacherPose": "explaining"},
                {"beat": 2, "fraction": 0.65, "focus": "step2", "teacherPose": "pointing"},
                {"beat": 3, "fraction": 1.00, "focus": "step3", "teacherPose": "pointing"}
            ]
        },
        {
            "sceneNumber": 3,
            "slideType": "dynamic-graph",
            "title": "Empirical Dynamics & Convergence Curve",
            "narration": f"Let's look at the behavior on this dynamic graph. As our input parameter increases along the horizontal axis, observe how the performance metric responds. Notice the curve rising steadily, then stabilizing as it approaches the optimal threshold point highlighted in cyan.",
            "keyPoints": [
                "Horizontal Axis: Input scale and iteration progression",
                "Vertical Axis: Measured efficiency and convergence rate",
                "Notice the inflection point where diminishing returns begin"
            ],
            "visual": {
                "type": "dynamic-graph",
                "title": f"{topic} Response Curve",
                "data": {
                    "xAxis": "Training Iterations / Input Scale (x)",
                    "yAxis": "Efficiency & Accuracy Metric (y)",
                    "curveType": "sigmoid",
                    "thresholdLabel": "Optimal Convergence Frontier",
                    "thresholdValue": 0.85
                }
            },
            "visualBeats": [
                {"beat": 1, "fraction": 0.30, "focus": "axes", "teacherPose": "explaining"},
                {"beat": 2, "fraction": 0.70, "focus": "curve_tracer", "teacherPose": "pointing"},
                {"beat": 3, "fraction": 1.00, "focus": "threshold", "teacherPose": "pointing"}
            ]
        },
        {
            "sceneNumber": 4,
            "slideType": "formula-derivation",
            "title": "Mathematical Formulation & Symbol Breakdown",
            "narration": f"Here is the mathematical formulation that governs {topic}. Don't be intimidated by the symbols—look at how each component maps directly to our intuition. We have the primary objective on the left, weighted by our scaling factor, balancing accuracy against computational complexity.",
            "keyPoints": [
                "Objective Term: Primary target metric",
                "Scaling Factor: Regulates sensitivity and learning rate",
                "Regularization: Prevents overfitting and maintains stability"
            ],
            "visual": {
                "type": "formula-derivation",
                "title": f"Governing Equation for {topic}",
                "data": {
                    "formula": "J(\\theta) = \\frac{1}{2m} \\sum_{i=1}^m (h_\\theta(x^{(i)}) - y^{(i)})^2 + \\lambda \\Omega(\\theta)",
                    "variables": [
                        {"symbol": "J(θ)", "name": "Objective Function", "meaning": "Total cost or loss we aim to minimize"},
                        {"symbol": "h_θ(x)", "name": "Hypothesis Model", "meaning": "Predicted output given feature inputs"},
                        {"symbol": "y", "name": "Ground Truth", "meaning": "Target factual label from dataset"},
                        {"symbol": "λ Ω(θ)", "name": "Regularization Penalty", "meaning": "Prevents complex over-fitting"}
                    ]
                }
            },
            "visualBeats": [
                {"beat": 1, "fraction": 0.35, "focus": "formula_main", "teacherPose": "explaining"},
                {"beat": 2, "fraction": 0.70, "focus": "variables", "teacherPose": "pointing"},
                {"beat": 3, "fraction": 1.00, "focus": "derivation", "teacherPose": "pointing"}
            ]
        },
        {
            "sceneNumber": 5,
            "slideType": "comparison",
            "title": "Strategic Architectural Comparison",
            "narration": f"To master {topic}, we must understand the trade-offs. On the smartboard, examine this comparison matrix between the standard baseline approach and our optimized method. Notice how the optimized method delivers superior throughput while maintaining minimal overhead.",
            "keyPoints": [
                "Baseline Method: Simpler to implement but scales quadratically",
                "Optimized Architecture: High throughput with bounded memory",
                "Strategic Rule: Choose based on data volume and latency constraints"
            ],
            "visual": {
                "type": "comparison-matrix",
                "title": f"{topic} Trade-off Matrix",
                "data": {
                    "columns": ["Baseline Paradigm", f"Optimized {topic}"],
                    "rows": [
                        {"criterion": "Operational Complexity", "valA": "High Overhead / Slower", "valB": "Streamlined / Fast", "highlight": "B"},
                        {"criterion": "Resource Consumption", "valA": "Unbounded Memory", "valB": "Bounded Cache", "highlight": "B"},
                        {"criterion": "Robustness to Noise", "valA": "Sensitive to Perturbations", "valB": "Adaptive & Resilient", "highlight": "B"},
                        {"criterion": "Ideal Use Case", "valA": "Small-scale prototypes", "valB": "Production deployment", "highlight": "B"}
                    ]
                }
            },
            "visualBeats": [
                {"beat": 1, "fraction": 0.30, "focus": "colA", "teacherPose": "explaining"},
                {"beat": 2, "fraction": 0.65, "focus": "colB", "teacherPose": "pointing"},
                {"beat": 3, "fraction": 1.00, "focus": "summary_row", "teacherPose": "pointing"}
            ]
        },
        {
            "sceneNumber": 6,
            "slideType": "quiz",
            "title": "Checkpoint: Test Your Understanding",
            "narration": f"Time for a quick checkpoint! Look at the question on the board. What is the key advantage of using {topic} according to our lesson? Take a moment to think before we reveal the answer.",
            "keyPoints": [
                "Exam takeaway: Connect the mathematical rule to the empirical graph",
                "Avoid common trap: Confusing correlation with causal mechanism"
            ],
            "visual": {
                "type": "checkpoint",
                "title": f"Mastery Checkpoint: {topic}",
                "data": {}
            },
            "quiz": {
                "question": f"What is the primary operational advantage of {topic}?",
                "options": [
                    f"It provides structured, scalable convergence with bounded resource overhead.",
                    "It eliminates the need for mathematical validation entirely.",
                    "It works independently of any study material principles.",
                    "None of the above."
                ],
                "answerIndex": 0,
                "explanation": f"Understanding {topic} is based on systematic principles with verified operational efficiency."
            },
            "visualBeats": [
                {"beat": 1, "fraction": 0.40, "focus": "question", "teacherPose": "checkpoint"},
                {"beat": 2, "fraction": 0.75, "focus": "options", "teacherPose": "checkpoint"},
                {"beat": 3, "fraction": 1.00, "focus": "answer", "teacherPose": "pointing"}
            ]
        }
    ]

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

    prompt = f"""You are Learnify's 3D MASTER AI PROFESSOR & EDUCATOR.
Your goal is NOT to convert this document into a slideshow or read text aloud.
Your goal is to build a high-yield, step-by-step TEACHING MASTERCLASS based on this material, inspired by the best educators (3Blue1Brown, Khan Academy, Veritasium).

Total pages in source document: {total_slides}.
Target Language: {language}. Student Level: {level}. Presentation Style: {style} (Enthusiastic, clear, pedagogical).

CORE AI TEACHER RULES:
1. NEVER READ RAW BULLET POINTS OR HEADERS: Speak like a passionate human professor standing beside a digital smartboard.
2. SOURCE OF TRUTH: The uploaded material is the factual source of truth for all concepts, formulas, definitions, and data.
3. PEDAGOGICAL PROGRESSION (Create 5 to 7 rich scenes):
   - Scene 1: Hook & Core Intuition + Definition Unpack (formal definition + what it actually means in plain English + real-world analogy).
   - Scene 2: Structural Architecture or Process Flow (how the system/components connect).
   - Scene 3: Mathematical Formulation / Derivation (if applicable) OR Algorithm Step-by-Step State Trace.
   - Scene 4: Dynamic Graph / Empirical Curve (plot axes, curve type, threshold, and trend).
   - Scene 5: Strategic Comparison Matrix (contrasting approaches, trade-offs, pros & cons).
   - Scene 6: Interactive Knowledge Checkpoint Quiz.
4. SYNCHRONIZE WITH THE BOARD: Narration MUST reference the board ("Look at the smartboard...", "Notice the curve rising...", "In Step 2 of our array...", "Observe this component highlighted in cyan...").
5. VISUAL BEATS: For each scene, include 3 'visualBeats' (fractions 0.35, 0.70, 1.0) defining which element is highlighted and whether the teacher pose is 'explaining', 'pointing', or 'checkpoint'.

Supported Visual Types:
- "definition-unpack": {{"term": "...", "formalDefinition": "...", "plainMeaning": "...", "analogy": "...", "keyMechanisms": ["..."]}}
- "dynamic-graph": {{"xAxis": "...", "yAxis": "...", "curveType": "sigmoid|loss|exponential|linear|bell", "thresholdLabel": "...", "thresholdValue": 0.8}}
- "algorithm-trace": {{"algorithmName": "...", "timeComplexity": "...", "steps": [{{"step": 1, "label": "...", "action": "...", "active": 0}}]}}
- "formula-derivation": {{"formula": "LaTeX", "variables": [{{"symbol": "x", "name": "Feature", "meaning": "Input value"}}]}}
- "comparison-matrix": {{"columns": ["Method A", "Method B"], "rows": [{{"criterion": "Speed", "valA": "Slow", "valB": "Fast", "highlight": "B"}}]}}
- "pdf-diagram-walkthrough": {{"diagramTitle": "Architecture", "regions": [{{"id": "r1", "label": "Input Stage", "box": [0.05, 0.2, 0.35, 0.8], "beat": 1, "explanation": "..."}}]}}
- "concept-map": {{"nodes": [{{"id": "1", "label": "..."}}], "edges": [{{"from": "1", "to": "2"}}]}}
- "checkpoint": {{"question": "...", "options": ["..."], "answerIndex": 0}}

Return ONLY valid JSON:
{{
  "topic": "Main Topic Name",
  "scenes": [
    {{
      "sceneNumber": 1,
      "slideType": "definition-unpack",
      "title": "Clear Punchy Title",
      "narration": "Natural, spoken teacher lecture with board references.",
      "keyPoints": ["Takeaway 1", "Takeaway 2", "Takeaway 3"],
      "visual": {{
        "type": "definition-unpack|dynamic-graph|algorithm-trace|formula-derivation|comparison-matrix|pdf-diagram-walkthrough|concept-map|checkpoint",
        "title": "Smartboard Card Title",
        "data": {{ ... }}
      }},
      "visualBeats": [
        {{"beat": 1, "fraction": 0.35, "focus": "part1", "teacherPose": "explaining"}},
        {{"beat": 2, "fraction": 0.70, "focus": "part2", "teacherPose": "pointing"}},
        {{"beat": 3, "fraction": 1.00, "focus": "part3", "teacherPose": "pointing"}}
      ],
      "quiz": {{
        "question": "Only if slideType is checkpoint",
        "options": ["Correct option", "Distractor 1", "Distractor 2", "Distractor 3"],
        "answerIndex": 0,
        "explanation": "Why correct"
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
            scene.setdefault("visual", {"type": "definition-unpack" if i == 0 else "concept-map", "data": {}})
            scene.setdefault("visualBeats", [
                {"beat": 1, "fraction": 0.35, "focus": "intro", "teacherPose": "explaining"},
                {"beat": 2, "fraction": 0.70, "focus": "core", "teacherPose": "pointing"},
                {"beat": 3, "fraction": 1.00, "focus": "takeaway", "teacherPose": "pointing"}
            ])
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
