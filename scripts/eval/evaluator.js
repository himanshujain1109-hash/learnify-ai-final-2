import fs from "fs";
import path from "path";

// A minimal evaluator script to run benchmarks against the local AI pipeline.
// We mock req/res objects and call the API handler directly to test the whole pipeline.
// This is to satisfy the requirement: "CREATE AN EVALUATION SYSTEM"

import handler from "../../api/tutor/ask.js";

// Mock MathQA/EduQuest dataset subset for basic testing
const benchmarkDataset = [
  {
    category: "math",
    question: "Solve 3x + 12 = 27",
    expected_answer_contains: ["5", "x = 5"],
  },
  {
    category: "math",
    question: "Differentiate x^2 + 5x",
    expected_answer_contains: ["2x + 5"],
  },
  {
    category: "general",
    question: "What is the capital of France?",
    expected_answer_contains: ["Paris"],
  }
];

// Mock Response object
class MockResponse {
  constructor() {
    this.statusCode = 200;
    this.body = null;
  }
  status(code) {
    this.statusCode = code;
    return this;
  }
  json(data) {
    this.body = data;
    return this;
  }
  end() {
    return this;
  }
  setHeader() {}
}

async function runEvaluation() {
  console.log("🚀 Starting Learnify Evaluation Benchmark...");
  
  let passed = 0;
  let failed = 0;
  const results = [];

  // Provide a fake userId to bypass auth for testing
  // In a real environment, you might need to adjust auth middleware
  process.env.MOCK_USER_ID = "eval_user_123";

  for (const item of benchmarkDataset) {
    console.log(`\nEvaluating [${item.category}]: "${item.question}"`);
    
    const req = {
      method: "POST",
      headers: { authorization: "Bearer MOCK_TOKEN" },
      body: { question: item.question },
      // Mock requireAuth behavior if possible, or assume it passes with MOCK_TOKEN
    };
    
    // Patch requireAuth temporarily via a global flag or env var if needed.
    // For this demonstration, we assume the backend handles the mock token.
    
    const res = new MockResponse();
    
    try {
      // NOTE: For a real test run, ensure the database and python services are running!
      // This might throw if auth isn't mocked properly in this limited test environment.
      await handler(req, res);
      
      const responseData = res.body;
      const lessonString = JSON.stringify(responseData.lesson || responseData.answer || "").toLowerCase();
      
      let isMatch = false;
      for (const expected of item.expected_answer_contains) {
        if (lessonString.includes(expected.toLowerCase())) {
          isMatch = true;
          break;
        }
      }
      
      if (isMatch) {
        console.log(`✅ PASSED: Found expected answer terms in the response.`);
        passed++;
        results.push({ question: item.question, status: "PASS" });
      } else {
        console.log(`❌ FAILED: Expected one of [${item.expected_answer_contains.join(", ")}], but didn't find it.`);
        console.log(`Response snippet: ${lessonString.substring(0, 200)}...`);
        failed++;
        results.push({ question: item.question, status: "FAIL" });
      }
      
    } catch (err) {
      console.log(`⚠️ ERROR during evaluation: ${err.message}`);
      failed++;
      results.push({ question: item.question, status: "ERROR", error: err.message });
    }
  }

  console.log("\n==================================");
  console.log(`🏆 EVALUATION COMPLETE`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${benchmarkDataset.length}`);
  console.log("==================================");
  
  fs.writeFileSync(path.join(process.cwd(), "eval_results.json"), JSON.stringify(results, null, 2));
}

// Check if run directly
import { fileURLToPath } from 'url';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runEvaluation().then(() => process.exit(0));
}

export default runEvaluation;
