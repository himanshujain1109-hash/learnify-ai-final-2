# 🚀 Learnify AI - Vercel & Render Deployment Guide

Yeh complete guide hai **Learnify AI** ko **Vercel** (Frontend + API) aur **Render** (Python Video Service) pe deploy karne ke liye.

---

## 🏗️ Deployment Architecture

| Component | Platform | Tech Stack | Reason |
| :--- | :--- | :--- | :--- |
| **Frontend UI** | **Vercel** | React + Vite | Fast Global Edge CDN, Zero Config, Instant SSL |
| **Backend API** | **Vercel** *(or Render)* | Node.js Serverless (`/api`) | Automatically handled by Vercel serverless functions |
| **Video Service** | **Render** | Python 3.11 + FastAPI + FFmpeg + Docker | FFmpeg, background video generation & Edge-TTS require full OS container |
| **Database** | **MongoDB Atlas** | Cloud Mongo (Free M0) | Hosted 24/7 cloud database |

---

## 📋 Pre-requisites (Checklist)

1. **GitHub Account**: Code push hona chahiye `https://github.com/Nayanverma001/Learnify-AI.git`.
2. **MongoDB Atlas Account**: Ek free cluster banayein aur connection string (`MONGODB_URI`) copy karein:
   ```text
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/learnify?retryWrites=true&w=majority
   ```
   *(Atlas dashboard me Network Access me `0.0.0.0/0` whitelist karna na bhoolein).*
3. **Render Account**: [render.com](https://render.com) par free account banayein.
4. **Vercel Account**: [vercel.com](https://vercel.com) par free account banayein.

---

## 🔹 STEP 1: GitHub pe Code Push Karein

Apne terminal me run karein:

```bash
git add .
git commit -m "feat: setup deployment for Vercel and Render"
git push origin main
```

---

## 🔹 STEP 2: Render pe Video Service Deploy Karein

> 💡 **Kyun pehle Render?** Kyunki Render ka URL hamein Vercel me `VITE_VIDEO_API_URL` ke taur pe set karna hoga!

### Method A: Blueprint 1-Click Deploy (Sabse aasan)
1. [Render Dashboard](https://dashboard.render.com/) me jayein.
2. Click **New +** -> **Blueprint**.
3. Apna GitHub repository `Learnify-AI` select karein.
4. Render automatically `render.yaml` detect karega.
5. Click **Apply**. Render Docker build start kar dega!

### Method B: Manual Web Service
Agar manual banana chahte hain:
1. Click **New +** -> **Web Service**.
2. Apna repo select karein.
3. Settings:
   - **Name**: `learnify-video-service`
   - **Region**: Oregon (ya koi bhi)
   - **Environment**: `Docker`
   - **Dockerfile Path**: `video-service/Dockerfile`
   - **Docker Build Context**: `video-service`
   - **Instance Type**: `Free`
4. **Environment Variables** add karein:
   - `PORT`: `8000`
   - `TTS_PROVIDER`: `edge-tts`
   - `FRONTEND_URL`: `https://*.vercel.app` *(baad me exact Vercel URL daal sakte hain)*
5. Click **Create Web Service**.

Jab build finish ho jaye, apna public URL copy karein:
👉 Example: `https://learnify-video-service.onrender.com`

Test karne ke liye browser me kholein:
`https://learnify-video-service.onrender.com/health`
Response aana chahiye: `{"status": "healthy", ...}`

---

## 🔹 STEP 3: Vercel pe Frontend + API Deploy Karein

1. [Vercel Dashboard](https://vercel.com/dashboard) me jayein.
2. Click **Add New...** -> **Project**.
3. Apna GitHub repo `Learnify-AI` select karein aur **Import** par click karein.
4. Project Configuration:
   - **Framework Preset**: Vite (ya Other)
   - **Root Directory**: `./` (Default root hi rehne dein, `frontend` select mat karein!)
   - **Build Command**: `npm --prefix frontend install && npm --prefix frontend run build` *(Already in `vercel.json`)*
   - **Output Directory**: `frontend/dist` *(Already in `vercel.json`)*
5. **Environment Variables** section expand karein aur ye add karein:

| Variable Name | Value | Description |
| :--- | :--- | :--- |
| `MONGODB_URI` | `mongodb+srv://...` | Aapka MongoDB Atlas connection string |
| `JWT_SECRET` | `your-secure-random-jwt-secret-32-chars` | Auth encryption secret |
| `VITE_API_URL` | `/api` | Vercel serverless API route |
| `VITE_VIDEO_API_URL` | `https://learnify-video-service.onrender.com` | Aapka Render Video Service ka URL |
| `ENABLE_OFFLINE_FALLBACK` | `true` | Ollama na hone par offline fallback enable rakhega |
| `FRONTEND_URL` | `https://your-project.vercel.app` | Vercel ka deployed URL |

6. Click **Deploy**!
7. 1-2 minute me aapki website live ho jayegi: `https://your-project.vercel.app`.

---

## 🔹 STEP 4: Render me Frontend URL update karein (CORS)

Ab jab aapka Vercel URL ready hai (e.g. `https://learnify-ai.vercel.app`):
1. Render dashboard me `learnify-video-service` par jayein.
2. **Environment** tab me jayein.
3. `FRONTEND_URL` ko set karein: `https://your-project.vercel.app`.
4. Click **Save Changes** (Render automatically restart karega).

---

## 🔹 STEP 5: (Optional) Node.js Backend Render pe chalana ho to?

Agar aap Vercel Serverless Functions ke bajaye Render pe persistent Express Server (`backend/server.js`) chalana chahte hain:
1. Render me `render.yaml` me `learnify-backend` service already configured hai!
2. Ya Render me **New Web Service** -> Runtime: `Node` -> Build: `npm install` -> Start: `node backend/server.js`.
3. Vercel ke Environment Variables me:
   - `VITE_API_URL` = `https://learnify-backend.onrender.com/api` set kar dein.

---

## ✅ Deployment Verification Checklist

- [ ] Vercel pe website open hoti hai.
- [ ] User Register/Login kaam kar raha hai (MongoDB connection verified).
- [ ] Materials upload aur study lesson generation chal raha hai.
- [ ] **Notes to Video** page me PDF/Notes se AI Teacher Video generate ho rahi hai (Render Video Service verified).
