import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getMaterial, getMaterials } from "../services/materials";
import BackButton from "../components/BackButton";
import AnimatedTabs from "../components/ui/AnimatedTabs";
import BorderBeam from "../components/ui/BorderBeam";

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
  const videoRef = useRef(null);

  const seekToScene = (startTime) => {
    if (videoRef.current && typeof startTime === "number") {
      videoRef.current.currentTime = startTime;
      videoRef.current.play().catch(() => {});
    }
  };

  const getVisualBadge = (sc) => {
    const vt = (sc.visual?.type || sc.slideType || "").toLowerCase();
    if (vt.includes("graph") || vt.includes("chart")) return { icon: "📈", label: "DYNAMIC GRAPH", bg: "rgba(0, 229, 255, 0.15)", color: "#00e5ff" };
    if (vt.includes("algo") || vt.includes("trace")) return { icon: "⚡", label: "ALGORITHM TRACE", bg: "rgba(251, 191, 36, 0.15)", color: "#fbbf24" };
    if (vt.includes("formula") || vt.includes("equation")) return { icon: "📐", label: "FORMULA DERIVATION", bg: "rgba(168, 85, 247, 0.15)", color: "#a855f7" };
    if (vt.includes("diagram")) return { icon: "🖼️", label: "DIAGRAM WALKTHROUGH", bg: "rgba(56, 189, 248, 0.15)", color: "#38bdf8" };
    if (vt.includes("definition") || vt.includes("unpack")) return { icon: "💡", label: "DEFINITION UNPACKER", bg: "rgba(52, 211, 153, 0.15)", color: "#34d399" };
    if (vt.includes("comparison")) return { icon: "⚖️", label: "COMPARISON MATRIX", bg: "rgba(244, 114, 182, 0.15)", color: "#f472b6" };
    if (vt.includes("quiz") || vt.includes("checkpoint")) return { icon: "✍️", label: "CHECKPOINT QUIZ", bg: "rgba(245, 158, 11, 0.15)", color: "#f59e0b" };
    return { icon: "🎬", label: "TEACHER MASTERCLASS", bg: "rgba(99, 102, 241, 0.15)", color: "#6366f1" };
  };

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

  const formatTime = (sec) => {
    if (typeof sec !== "number" || isNaN(sec)) return null;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const scenes = metadata?.scenes || [];
  const definitionScenes = scenes.filter(
    (s) => s.slideType === "definition" || s.definition || s.visual?.type === "definition-unpack"
  );
  const quizScenes = scenes.filter((s) => s.quiz && s.quiz.question);
  const visualScenes = scenes.filter(
    (s) =>
      s.visual?.formula ||
      s.visual?.equation ||
      s.visual?.points ||
      s.visual?.steps ||
      s.visual?.analogy ||
      s.visual?.rows ||
      s.visual?.callouts ||
      s.formula ||
      s.analogy
  );

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
            type="submit"
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
                <video ref={videoRef} src={videoUrl} controls className="generated-video" />
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

              {/* Study Companion Tabs (Motion Primitives) */}
              <div style={{ marginTop: 24, marginBottom: 20, overflowX: "auto" }}>
                <AnimatedTabs
                  tabs={[
                    { id: "video", label: "Masterclass Info", badge: "Info" },
                    { id: "scenes", label: "Chapters & Beats", badge: scenes.length },
                    { id: "visuals", label: "Visuals & Formulas", badge: visualScenes.length },
                    { id: "definitions", label: "Glossary", badge: definitionScenes.length },
                    { id: "quiz", label: "Checkpoints", badge: quizScenes.length },
                  ]}
                  activeTab={activeTab}
                  onChange={setActiveTab}
                  layoutId="videoStudioTabs"
                  style={{ minWidth: "max-content", padding: "6px" }}
                />
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
                  {scenes.map((sc, i) => {
                    const badge = getVisualBadge(sc);
                    const timeStr = formatTime(sc.startTime);
                    return (
                      <div className="scene-timeline-card card-3d" key={i} style={{ position: "relative" }}>
                        <div className="scene-idx-badge">0{i + 1}</div>
                        <div className="scene-timeline-body" style={{ flex: 1 }}>
                          <div className="scene-meta-strip" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            <span
                              className="badge"
                              style={{
                                background: badge.bg,
                                color: badge.color,
                                fontWeight: 700,
                                fontSize: 11,
                                letterSpacing: "0.5px",
                              }}
                            >
                              {badge.icon} {badge.label}
                            </span>
                            {timeStr && (
                              <button
                                type="button"
                                onClick={() => seekToScene(sc.startTime)}
                                style={{
                                  background: "rgba(99, 102, 241, 0.15)",
                                  border: "1px solid rgba(99, 102, 241, 0.4)",
                                  color: "#6366f1",
                                  borderRadius: 6,
                                  padding: "2px 8px",
                                  fontSize: 11,
                                  cursor: "pointer",
                                  fontWeight: 600,
                                }}
                                title="Click to jump video to this scene"
                              >
                                ▶ Jump to {timeStr}
                              </button>
                            )}
                            {sc.visual?.title && (
                              <small className="muted">{sc.visual.title}</small>
                            )}
                          </div>
                          <h4 style={{ margin: "6px 0 4px" }}>{sc.title}</h4>
                          <p style={{ fontSize: 13.5, color: "#4e4b59", margin: "4px 0 10px" }}>
                            {sc.narration}
                          </p>
                          {sc.visualBeats && sc.visualBeats.length > 0 && (
                            <div style={{ background: "rgba(0,0,0,0.03)", padding: "8px 12px", borderRadius: 8, marginTop: 6 }}>
                              <strong style={{ fontSize: 11, color: "#6d5dfc", display: "block", marginBottom: 4 }}>
                                TEACHER VISUAL BEATS:
                              </strong>
                              <div style={{ display: "grid", gap: 4 }}>
                                {sc.visualBeats.map((b, bIdx) => (
                                  <div key={bIdx} style={{ fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}>
                                    <span style={{ color: "#9ca3af", fontFamily: "monospace", fontSize: 11 }}>
                                      [{Math.round(b.fraction * 100)}%]
                                    </span>
                                    <span style={{ color: "#374151" }}>{b.beat}</span>
                                    <span style={{ fontSize: 10, background: "#e0e7ff", color: "#4338ca", padding: "1px 5px", borderRadius: 4 }}>
                                      Pose: {b.teacherPose || "explaining"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {sc.keyPoints?.length > 0 && (
                            <div style={{ fontSize: 12, color: "#6d5dfc", marginTop: 8 }}>
                              <strong>Key Points: </strong>
                              {sc.keyPoints.join(" • ")}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tab: Visuals & Formulas Breakdown */}
              {activeTab === "visuals" && (
                <div className="visuals-breakdown" style={{ marginTop: 15, display: "grid", gap: 14 }}>
                  {visualScenes.length === 0 ? (
                    <p className="muted">No deep visual components detected in this video.</p>
                  ) : (
                    visualScenes.map((sc, i) => {
                      const badge = getVisualBadge(sc);
                      const vis = sc.visual || {};
                      return (
                        <div className="card-3d" key={i} style={{ background: "#ffffff", padding: 18, borderRadius: 12, border: "1px solid #e5e7eb" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                            <span className="badge" style={{ background: badge.bg, color: badge.color, fontWeight: 700 }}>
                              {badge.icon} {badge.label}
                            </span>
                            {typeof sc.startTime === "number" && (
                              <button
                                type="button"
                                onClick={() => seekToScene(sc.startTime)}
                                style={{
                                  background: "rgba(99, 102, 241, 0.12)",
                                  border: "1px solid rgba(99, 102, 241, 0.3)",
                                  color: "#6366f1",
                                  borderRadius: 6,
                                  padding: "3px 10px",
                                  fontSize: 11,
                                  cursor: "pointer",
                                  fontWeight: 600,
                                }}
                              >
                                ▶ Watch Visual at {formatTime(sc.startTime)}
                              </button>
                            )}
                          </div>
                          <h4 style={{ margin: "0 0 8px", fontSize: 16 }}>{sc.title}</h4>

                          {/* Formula Block */}
                          {(vis.formula || vis.equation || sc.formula) && (
                            <div style={{ background: "#0b0f19", color: "#00e5ff", padding: "14px 18px", borderRadius: 8, fontFamily: "monospace", fontSize: 18, textAlign: "center", margin: "10px 0", letterSpacing: "1px", border: "1px solid rgba(0, 229, 255, 0.3)" }}>
                              {vis.formula || vis.equation || sc.formula}
                            </div>
                          )}

                          {/* Variable Breakdown */}
                          {vis.variables && vis.variables.length > 0 && (
                            <div style={{ marginTop: 10, background: "#f8fafc", padding: "10px 14px", borderRadius: 8 }}>
                              <strong style={{ fontSize: 12, color: "#475569", display: "block", marginBottom: 6 }}>
                                VARIABLE DECONSTRUCTION:
                              </strong>
                              <div style={{ display: "grid", gap: 6 }}>
                                {vis.variables.map((v, vIdx) => (
                                  <div key={vIdx} style={{ fontSize: 13, display: "flex", gap: 8 }}>
                                    <span style={{ fontFamily: "monospace", color: "#6366f1", fontWeight: 700, minWidth: 60 }}>
                                      {v.symbol || v.var}:
                                    </span>
                                    <span style={{ color: "#334155" }}>{v.meaning || v.desc}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Graph Details */}
                          {vis.chartType && (
                            <div style={{ marginTop: 10, background: "#f0fdf4", padding: "10px 14px", borderRadius: 8, border: "1px solid #bbf7d0" }}>
                              <strong style={{ fontSize: 12, color: "#166534" }}>📈 Graph Properties:</strong>
                              <div style={{ fontSize: 13, color: "#14532d", marginTop: 4 }}>
                                <div><strong>Type:</strong> {vis.chartType}</div>
                                {vis.xAxis && <div><strong>X-Axis:</strong> {vis.xAxis}</div>}
                                {vis.yAxis && <div><strong>Y-Axis:</strong> {vis.yAxis}</div>}
                                {vis.curve && <div><strong>Function Curve:</strong> {vis.curve}</div>}
                              </div>
                            </div>
                          )}

                          {/* Algorithm Steps */}
                          {vis.steps && vis.steps.length > 0 && (
                            <div style={{ marginTop: 10, background: "#fefce8", padding: "10px 14px", borderRadius: 8, border: "1px solid #fef08a" }}>
                              <strong style={{ fontSize: 12, color: "#854d0e", display: "block", marginBottom: 6 }}>
                                ⚡ Execution Sequence:
                              </strong>
                              <div style={{ display: "grid", gap: 6 }}>
                                {vis.steps.map((st, stIdx) => (
                                  <div key={stIdx} style={{ fontSize: 13, display: "flex", gap: 8, color: "#713f12" }}>
                                    <span style={{ fontWeight: 700 }}>Step {stIdx + 1}:</span>
                                    <span>{typeof st === "string" ? st : (st.action || st.title)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Analogy & Intuition */}
                          {(vis.analogy || sc.analogy || vis.plainMeaning || sc.intuition) && (
                            <div style={{ marginTop: 10, background: "#faf5ff", padding: "10px 14px", borderRadius: 8, border: "1px solid #e9d5ff" }}>
                              <strong style={{ fontSize: 12, color: "#6b21a8" }}>💡 Real-World Analogy & Plain Intuition:</strong>
                              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#581c87" }}>
                                {vis.analogy || sc.analogy || vis.plainMeaning || sc.intuition}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
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
