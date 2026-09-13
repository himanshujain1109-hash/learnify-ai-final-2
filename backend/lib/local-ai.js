// Talks to an Ollama server over HTTP instead of spawning the `ollama`
// CLI as a child process. Vercel serverless functions run in short-lived,
// stateless containers with no Ollama binary installed and no way to run
// a local LLM in-process, so `spawn("ollama", ...)` always fails there
// ("Could not start Ollama"). Ollama has always exposed this same
// functionality over HTTP (this is what the CLI itself calls under the
// hood), so pointing at a remote Ollama instance via OLLAMA_HOST fixes
// this without changing anything about how you run Ollama locally.
//
// Local dev: leave OLLAMA_HOST unset, run `ollama serve` (or just
// `ollama run <model>` once, which starts the server for you), and it
// defaults to http://127.0.0.1:11434 exactly like before.
//
// Production on Vercel: install Ollama on a small always-on VPS (a $5-6/mo
// box with 8-16GB RAM is enough for a 7B/8B quantized model), run
// `ollama serve`, expose port 11434 (behind a firewall / reverse proxy
// with auth if it's public), and set OLLAMA_HOST=http://YOUR_SERVER_IP:11434
// as a Vercel environment variable.

const OLLAMA_HOST = (process.env.OLLAMA_HOST || "http://127.0.0.1:11434").replace(/\/+$/, "");
// Support both names so existing .env files keep working while new
// deployments can use the clearer OLLAMA_MODEL name.
const MODEL =
  process.env.OLLAMA_MODEL || process.env.LOCAL_LLM_MODEL || "qwen2.5:7b";
const TIMEOUT_MS = Number(process.env.LOCAL_LLM_TIMEOUT_MS || 60000);

async function callGemini(prompt, isJson = true) {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) return null;
  const preferredModel = process.env.GEMINI_MODEL;
  const candidateModels = [
    ...(preferredModel ? [preferredModel] : []),
    "gemini-3.6-flash",
    "gemini-flash-latest",
    "gemini-3-flash-preview",
    "gemini-3.1-flash-lite-preview",
    "gemini-pro-latest",
    "gemini-flash-lite-latest"
  ];

  let lastError = null;
  for (const model of candidateModels) {
    for (const ver of ["v1beta", "v1"]) {
      try {
        const url = `https://generativelanguage.googleapis.com/${ver}/models/${model}:generateContent?key=${apiKey}`;
        const genConfig = { temperature: 0.35 };
        if (isJson && ver === "v1beta") {
          genConfig.responseMimeType = "application/json";
        }

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: genConfig
          })
        });
        if (res.ok) {
          const data = await res.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return text.trim();
        } else {
          const errText = await res.text().catch(() => "");
          lastError = new Error(`Gemini (${model} ${ver}) failed (${res.status}): ${errText.slice(0, 200)}`);
        }
      } catch (err) {
        lastError = err;
      }
    }
  }
  if (lastError) throw lastError;
  return null;
}

async function callGroq(prompt) {
  const apiKey = (process.env.GROQ_API_KEY || "").trim();
  if (!apiKey) return null;
  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.35
    })
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Groq request failed (${res.status}): ${errText.slice(0, 300)}`);
  }
  const data = await res.json();
  return (data?.choices?.[0]?.message?.content || "").trim();
}

async function callOllama(prompt) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        prompt,
        stream: false,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error(`Local LLM timed out after ${TIMEOUT_MS / 1000}s`);
    }
    throw new Error(
      `Could not reach AI provider or Ollama. ${err.message}`
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Ollama request failed (${response.status}). ${body.slice(0, 500)}`);
  }

  const data = await response.json();
  return (data.response || "").trim();
}

async function callAI(prompt, isJson = false) {
  if (process.env.GEMINI_API_KEY) {
    try {
      const res = await callGemini(prompt, isJson);
      if (res) return res;
    } catch (e) {
      console.warn("[AI] Gemini failed, attempting fallback:", e.message);
    }
  }
  if (process.env.GROQ_API_KEY) {
    try {
      const res = await callGroq(prompt);
      if (res) return res;
    } catch (e) {
      console.warn("[AI] Groq failed, attempting fallback:", e.message);
    }
  }
  return callOllama(prompt);
}

function stripCodeFences(text) {
  return String(text || "").replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

export function repairJsonString(raw) {
  let str = stripCodeFences(raw);

  // 1. Try direct parse
  try {
    return JSON.parse(str);
  } catch {
    // Continue to repair
  }

  // 2. Extract outermost { } or [ ]
  const firstBrace = str.indexOf("{");
  const firstBracket = str.indexOf("[");
  let start = -1;
  let isObject = true;
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    start = firstBrace;
    isObject = true;
  } else if (firstBracket !== -1) {
    start = firstBracket;
    isObject = false;
  }

  if (start !== -1) {
    const end = isObject ? str.lastIndexOf("}") : str.lastIndexOf("]");
    if (end > start) {
      str = str.slice(start, end + 1);
    }
  }

  try {
    return JSON.parse(str);
  } catch {
    // Continue
  }

  // 3. State machine to sanitize LaTeX, bad backslashes, bad unicode and control characters inside JSON strings
  let result = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (inString) {
      if (escaped) {
        // Character immediately following a backslash
        if (
          char === '"' ||
          char === '\\' ||
          char === '/' ||
          char === 'b' ||
          char === 'f' ||
          char === 'n' ||
          char === 'r' ||
          char === 't'
        ) {
          result += '\\' + char;
        } else if (char === 'u') {
          // Check if followed by exactly 4 hex characters
          const hex = str.slice(i + 1, i + 5);
          if (/^[0-9a-fA-F]{4}$/.test(hex)) {
            result += '\\u';
          } else {
            // Bad unicode escape like \user or \url -> turn into literal \u
            result += '\\\\u';
          }
        } else {
          // Unescaped LaTeX or special backslash like \alpha, \frac, \sigma, \d, \s -> escape it
          result += '\\\\' + char;
        }
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
        result += '"';
      } else if (char === '\n') {
        result += '\\n';
      } else if (char === '\r') {
        result += '\\r';
      } else if (char === '\t') {
        result += '\\t';
      } else {
        result += char;
      }
    } else {
      if (char === '"') {
        inString = true;
      }
      result += char;
    }
  }

  if (escaped) {
    result += '\\\\';
  }

  // Try parsing sanitized string
  try {
    return JSON.parse(result);
  } catch {
    // Remove trailing commas before } or ]
    const withoutTrailing = result.replace(/,\s*([}\]])/g, "$1");
    try {
      return JSON.parse(withoutTrailing);
    } catch (finalErr) {
      throw new Error(`JSON repair failed: ${finalErr.message}`);
    }
  }
}

export async function generateText(prompt) {
  return callAI(prompt, false);
}

export async function generateJSON(prompt) {
  const output = await callAI(
    `${prompt}\n\nIMPORTANT: Return ONLY a valid, parseable JSON object. Escape all LaTeX formulas and quotes properly.`,
    true
  );
  return repairJsonString(output);
}
