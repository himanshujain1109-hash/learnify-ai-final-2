import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getMaterial, getMaterials } from "../services/materials";
import BackButton from "../components/BackButton";

const VIDEO_API = (
  import.meta.env.VITE_VIDEO_API_URL || "http://localhost:8000"
).replace(/\/+$/, "");
const MAX_VIDEO_MB = Number(import.meta.env.VITE_MAX_VIDEO_MB || 20);

export default function NotesToVideo() {
  const { documentId } = useParams();
  const [materialsList, setMaterialsList] = useState([]);
  const [currentDocId, setCurrentDocId] = useState(documentId || "");
  const [materialTitle, setMaterialTitle] = useState("");
  const [materialText, setMaterialText] = useState("");
  const [jobId, setJobId] = useState("");
  const [status, setStatus] = useState("");
  const [message, setMessage] = useState("Loading study material...");
  const [videoUrl, setVideoUrl] = useState("");
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("video");
  const [selectedAnswers, setSelectedAnswers] = useState({});

  const [language, setLanguage] = useState("Hinglish");
  const [level, setLevel] = useState("College");
  const [style, setStyle] = useState("Teacher Masterclass");
  const [duration, setDuration] = useState("5");
  const [voice, setVoice] = useState("desi_male");
  const [pace, setPace] = useState("1.15");

  const timer = useRef(null);

  const loadDocument = (id) => {
    if (!id) return;
    setCurrentDocId(id);
    setMessage("Loading study material...");
    getMaterial(id)
      .then((data) => {
        const mat = data.material || {};
        setMaterialTitle(mat.title || "Untitled Note");
        const text = mat.extractedText || mat.content || "";
        setMaterialText(text);
        setMessage("");

        // Check if there is a saved video for this note in localStorage
        const cached = localStorage.getItem(`learnify_video_${id}`);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed.videoUrl) {
              setJobId(parsed.jobId || "");
              setStatus(parsed.status || "done");
              setVideoUrl(parsed.videoUrl);
              setMetadata(parsed.metadata || null);
              setMessage(parsed.message || "Restored your saved video!");
            }
          } catch (e) {}
        }
      })
      .catch((err) => {
        setStatus("error");
        setMessage("Failed to load study material. Please try again.");
      });
  };

  useEffect(() => {
    getMaterials()
      .then((data) => {
        const docs = data.materials || [];
        setMaterialsList(docs);
        const targetId = documentId || currentDocId || (docs[0]?._id);
        if (targetId) {
          loadDocument(targetId);
        } else {
          setMessage("No study notes found. Please upload a PDF or note first!");
        }
      })
      .catch(() => {
        if (documentId) loadDocument(documentId);
      });

    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [documentId]);

  const pollJob = (id, targetDocId) => {
    if (timer.current) clearInterval(timer.current);

    const check = async () => {
      try {
        const res = await fetch(`${VIDEO_API}/api/video/jobs/${id}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.detail || "Could not check video status.");
        }

        setStatus(data.status);
        setMessage(data.message || "");

        if (data.metadata) {
          setMetadata(data.metadata);
        }

        if (data.status === "done") {
          if (timer.current) clearInterval(timer.current);
          setLoading(false);
          const finalUrl = `${VIDEO_API}${data.video_url}`;
          setVideoUrl(finalUrl);

          // Save completed video to localStorage so it never disappears on tab switch
          const savedData = {
            jobId: id,
            videoUrl: finalUrl,
            metadata: data.metadata,
            status: "done",
            message: "Masterclass video generated successfully!"
          };
          const docKey = targetDocId || currentDocId;
          if (docKey) {
            localStorage.setItem(`learnify_video_${docKey}`, JSON.stringify(savedData));
          }
          localStorage.setItem("learnify_latest_video", JSON.stringify(savedData));
        }

        if (data.status === "error") {
          if (timer.current) clearInterval(timer.current);
          setLoading(false);
          setMessage(data.message || "Video generation failed.");
        }
      } catch (err) {
        if (timer.current) clearInterval(timer.current);
        setLoading(false);
        setStatus("error");
        setMessage(err.message || "Unable to contact the video service.");
      }
    };

    check();
    timer.current = setInterval(check, 2500);
  };

  const generateVideo = async (event) => {
    event.preventDefault();

    if (!materialText) {
      setStatus("error");
      setMessage("No readable text found in this study material.");
      return;
    }

    try {
      setLoading(true);
      setStatus("processing");
      setMessage("Starting video generation pipeline...");

      const form = new FormData();
      form.append("text", materialText);
      form.append("language", language);
      form.append("level", level);
      form.append("style", style);
      form.append("duration", duration);
      form.append("voice", voice);
      form.append("pace", pace);

      const res = await fetch(`${VIDEO_API}/api/video/jobs`, {
        method: "POST",
        body: form,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Could not start video generation.");
      }

      setJobId(data.job_id);
      setStatus(data.status);
      setMessage(
        "Material uploaded. Generating in-depth curriculum and 3D diagrams..."
      );

      pollJob(data.job_id, currentDocId);
    } catch (err) {
      setLoading(false);
      setStatus("error");
      setMessage(err.message || "Video generation failed.");
    }
  };

  const reset = () => {
    if (timer.current) clearInterval(timer.current);
    if (currentDocId) {
      localStorage.removeItem(`learnify_video_${currentDocId}`);
    }
    setJobId("");
    setStatus("");
    setMessage("");
    setVideoUrl("");
    setMetadata(null);
    setLoading(false);
    setSelectedAnswers({});
    setActiveTab("video");
  };

  const handleSelectAnswer = (qIndex, optIndex) => {
    setSelectedAnswers((prev) => ({ ...prev, [qIndex]: optIndex }));
  };

  const scenes = metadata?.scenes || [];
  const definitionScenes = scenes.filter(
    (s) => s.slideType === "definition" || s.definition
  );
  const quizScenes = scenes.filter((s) => s.quiz && s.quiz.question);

  return (
    <div className="notes-video-page perspective-1000">
      <BackButton label="Back" />
      <div className="dash-hero">
        <div>
          <span className="hero-3d-badge">✦ 3D AI VIDEO STUDIO</span>
          <h1>Turn Notes into Masterclass Videos</h1>
          <p>
            Upload your lecture slides or notes. Learnify AI generates an
            in-depth educational video with detailed definitions, clear step-by-step
            explanations, 3D diagrams, charts, and interactive checkpoint quizzes.
          </p>
        </div>
        <Link className="btn secondary card-3d" to="/dashboard">
          ← Dashboard
        </Link>
      </div>

      <div className="notes-video-grid">
        {/* Step 1: Upload & Options */}
        <form className="upload-card card-3d" onSubmit={generateVideo}>
          <span className="eyebrow">STEP 1 • INPUT MATERIAL</span>
          <h2>Upload Study Notes</h2>
          <p className="muted">
            Supports PPTX, PDF, and TXT notes. Generates multi-scene masterclass
            lectures with definitions and diagrams.
          </p>

          {materialsList && materialsList.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent, #6366f1)', display: 'block', marginBottom: 6 }}>
                SELECT STUDY MATERIAL:
              </label>
              <select
                value={currentDocId}
                onChange={(e) => loadDocument(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                  fontSize: '0.95rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {materialsList.map((m) => (
                  <option key={m._id} value={m._id} style={{ background: '#1e1b4b', color: '#fff' }}>
                    📄 {m.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="drop-zone" style={{ marginTop: 14, borderStyle: 'solid', background: 'var(--card-bg)' }}>
            <span className="upload-icon">📄</span>
            <strong>
              {materialTitle || "Loading Document..."}
            </strong>
            <span>
              {materialText ? `${Math.ceil(materialText.length / 1024)} KB Extracted Text` : "Fetching text..."}
            </span>
          </div>

          <div className="video-options" style={{ marginTop: 22 }}>
            <span className="eyebrow">CUSTOMIZE MASTERCLASS</span>
            <div
              className="row"
              style={{ gap: 12, flexWrap: "wrap", marginTop: 10 }}
            >
              <label>
                Language
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <option>English</option>
                  <option>Hindi</option>
                  <option>Hinglish</option>
                </select>
              </label>

              <label>
                Student Level
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                >
                  <option>Beginner</option>
                  <option>College</option>
                  <option>Advanced / Competitive</option>
                </select>
              </label>

              <label>
                Teaching Style
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                >
                  <option>Teacher Masterclass</option>
                  <option>Deep Conceptual</option>
                  <option>Storytelling Intuition</option>
                  <option>Exam-Focused</option>
                </select>
              </label>

              <label>
                Target Duration
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                >
                  <option value="3">~3 min</option>
                  <option value="5">~5 min</option>
                  <option value="10">~10 min</option>
                  <option value="15">~15 min</option>
                </select>
              </label>

              <label style={{ minWidth: 210 }}>
                Instructor Voice Persona
                <select
                  value={voice}
                  onChange={(e) => setVoice(e.target.value)}
                >
                  <option value="desi_male">👨 Desi Mentor (Madhur - Charismatic & Warm)</option>
                  <option value="desi_female">👩 Desi Teacher (Swara - Polite & Clear)</option>
                  <option value="tech_brian">⚡ Tech Explainer (Brian - YouTube Style)</option>
                  <option value="documentary">🎙️ Deep Storyteller (Andrew - Veritasium Style)</option>
                  <option value="storyteller_female">🌟 Expressive Voice (Aria - Engaging)</option>
                  <option value="british_ryan">🎓 Academic Mentor (Ryan - British)</option>
                </select>
              </label>

              <label>
                Narration Pacing
                <select
                  value={pace}
                  onChange={(e) => setPace(e.target.value)}
                >
                  <option value="1.0">Normal (1.0x)</option>
                  <option value="1.15">⚡ Snappy (1.15x - Recommended)</option>
                  <option value="1.25">🔥 Fast-Paced (1.25x - Shorts Style)</option>
                  <option value="0.9">🧘 Relaxed (0.9x)</option>
                </select>
              </label>
            </div>
          </div>

          {/* Dynamic 3D Progress Visualizer while generating */}
          {loading && (
            <div className="generator-3d-visualizer">
              <div className="orbit-system">
                <div className="orbit-ring ring-1" />
                <div className="orbit-ring ring-2" />
                <div className="orbit-ring ring-3" />
                <div className="orbit-core" />
              </div>
              <strong style={{ fontSize: 16, letterSpacing: "-0.5px" }}>
                Creating Your 3D Learning Video
              </strong>
              <p style={{ fontSize: 13, color: "#aaa6bb", margin: "6px 0 16px" }}>
                {message || "Processing your document through the AI pipeline..."}
              </p>

              <div className="pipeline-steps">
                <div className="pipeline-step-item active">
                  <span>✦</span>
                  <span>1. Decomposing topic & defining key terms</span>
                </div>
                <div className="pipeline-step-item active">
                  <span>✦</span>
                  <span>2. Generating 3D diagrams, charts & flowcharts</span>
                </div>
                <div className="pipeline-step-item active">
                  <span>✦</span>
                  <span>3. Formulating interactive checkpoint quizzes</span>
                </div>
                <div className="pipeline-step-item active">
                  <span>✦</span>
                  <span>4. Synthesizing spoken audio & assembling video</span>
                </div>
              </div>
            </div>
          )}

          {message && !loading && (
            <div
              className={status === "error" ? "error" : "success"}
              style={{ marginTop: 18 }}
            >
              <strong>
                {status === "done"
                  ? "Video Generated Successfully!"
                  : status === "error"
                  ? "Generation Error"
                  : "Status Update"}
              </strong>
              <div style={{ marginTop: 4 }}>{message}</div>
              {jobId && (
                <small style={{ display: "block", marginTop: 5 }}>
                  Job ID: {jobId.slice(0, 12)}...
                </small>
              )}
            </div>
          )}

          <button
            className="btn btn-primary full card-3d"
            disabled={loading}
            style={{ marginTop: 18 }}
          >
            {loading ? "Generating Masterclass..." : "Generate 3D Video →"}
          </button>

          {videoUrl && (
            <button
              type="button"
              className="btn secondary full"
              style={{ marginTop: 10 }}
              onClick={reset}
            >
              Create Another Video
            </button>
          )}
        </form>

        {/* Step 2: 3D Video Showcase & Study Companion */}
        <section className="video-result-card card-3d">
          <span className="eyebrow">STEP 2 • INTERACTIVE OUTPUT</span>
          <h2>Your Educational Masterclass</h2>

          {!videoUrl ? (
            <div className="video-placeholder">
              <div className="video-placeholder-icon">▶</div>
              <h3>Your generated 3D video will appear here</h3>
              <p>
                Upload your notes to generate. You will receive an in-depth
                narrated video, visual diagram slides, term definitions, and
                checkpoint quizzes.
              </p>
            </div>
          ) : (
            <div>
              {/* 3D Video Theater Frame */}
              <div className="video-theater">
                <video src={videoUrl} controls className="generated-video" />
              </div>

              {/* Action Toolbar */}
              <div
                className="row"
                style={{
                  marginTop: 16,
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                }}
              >
                <div className="row" style={{ gap: 10 }}>
                  <a
                    className="btn card-3d"
                    href={videoUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open Fullscreen ↗
                  </a>
                  <a
                    className="btn secondary card-3d"
                    href={videoUrl}
                    download="learnify-masterclass.mp4"
                  >
                    Download MP4 ↓
                  </a>
                </div>
                {metadata?.totalScenes && (
                  <span className="badge" style={{ padding: "8px 12px" }}>
                    {metadata.totalScenes} Complete Scenes
                  </span>
                )}
              </div>

              {/* Study Companion Tabs */}
              <div className="tabs-nav">
                <button
                  type="button"
                  className={`tab-btn ${activeTab === "video" ? "active" : ""}`}
                  onClick={() => setActiveTab("video")}
                >
                  🎬 Masterclass Info
                </button>
                <button
                  type="button"
                  className={`tab-btn ${activeTab === "scenes" ? "active" : ""}`}
                  onClick={() => setActiveTab("scenes")}
                >
                  📑 Chapters & Slides ({scenes.length})
                </button>
                <button
                  type="button"
                  className={`tab-btn ${
                    activeTab === "definitions" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("definitions")}
                >
                  📖 Term Glossary ({definitionScenes.length})
                </button>
                <button
                  type="button"
                  className={`tab-btn ${activeTab === "quiz" ? "active" : ""}`}
                  onClick={() => setActiveTab("quiz")}
                >
                  ✍️ Checkpoint Quizzes ({quizScenes.length})
                </button>
              </div>

              {/* Tab 1: Video Overview */}
              {activeTab === "video" && (
                <div style={{ marginTop: 15 }}>
                  <div className="card" style={{ background: "#faf9ff" }}>
                    <h3 style={{ margin: "0 0 8px" }}>About this Masterclass</h3>
                    <p className="muted" style={{ margin: "0 0 14px" }}>
                      This video was generated with high-definition diagrams,
                      rigorous term definitions, and checkpoint quizzes grounded
                      in your uploaded study material.
                    </p>
                    <div className="row" style={{ gap: 10 }}>
                      <span className="badge">Language: {language}</span>
                      <span className="badge">Level: {level}</span>
                      <span className="badge">Style: {style}</span>
                      <span className="badge">
                        Scenes: {scenes.length || "Complete"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Chapters & Slides */}
              {activeTab === "scenes" && (
                <div className="scene-timeline" style={{ marginTop: 15 }}>
                  {scenes.map((sc, i) => (
                    <div className="scene-timeline-card card-3d" key={i}>
                      <div className="scene-idx-badge">0{i + 1}</div>
                      <div className="scene-timeline-body">
                        <div className="scene-meta-strip">
                          <span className="badge">
                            {(sc.slideType || sc.visual?.type || "SCENE").toUpperCase()}
                          </span>
                          {sc.visual?.title && (
                            <small className="muted">{sc.visual.title}</small>
                          )}
                        </div>
                        <h4>{sc.title}</h4>
                        <p style={{ fontSize: 13.5, color: "#4e4b59", margin: "4px 0 10px" }}>
                          {sc.narration}
                        </p>
                        {sc.keyPoints?.length > 0 && (
                          <div style={{ fontSize: 12, color: "#6d5dfc" }}>
                            <strong>Key Points: </strong>
                            {sc.keyPoints.join(" • ")}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab 3: Definitions Glossary */}
              {activeTab === "definitions" && (
                <div className="definitions-glossary" style={{ marginTop: 15 }}>
                  {definitionScenes.length === 0 ? (
                    <p className="muted">
                      Definitions were integrated into the primary lecture scenes.
                    </p>
                  ) : (
                    definitionScenes.map((sc, i) => (
                      <div className="definition-item-card card-3d" key={i}>
                        <span className="eyebrow">CORE DEFINITION</span>
                        <h4>{sc.title}</h4>
                        <div style={{ margin: "8px 0" }}>
                          <strong style={{ fontSize: 12, color: "#6d5dfc" }}>
                            FORMAL DEFINITION:
                          </strong>
                          <p style={{ margin: "4px 0 10px", fontSize: 14 }}>
                            {sc.definition || sc.narration}
                          </p>
                        </div>
                        {sc.intuition && (
                          <div
                            style={{
                              background: "#f5f3ff",
                              padding: "10px 14px",
                              borderRadius: 10,
                              margin: "8px 0",
                            }}
                          >
                            <strong style={{ fontSize: 12, color: "#5548d4" }}>
                              IN SIMPLE WORDS:
                            </strong>
                            <p style={{ margin: "2px 0 0", fontSize: 13 }}>
                              {sc.intuition}
                            </p>
                          </div>
                        )}
                        {sc.whyItMatters && (
                          <small className="muted">
                            <strong>Why it matters: </strong> {sc.whyItMatters}
                          </small>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab 4: Interactive Quiz */}
              {activeTab === "quiz" && (
                <div style={{ marginTop: 15 }}>
                  {quizScenes.length === 0 ? (
                    <p className="muted">
                      Quiz was presented within the masterclass video.
                    </p>
                  ) : (
                    quizScenes.map((sc, qIndex) => {
                      const q = sc.quiz;
                      const selected = selectedAnswers[qIndex];
                      const isAnswered = selected !== undefined;
                      return (
                        <div className="interactive-quiz-panel card-3d" key={qIndex}>
                          <span className="badge" style={{ marginBottom: 10 }}>
                            CHECKPOINT QUESTION 0{qIndex + 1}
                          </span>
                          <h3 style={{ margin: "6px 0 16px" }}>{q.question}</h3>

                          <div
                            style={{
                              display: "grid",
                              gap: 10,
                              marginBottom: 16,
                            }}
                          >
                            {(q.options || []).map((opt, optIdx) => {
                              const isCorrect = optIdx === q.answerIndex;
                              const isChosen = selected === optIdx;
                              let btnClass = "btn secondary full";
                              let borderStyle = "1px solid #e1def1";
                              let bgStyle = "#faf9ff";

                              if (isAnswered) {
                                if (isCorrect) {
                                  borderStyle = "2px solid #34d399";
                                  bgStyle = "#ecfdf5";
                                } else if (isChosen) {
                                  borderStyle = "2px solid #f87171";
                                  bgStyle = "#fef2f2";
                                }
                              }

                              return (
                                <button
                                  type="button"
                                  key={optIdx}
                                  className={btnClass}
                                  style={{
                                    justifyContent: "flex-start",
                                    textAlign: "left",
                                    border: borderStyle,
                                    background: bgStyle,
                                    padding: "12px 16px",
                                    color: "#17152a",
                                    fontWeight: isChosen ? 800 : 500,
                                  }}
                                  onClick={() =>
                                    handleSelectAnswer(qIndex, optIdx)
                                  }
                                >
                                  <strong
                                    style={{
                                      width: 24,
                                      height: 24,
                                      borderRadius: "50%",
                                      background: "#6d5dfc",
                                      color: "#fff",
                                      display: "inline-grid",
                                      placeItems: "center",
                                      marginRight: 10,
                                      fontSize: 12,
                                    }}
                                  >
                                    {String.fromCharCode(65 + optIdx)}
                                  </strong>
                                  {opt}
                                </button>
                              );
                            })}
                          </div>

                          {isAnswered && (
                            <div
                              style={{
                                background: "#f0edff",
                                borderLeft: "4px solid #6d5dfc",
                                padding: "12px 16px",
                                borderRadius: 10,
                              }}
                            >
                              <strong style={{ color: "#6d5dfc" }}>
                                {selected === q.answerIndex
                                  ? "✓ Correct Answer!"
                                  : `Incorrect. The correct answer is Option ${String.fromCharCode(
                                      65 + q.answerIndex
                                    )}.`}
                              </strong>
                              <p
                                style={{
                                  margin: "4px 0 0",
                                  fontSize: 13,
                                  color: "#4e4b59",
                                }}
                              >
                                {q.explanation}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
