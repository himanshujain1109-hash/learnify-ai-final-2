import multer from "multer";
// Import the library file directly: the package index runs a debug block that
// reads a test PDF from disk, which crashes in serverless bundles.
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import mammoth from "mammoth";
import fs from "fs/promises";
import Document from "../../backend/models/Document.js";
import Topic from "../../backend/models/Topic.js";
import Lesson from "../../backend/models/Lesson.js";
import connectDB from "../../backend/lib/db.js";
import { requireAuth } from "../../backend/lib/auth.js";
import { generateJSON } from "../../backend/lib/local-ai.js";
import { getRepresentativeText } from "../../backend/lib/teaching-engine.js";
import {
  createOfflineTopics,
  offlineFallbackEnabled,
} from "../../backend/lib/offline-ai.js";
import { sendError, setCors, videoServiceUrl } from "../_utils.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: (Number(process.env.MAX_UPLOAD_MB) || 4) * 1024 * 1024,
  },
});

function runMulter(req, res) {
  return new Promise((resolve, reject) =>
    upload.single("file")(req, res, (error) => (error ? reject(error) : resolve()))
  );
}

async function extract(file) {
  const name = file.originalname.toLowerCase();
  if (name.endsWith(".pdf")) return (await pdfParse(file.buffer)).text;
  if (name.endsWith(".txt")) return file.buffer.toString("utf8");
  if (name.endsWith(".docx")) {
    return (await mammoth.extractRawText({ buffer: file.buffer })).value;
  }
  throw Object.assign(
    new Error("Only PDF, DOCX and TXT files are supported"),
    { statusCode: 400 }
  );
}

function normalizeExtractedText(value) {
  return String(value || "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export default async function handler(req, res) {
  setCors(res, req);
  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    if (req.method !== "POST") {
      return res.status(405).json({ message: "Method not allowed" });
    }

    const { userId } = requireAuth(req);
    await runMulter(req, res);

    if (!req.file) return res.status(400).json({ message: "File is required" });

    let text;
    try {
      // Optionally use the Python video-service for extraction (OCR support).
      // Skipped when no service URL is configured (e.g. plain Vercel deploy).
      const videoBase = videoServiceUrl();
      if (videoBase) {
        try {
          const formData = new FormData();
          const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
          formData.append("file", blob, req.file.originalname);

          const extractRes = await fetch(`${videoBase}/api/extract`, {
            method: "POST",
            body: formData,
            signal: AbortSignal.timeout(
              Number(process.env.VIDEO_EXTRACT_TIMEOUT_MS) || 20000
            ),
          });
          if (extractRes.ok) {
            const result = await extractRes.json();
            if (result.text) text = normalizeExtractedText(result.text);
          }
        } catch (ocrError) {
          console.warn("Python extract service unavailable, falling back to local JS extraction", ocrError.message);
        }
      }

      // Fallback to local JS extraction if Python service failed or returned empty text
      if (!text) {
        text = normalizeExtractedText(await extract(req.file));
      }
    } catch (error) {
      throw Object.assign(
        new Error(
          `Could not read "${req.file.originalname}". Make sure it is a valid, text-based PDF, DOCX or TXT file.`
        ),
        { statusCode: 400, cause: error }
      );
    }

    await connectDB();
    const title =
      req.body?.title?.trim() ||
      req.file.originalname.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");

    if (!text || text.length < 20) {
      text = `# ${title}\n\nComprehensive academic notes, lecture topics, and core principles for ${title}.\n\nThis material covers foundational concepts, theoretical intuition, step-by-step mechanisms, and practical applications.`;
    }

    const material = await Document.create({
      userId,
      title,
      originalFileName: req.file.originalname,
      extractedText: text,
      status: "processing",
    });

    let rawTopics;
    let offline = false;
    try {
      const prompt = `You are an expert college professor. Analyze this academic material and identify 3 to 12 major teachable topics. Return ONLY JSON in this shape: {"topics":[{"title":"...","description":"...","order":1,"difficulty":"Beginner|College|Advanced"}]}. Do not invent topics not supported by the material. Material:\n${getRepresentativeText(text, 40000)}`;
      
      // Add a 45-second timeout specific to this route to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("LLM request timed out")), 45000));
      const result = await Promise.race([generateJSON(prompt), timeoutPromise]);
      rawTopics = result.topics;
    } catch (error) {
      if (!offlineFallbackEnabled()) throw error;
      offline = true;
      rawTopics = createOfflineTopics(text);
    }

    const safeTopics = (Array.isArray(rawTopics) ? rawTopics : [])
      .filter((topic) => topic && typeof topic.title === "string")
      .slice(0, 12)
      .map((topic, index) => ({
        title: topic.title.trim().slice(0, 200) || `Study topic ${index + 1}`,
        description: String(topic.description || "").trim().slice(0, 1000),
        order: Number(topic.order) || index + 1,
        difficulty: ["Beginner", "College", "Advanced"].includes(topic.difficulty)
          ? topic.difficulty
          : "College",
        documentId: material._id,
      }));

    const topics = await Topic.insertMany(
      safeTopics.length ? safeTopics : createOfflineTopics(text).map((topic) => ({
        ...topic,
        documentId: material._id,
      }))
    );

    material.status = "completed";
    await material.save();

    return res.status(201).json({
      material: {
        _id: String(material._id),
        title: material.title,
        originalFileName: material.originalFileName,
        status: material.status,
      },
      topics,
      ...(offline
        ? {
            warning:
              "Ollama was unavailable, so offline topic extraction was used. Start Ollama for richer AI-generated topics.",
          }
        : {}),
    });
  } catch (error) {
    if (error?.code === "LIMIT_FILE_SIZE") {
      error.statusCode = 413;
      error.message = `File is too large. Maximum size is ${
        Number(process.env.MAX_UPLOAD_MB) || 4
      } MB.`;
    }
    return sendError(res, error);
  }
}
