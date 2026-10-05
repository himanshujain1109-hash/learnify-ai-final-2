import connectDB from "../../backend/lib/db.js";
import Document from "../../backend/models/Document.js";
import { requireAuth } from "../../backend/lib/auth.js";
import { generateJSON, generateText } from "../../backend/lib/local-ai.js";
import {
  createOfflineTutorLesson,
  offlineFallbackEnabled,
} from "../../backend/lib/offline-ai.js";
import {
  buildTutorPrompt,
  normalizeTutorLesson,
  retrieveTeachingContext,
  classifyIntentPrompt,
  buildMathTutorPrompt
} from "../../backend/lib/teaching-engine.js";
import { sendError, setCors, videoServiceUrl } from "../_utils.js";

// Call the Python math solver
async function callMathSolver(expression) {
  const base = videoServiceUrl();
  if (!base) return { success: false };
  try {
    const res = await fetch(`${base}/api/math/solve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "solve_equation", expression }),
      signal: AbortSignal.timeout(8000)
    });
    return await res.json();
  } catch (err) {
    console.error("Math solver failed:", err);
    return { success: false };
  }
}

// Call the Python visual engine
async function callVisualEngine(spec) {
  const base = videoServiceUrl();
  if (!base) return { success: false };
  try {
    const res = await fetch(`${base}/api/visual/render`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(spec),
      signal: AbortSignal.timeout(8000)
    });
    return await res.json();
  } catch (err) {
    console.error("Visual engine failed:", err);
    return { success: false };
  }
}

export default async function handler(req, res) {
  setCors(res, req);
  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });
    const { userId } = requireAuth(req);
    await connectDB();

    const { documentId, question } = req.body || {};
    if (!question?.trim()) return res.status(400).json({ message: "Question is required" });

    // 1. CLASSIFY INTENT
    const intentRaw = await generateText(classifyIntentPrompt(question));
    const intent = intentRaw ? intentRaw.toLowerCase().trim() : "general";
    console.log(`[Pipeline] Question classified as: ${intent}`);

    let lesson;
    let offline = false;
    let context = { sources: [] };
    
    // Fetch document if provided (required for RAG)
    let doc = null;
    if (documentId) {
      doc = await Document.findOne({ _id: documentId, userId });
      if (doc) {
        context = retrieveTeachingContext(doc.extractedText, question);
      }
    }

    try {
      let prompt = "";
      
      // 2. ROUTING
      if (intent === "math") {
        // Attempt to solve using computational layer first
        console.log("[Pipeline] Using Math Solver...");
        const solverResult = await callMathSolver(question);
        
        prompt = buildMathTutorPrompt({ question, solverResult });
      } else {
        // Default / RAG / General flow
        prompt = buildTutorPrompt({
          documentTitle: doc ? (doc.title || doc.originalFileName) : "General Knowledge",
          question: question.trim(),
          context,
        });
      }

      // 3. GENERATION
      const rawLesson = await generateJSON(prompt);
      
      // 4. VISUAL ENGINE (Post-processing)
      // Check if the LLM requested a specialized visual plot
      if (rawLesson.sections) {
        for (let section of rawLesson.sections) {
          if (section.visual && section.visual.type === "function_plot" && section.visual.data) {
            console.log("[Pipeline] Generating plot for:", section.visual.data.equation);
            const visualRes = await callVisualEngine(section.visual.data);
            if (visualRes.success && visualRes.svg) {
              section.visual.type = "svg";
              section.visual.data = { svg: visualRes.svg };
            }
          }
        }
      }

      lesson = normalizeTutorLesson(rawLesson, {
        question: question.trim(),
        sources: context.sources,
      });
      if (!lesson.sections.length) throw new Error("The model returned no teachable sections.");
      
    } catch (error) {
      console.warn("[Tutor] Primary lesson generation failed, using structured fallback:", error.message);
      offline = true;
      if (doc) {
        lesson = createOfflineTutorLesson(question, doc.extractedText, context.sources);
      } else {
        return res.status(500).json({ message: "Failed to generate lesson and no document available for fallback." });
      }
    }

    return res.json({
      answer: lesson,
      lesson,
      retrievedSections: context.sources,
      intent, // Return intent for debugging/evaluation
      ...(offline
        ? {
            warning:
              "AI returned a grounded study guide directly compiled from your source material.",
          }
        : {}),
    });
  } catch (error) {
    return sendError(res, error);
  }
}
