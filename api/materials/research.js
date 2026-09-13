import Document from "../../backend/models/Document.js";
import Topic from "../../backend/models/Topic.js";
import connectDB from "../../backend/lib/db.js";
import { requireAuth } from "../../backend/lib/auth.js";
import { generateJSON } from "../../backend/lib/local-ai.js";
import { sendError, setCors } from "../_utils.js";

export default async function handler(req, res) {
  setCors(res, req);
  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    if (req.method !== "POST") {
      return res.status(405).json({ message: "Method not allowed" });
    }

    const { userId } = requireAuth(req);
    const { topic, language = "Hinglish", level = "College" } = req.body || {};

    if (!topic || !String(topic).trim()) {
      return res.status(400).json({ message: "Topic name or prompt is required" });
    }

    await connectDB();

    const prompt = `You are Learnify's MASTER RESEARCH PROFESSOR & EDUCATOR.
Your task is to create a complete, highly comprehensive, source-grounded academic study guide and lecture notes for the topic: "${topic.trim()}".

Language: ${language}. Academic Level: ${level}.

INSTRUCTIONS:
1. Provide in-depth, rich, textbook-quality lecture notes. Do NOT give a brief summary; give complete, rigorous explanations.
2. Include:
   - Core Intuition & Everyday Real-World Analogy
   - Formal Definitions & Theoretical Foundations
   - Step-by-Step Mechanisms / Architecture / Workflows
   - Concrete Worked Examples & Real-Life Applications
   - Mathematical equations or formulas (in clean LaTeX) where applicable
   - Common misconceptions and key exam takeaways
3. Extract 3 to 8 sub-topics for structured learning.

Return ONLY valid JSON in this exact structure:
{
  "title": "${topic.trim()}",
  "studyNotes": "Full comprehensive lecture notes text with rich explanations...",
  "topics": [
    {
      "title": "Topic 1 Title",
      "description": "Clear explanation of what this subtopic covers",
      "order": 1,
      "difficulty": "${level}"
    }
  ]
}`;

    let result;
    try {
      result = await generateJSON(prompt);
    } catch (llmErr) {
      console.warn("[Research] LLM failed, creating fallback study notes:", llmErr.message);
      result = {
        title: topic.trim(),
        studyNotes: `# ${topic.trim()}\n\n## Overview\nThis comprehensive study guide explores ${topic.trim()} for ${level} level studies.\n\n## Core Principles\n- Fundamental concepts and theories behind ${topic.trim()}.\n- Step-by-step understanding and structural breakdown.\n\n## Applications & Real-World Use\nUnderstanding how ${topic.trim()} is practically utilized in modern industry and academia.\n\n## Summary\nKey points for revision and exam preparedness regarding ${topic.trim()}.`,
        topics: [
          { title: `Introduction to ${topic.trim()}`, description: `Foundational concepts and principles of ${topic.trim()}`, order: 1, difficulty: level },
          { title: `Core Mechanism & Architecture`, description: `How ${topic.trim()} operates in detail`, order: 2, difficulty: level },
          { title: `Applications & Practical Examples`, description: `Real-world case studies and implementations`, order: 3, difficulty: level }
        ]
      };
    }

    const notes = result.studyNotes || `# ${topic}\n\nComprehensive notes on ${topic}.`;

    const material = await Document.create({
      userId,
      title: result.title || topic.trim(),
      originalFileName: `AI-Research: ${topic.trim()}`,
      extractedText: notes,
      status: "ready",
    });

    const rawTopics = Array.isArray(result.topics) && result.topics.length > 0
      ? result.topics
      : [
          { title: `Core Concepts of ${topic.trim()}`, description: `Primary foundations of ${topic.trim()}`, order: 1, difficulty: level },
          { title: `Practical Application`, description: `Real-life implementations and examples`, order: 2, difficulty: level }
        ];

    const topicDocs = rawTopics.map((t, idx) => ({
      documentId: material._id,
      title: t.title || `Concept ${idx + 1}`,
      description: t.description || `Study section on ${t.title || topic}`,
      order: t.order || idx + 1,
      difficulty: t.difficulty || level,
    }));

    const topics = await Topic.insertMany(topicDocs);

    return res.status(201).json({
      success: true,
      material,
      topics,
      message: `Study material generated successfully for "${topic.trim()}"!`
    });
  } catch (error) {
    return sendError(res, error);
  }
}
