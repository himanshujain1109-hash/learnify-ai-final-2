const STOP_WORDS = new Set(
  "the a an and or of to in on for with from is are was were be this that it as by at into about how what why when where which whole explain teach material pdf".split(
    " "
  )
);

function clean(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function sentenceChunks(text, maxChars = 4200) {
  const normalized = String(text || "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  const units = paragraphs.flatMap((paragraph) => {
    if (paragraph.length <= maxChars) return [paragraph];
    return paragraph
      .split(/(?<=[.!?])\s+/)
      .reduce((groups, sentence) => {
        const current = groups[groups.length - 1] || "";
        if (current && `${current} ${sentence}`.length <= maxChars) {
          groups[groups.length - 1] = `${current} ${sentence}`;
        } else {
          groups.push(sentence);
        }
        return groups;
      }, []);
  });

  return units.reduce((chunks, unit) => {
    const current = chunks[chunks.length - 1];
    if (current && `${current.text}\n${unit}`.length <= maxChars) {
      current.text = `${current.text}\n${unit}`;
    } else {
      chunks.push({ text: unit });
    }
    return chunks;
  }, []);
}

function titleForChunk(text, index) {
  const firstLine = String(text)
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length >= 4 && line.length <= 100);
  if (firstLine && !/[.!?]$/.test(firstLine)) return firstLine;
  const firstSentence = clean(text).split(/(?<=[.!?])\s+/)[0];
  return firstSentence
    ? firstSentence.slice(0, 84) + (firstSentence.length > 84 ? "…" : "")
    : `Material section ${index + 1}`;
}

function keywords(text) {
  return clean(text)
    .toLowerCase()
    .split(/[^a-z0-9_+#-]+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

export function buildTeachingChunks(text) {
  return sentenceChunks(text).map((chunk, index) => ({
    id: index + 1,
    title: titleForChunk(chunk.text, index),
    text: chunk.text,
  }));
}

export function getRepresentativeText(text, maxChars = 40000) {
  if (!text) return "";
  if (text.length <= maxChars) return text;
  
  const chunkLength = Math.floor(maxChars / 3);
  const head = text.slice(0, chunkLength);
  const midStart = Math.floor(text.length / 2 - chunkLength / 2);
  const middle = text.slice(midStart, midStart + chunkLength);
  const tail = text.slice(text.length - chunkLength);
  
  return `${head}\n\n...[content skipped]...\n\n${middle}\n\n...[content skipped]...\n\n${tail}`;
}

function isBroadQuestion(question) {
  return /\b(whole|entire|all|everything|pdf|document|material|summar|overview|teach|chapter|notes)\b/i.test(
    question
  );
}

export function retrieveTeachingContext(text, question) {
  const chunks = buildTeachingChunks(text);
  const queryWords = keywords(question);
  const scored = chunks
    .map((chunk) => {
      const haystack = `${chunk.title} ${chunk.text}`.toLowerCase();
      const score = queryWords.reduce(
        (total, word) => total + (haystack.includes(word) ? 1 : 0),
        0
      );
      return { chunk, score };
    })
    .sort((a, b) => b.score - a.score || a.chunk.id - b.chunk.id);

  const limit = isBroadQuestion(question) ? 9 : 6;
  let selected;
  if (isBroadQuestion(question)) {
    // Sample across the document so a long PDF is not represented only by
    // its first page.
    const step = Math.max(1, Math.ceil(chunks.length / limit));
    selected = chunks.filter((_, index) => index % step === 0).slice(0, limit);
    if (chunks.length && !selected.some((item) => item.id === chunks[0].id)) {
      selected.unshift(chunks[0]);
    }
    selected = selected.slice(0, limit);
  } else {
    selected = scored
      .filter(({ score }) => score > 0)
      .slice(0, limit)
      .map(({ chunk }) => chunk);
    if (!selected.length) selected = chunks.slice(0, limit);
  }

  return {
    totalChunks: chunks.length,
    chunks: selected,
    sources: selected.map((chunk) => ({
      id: chunk.id,
      title: chunk.title,
      excerpt: clean(chunk.text).slice(0, 220),
    })),
  };
}

export async function retrieveTeachingContextSemantic(documentId, text, question) {
  // Try to use semantic search, fallback to naive if it fails or returns no results
  try {
    const { semanticSearch } = await import('./vector-store.js');
    const semanticResults = await semanticSearch(documentId, question, 5);
    
    if (semanticResults && semanticResults.length > 0) {
      return {
        totalChunks: -1, // Not calculated here
        chunks: semanticResults,
        sources: semanticResults.map((r, index) => ({
          id: index + 1,
          title: r.title,
          excerpt: clean(r.text).slice(0, 220),
        })),
      };
    }
  } catch (error) {
    console.error("Semantic search failed, falling back to naive keyword search", error);
  }
  
  // Fallback
  return retrieveTeachingContext(text, question);
}

export function classifyIntentPrompt(question) {
  return `Classify the following user question into one of these categories:
- math: The question involves solving equations, calculus, algebra, geometry, probability, or explicit numerical calculation.
- science: The question is about physics, chemistry, biology, or natural sciences.
- cs: The question is about algorithms, data structures, programming, or computer science concepts.
- rag: The question explicitly asks about "the uploaded document", "the pdf", "my notes", or requires reading the provided text.
- general: General academic questions that don't fit the above.

Question: "${question}"

Respond with ONLY ONE word from the categories above in lowercase.`;
}

export function buildMathTutorPrompt({ question, solverResult }) {
  let mathContext = "";
  if (solverResult && solverResult.success) {
    mathContext = `A reliable mathematical computation engine has already solved the core of this problem. 
COMPUTATIONAL RESULT:
Final Answer: ${solverResult.result}
Steps taken:
${solverResult.steps.join("\n")}

Your job is NOT to re-calculate the answer. Your job is to TEACH the student how to get to this answer step-by-step in a friendly way, using the computed result as the absolute truth.`;
  }

  return `You are Learnify, a rigorous, engaging college math teacher. Teach the student step-by-step.

Student request: ${question}

${mathContext}

Return a complete lesson as JSON with exactly this high-level shape:
{
  "title": "lesson title",
  "overview": "2-4 sentence overview",
  "learningObjectives": ["what the student will be able to do"],
  "sections": [
    {
      "title": "concept title",
      "type": "concept|example",
      "whatItIs": "formal definition",
      "whyItMatters": "why we use it",
      "simpleExplanation": "simple intuition",
      "explanation": "teacher-style detailed explanation",
      "example": "concrete worked example",
      "stepByStep": ["ordered steps to solve"],
      "visual": {
        "type": "function_plot|none",
        "title": "visual title",
        "data": { "equation": "y=x^2" }
      },
      "formulas": ["formula"],
      "commonMistakes": ["mistakes students make"]
    }
  ]
}

For math questions, strongly prefer returning a "visual" of type "function_plot" if it involves graphing a function. Set "equation" to the right hand side of y=...`;
}

export function buildTutorPrompt({ documentTitle, question, context }) {
  const sourceText = context.chunks
    .map(
      (chunk) =>
        `SOURCE SECTION ${chunk.id}: ${chunk.title}\n${chunk.text.slice(0, 4200)}`
    )
    .join("\n\n");

  return `You are Learnify, a patient, rigorous, and highly engaging college teacher. Teach the student step-by-step; do not merely summarize.

Document: ${documentTitle || "Uploaded study material"}
Student request: ${question}

CRITICAL RULES FOR HALLUCINATION & GROUNDING:
1. Use ONLY the supplied source sections for factual claims, definitions, and equations.
2. If something is not present, explicitly say that it is not established by the material.
3. You may use a clearly labelled everyday analogy or concrete example to make a supported concept easier to understand, but do not invent core document facts.

Return a complete lesson as JSON with exactly this high-level shape:
{
  "title": "lesson title",
  "overview": "2-4 sentence overview",
  "learningObjectives": ["what the student will be able to do"],
  "sections": [
    {
      "title": "concept title",
      "type": "concept|algorithm|definition|comparison|example",
      "whatItIs": "formal and precise definition",
      "whyItMatters": "why the student needs it",
      "simpleExplanation": "simple intuition before formal details",
      "explanation": "teacher-style detailed explanation",
      "analogy": "real-world analogy, or empty string if not useful",
      "example": "concrete, worked example showing application",
      "stepByStep": ["ordered steps when applicable"],
      "keyPoints": ["important takeaways"],
      "visual": {
        "type": "linked-list|stack|queue|tree|graph|array|memory|binary|flowchart|bar-chart|line-chart|scatter-plot|timeline|concept-map|comparison-table|none",
        "title": "visual title",
        "data": {}
      },
      "code": {"language": "javascript|python|cpp|java|text", "content": "" },
      "formulas": ["formula or complexity, if relevant"],
      "commonMistakes": ["mistakes students make or misconceptions"],
      "examTips": ["exam-focused advice"],
      "quiz": [
        {"question": "...", "options": ["...", "...", "...", "..."], "answerIndex": 0, "explanation": "..."}
      ]
    }
  ],
  "sourceSections": [1, 2],
  "studyPlan": ["next action"]
}

Teaching pedagogical flow (apply within each section):
- Provide a simple intuition FIRST, before the formal explanation.
- Detail the formal explanation.
- Provide a concrete example BEFORE moving to harder concepts.
- Use a visual where it clarifies the concept. Visual data must be deterministic and small enough for a browser renderer. Do not return image URLs.
- Note a common mistake to check understanding.
- End with a quick check (quiz).

Visual Data formats:
- For a linked list use data like {"nodes":["HEAD","10","20","30","NULL"],"connections":[["HEAD","10"],["10","20"],["20","30"],["30","NULL"]]}.
- For a flowchart use {"nodes":[{"id":"1","label":"Start"},{"id":"2","label":"Process"}],"edges":[["1","2"]]}.
- For a chart use labels and numeric values. For a comparison table use {"columns":["..."],"rows":[["...","..."]]}.
- Never put markdown fences around JSON. Keep each field useful; do not fill fields with generic filler.

SOURCE MATERIAL:
${sourceText}`;
}

function safeArray(value, fallback = []) {
  return Array.isArray(value) ? value.filter((item) => item !== null && item !== undefined) : fallback;
}

function safeString(value, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function normalizeVisual(visual) {
  if (!visual || typeof visual !== "object") return { type: "none", title: "", data: {} };
  const allowed = new Set([
    "linked-list",
    "stack",
    "queue",
    "tree",
    "graph",
    "array",
    "memory",
    "binary",
    "flowchart",
    "bar-chart",
    "line-chart",
    "scatter-plot",
    "timeline",
    "concept-map",
    "comparison-table",
    "none",
  ]);
  return {
    type: allowed.has(visual.type) ? visual.type : "none",
    title: safeString(visual.title, "Visual explanation"),
    data: visual.data && typeof visual.data === "object" ? visual.data : {},
  };
}

export function normalizeTutorLesson(value, { question, sources = [] } = {}) {
  const input = value && typeof value === "object" ? value : {};
  const sections = safeArray(input.sections)
    .slice(0, 8)
    .map((section, index) => ({
      title: safeString(section?.title, `Concept ${index + 1}`),
      type: safeString(section?.type, "concept"),
      whatItIs: safeString(section?.whatItIs),
      whyItMatters: safeString(section?.whyItMatters),
      simpleExplanation: safeString(section?.simpleExplanation, safeString(section?.explanation)),
      explanation: safeString(section?.explanation, safeString(section?.simpleExplanation)),
      analogy: safeString(section?.analogy),
      example: safeString(section?.example),
      stepByStep: safeArray(section?.stepByStep).map((item) => String(item)),
      keyPoints: safeArray(section?.keyPoints).map((item) => String(item)).slice(0, 10),
      visual: normalizeVisual(section?.visual),
      code:
        section?.code && typeof section.code === "object"
          ? {
              language: safeString(section.code.language, "text"),
              content: safeString(section.code.content),
            }
          : null,
      formulas: safeArray(section?.formulas).map((item) => String(item)),
      commonMistakes: safeArray(section?.commonMistakes).map((item) => String(item)),
      examTips: safeArray(section?.examTips).map((item) => String(item)),
      quiz: safeArray(section?.quiz)
        .slice(0, 3)
        .map((item) => ({
          question: safeString(item?.question),
          options: safeArray(item?.options).map((option) => String(option)).slice(0, 4),
          answerIndex: Number.isInteger(item?.answerIndex) ? item.answerIndex : 0,
          explanation: safeString(item?.explanation),
        }))
        .filter((item) => item.question),
    }))
    .filter((section) => section.title || section.explanation);

  return {
    type: "structured-lesson",
    title: safeString(input.title, "Learnify lesson"),
    overview: safeString(input.overview, "This lesson is grounded in your uploaded material."),
    learningObjectives: safeArray(input.learningObjectives).map((item) => String(item)).slice(0, 8),
    sections,
    sourceSections: safeArray(input.sourceSections).map(Number).filter(Number.isFinite),
    sources,
    studyPlan: safeArray(input.studyPlan).map((item) => String(item)).slice(0, 6),
    question: safeString(question),
  };
}