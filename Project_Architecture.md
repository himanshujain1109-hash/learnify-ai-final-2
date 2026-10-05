# Learnify AI - Project Architecture & Technical Workflow

## 1. Project Overview
Learnify AI is an advanced, AI-powered educational platform that transforms raw study materials (PDFs, PPTs, text) into interactive learning experiences. The core features include AI-generated video lectures, smart quizzes, personalized tutoring, and a dynamic 3D virtual teacher.

## 2. Tech Stack
The project is built using a modern, multi-tier microservices architecture:
- **Frontend:** React.js powered by Vite (Fast HMR, modern build tool).
- **Primary Backend (API Server):** Node.js with Express.js (Handles routing, auth, database logic).
- **Database:** MongoDB (Stores users, study materials, quiz progress, and lesson metadata).
- **Video & AI Engine (Microservice):** Python with FastAPI (Handles heavy AI generation, TTS, visual rendering, and math solving).
- **AI Integration:** Multi-provider fallback system (Google Gemini 3.6 Flash, Groq Llama-3.3, and local Ollama) to ensure 100% uptime and offline capability.

## 3. Architecture & Connectivity
The system is divided into three main components that communicate over the local network/internet via REST APIs:

1. **Frontend (Port 5173):** Serves the User Interface. It communicates with both the Node.js backend and the Python Video Service using environment variables (`VITE_API_URL` and `VITE_VIDEO_API_URL`).
2. **Node.js Backend (Port 5000):** Acts as the central hub. It handles User Authentication (JWT), Database Operations (Mongoose), and routes basic AI requests (like text summarization and quiz generation) to the AI providers.
3. **Python Video Service (Port 8000):** A dedicated high-performance microservice. Since video rendering, OCR extraction, and complex math validations are CPU/Memory intensive, they are isolated here. 

### How they connect (CORS & Networking)
To ensure seamless connectivity across devices on the same Wi-Fi network, the system is configured to listen on `0.0.0.0` (all network interfaces). The Node.js and Python servers both have a dynamic **CORS (Cross-Origin Resource Sharing)** policy that whitelists the network IP (e.g., `172.25.190.138:5173`), preventing browser security blocks when accessed remotely.

## 4. Key AI Workflows

### A. The "Notes to Video" Workflow (How it works under the hood)
1. **Upload:** User uploads a PDF/PPT on the Frontend.
2. **Extraction:** The file is sent to the Python Video Service (`/api/video/jobs`). The Python service uses OCR and document parsing to extract raw text.
3. **Script Generation:** The extracted text is fed into the AI Model (Gemini/Groq) using a specialized "Teacher Prompt". The AI returns a structured JSON curriculum consisting of 5-7 logical "Scenes" (e.g., Core Intuition, Algorithm Trace, Formula Derivation).
4. **Processing (TTS & Visuals):** 
   - A Text-to-Speech (TTS) engine converts the narration of each scene into audio.
   - The visual engine generates dynamic UI components and charts based on the scene type.
5. **Final Render:** The frontend polls the job status and plays the final generated educational video seamlessly.

### B. AI Fallback System (High Availability)
One of the most critical engineering decisions was implementing a robust AI fallback system (`backend/lib/local-ai.js` and `script_gen.py`). 
- The system first attempts to use **Google Gemini** (prioritizing advanced models like Gemini 3.6 Flash).
- If Gemini times out (timeout set to 60s for complex reasoning) or the API limit is reached, it seamlessly falls back to **Groq**.
- If offline or both fail, it falls back to a **Local LLM via Ollama**, ensuring the user always gets a response.

## 5. Security & Error Handling
- **Authentication:** Handled via JSON Web Tokens (JWT) and Bcrypt password hashing.
- **Robust Parsing:** The system includes a custom JSON repair state-machine that automatically fixes broken JSON responses from the AI (e.g., fixing unescaped LaTeX formulas or bad unicode).
- **Async Safety:** The Python server includes specific patches to prevent Windows Asyncio socket crash errors (`WinError 10054`) when video streaming is abruptly paused by the browser.

## Summary for Reviewer
This architecture ensures **Separation of Concerns**. The Node.js server acts as a fast, lightweight API gateway, while the heavy lifting of AI processing and video generation is offloaded to a specialized Python microservice. The dynamic networking setup and triple-layer AI fallback mechanism make it highly resilient and production-ready.
