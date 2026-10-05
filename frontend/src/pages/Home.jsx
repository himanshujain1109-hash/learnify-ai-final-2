import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import TextShimmer from "../components/ui/TextShimmer";
import SpotlightCard from "../components/ui/SpotlightCard";
import AnimatedTabs from "../components/ui/AnimatedTabs";
import BorderBeam from "../components/ui/BorderBeam";
import ShimmerButton from "../components/ui/ShimmerButton";
import {
  Sparkles,
  Video,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  ArrowRight,
  UploadCloud,
  FileQuestion,
  GraduationCap,
  Play,
  Layers,
  Zap,
} from "lucide-react";

export default function Home() {
  const { user } = useAuth();
  const [activeDemoTab, setActiveDemoTab] = useState("video");

  const demoTabs = [
    { id: "video", label: "3D Video Studio", icon: <Video size={15} /> },
    { id: "lesson", label: "Smart Lesson", icon: <BookOpen size={15} /> },
    { id: "tutor", label: "AI Tutor", icon: <Sparkles size={15} /> },
    { id: "quiz", label: "Practice Quiz", icon: <FileQuestion size={15} /> },
  ];

  return (
    <div className="home" style={{ overflow: "hidden" }}>
      {/* 1. HERO SECTION */}
      <section className="hero-home" style={{ position: "relative" }}>
        <motion.div
          className="hero-copy"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Eyebrow Badge with Pulse */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 14px",
              borderRadius: "99px",
              background: "rgba(109, 93, 252, 0.08)",
              border: "1px solid rgba(109, 93, 252, 0.2)",
              marginBottom: "18px",
            }}
          >
            <span className="pulse-beacon" />
            <TextShimmer
              duration={3}
              style={{
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "1.4px",
                color: "var(--purple)",
              }}
            >
              NEXT-GEN AI STUDY COMPANION
            </TextShimmer>
          </div>

          <h1 style={{ letterSpacing: "-3px", fontWeight: 800, lineHeight: 1.05 }}>
            Study less. <br />
            <span
              style={{
                background: "linear-gradient(135deg, #6d5dfc 0%, #00e1ff 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Understand more.
            </span>
          </h1>

          <p
            style={{
              fontSize: "18px",
              lineHeight: 1.7,
              color: "var(--muted)",
              maxWidth: "540px",
              margin: "18px 0 28px",
            }}
          >
            Learnify AI turns dense PDFs, notes, or any topic into teacher-led
            lessons, interactive checkpoints, and 3D narrated video masterclasses.
          </p>

          <div className="hero-actions" style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <Link
              to={user ? "/dashboard" : "/register"}
              style={{ textDecoration: "none" }}
            >
              <ShimmerButton
                shimmerColor="#ffffff"
                style={{
                  padding: "14px 26px",
                  fontSize: "15px",
                }}
              >
                <span>{user ? "Open Dashboard" : "Start Learning Free"}</span>
                <ArrowRight size={16} />
              </ShimmerButton>
            </Link>

            <Link
              to="/upload"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "13px 22px",
                borderRadius: "14px",
                background: "rgba(255, 255, 255, 0.8)",
                border: "1px solid var(--line)",
                color: "var(--ink)",
                fontWeight: 700,
                fontSize: "14px",
                boxShadow: "0 4px 14px rgba(0,0,0,0.04)",
                transition: "all 0.2s ease",
              }}
            >
              <UploadCloud size={16} color="var(--purple)" />
              <span>Upload Notes</span>
            </Link>
          </div>

          <div
            className="trust-row"
            style={{
              display: "flex",
              gap: "20px",
              marginTop: "38px",
              color: "#7c778c",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <CheckCircle2 size={16} color="#10b981" /> Teacher explanations
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <CheckCircle2 size={16} color="#10b981" /> 3D Video Studio
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <CheckCircle2 size={16} color="#10b981" /> 100% Free
            </span>
          </div>
        </motion.div>

        {/* 3D Tilt Interactive Spotlight Preview */}
        <div className="hero-visual perspective-1000">
          <div className="glow-orb" />

          <SpotlightCard
            className="study-card main-card card-3d"
            spotlightColor="rgba(109, 93, 252, 0.22)"
            borderColor="rgba(109, 93, 252, 0.5)"
            style={{
              width: "min(450px, 92%)",
              padding: "26px",
              background: "#ffffff",
              boxShadow: "0 30px 80px rgba(23, 20, 45, 0.12)",
              transform: "rotate(1.5deg)",
            }}
          >
            <div
              className="mini-top"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="live-dot" />
                <span style={{ fontWeight: 700, color: "var(--ink)", fontSize: "13px" }}>
                  Active Workspace
                </span>
              </div>
              <span style={{ color: "var(--muted)", fontSize: "12px" }}>Automated Mode</span>
            </div>

            <div className="progress-label" style={{ fontWeight: 700, fontSize: "14px" }}>
              <span>Data Structures — Trees & Graphs</span>
              <span style={{ color: "var(--purple)" }}>85%</span>
            </div>

            <div className="progress" style={{ height: 9, borderRadius: 99, marginTop: 8 }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "85%" }}
                transition={{ duration: 1.4, ease: "easeOut" }}
                style={{
                  height: "100%",
                  background: "linear-gradient(90deg, #6d5dfc, #00e1ff)",
                  borderRadius: 99,
                }}
              />
            </div>

            {/* AI Answer Bubble */}
            <div
              className="ai-answer"
              style={{
                display: "flex",
                gap: 14,
                padding: "16px",
                background: "linear-gradient(135deg, #f7f6ff, #eff9ff)",
                border: "1px solid #e3e0f7",
                borderRadius: "16px",
                marginTop: "20px",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: "var(--purple)",
                  color: "#fff",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                  boxShadow: "0 4px 12px rgba(109, 93, 252, 0.3)",
                }}
              >
                ✦
              </div>
              <div>
                <small
                  style={{
                    fontSize: "10px",
                    fontWeight: 800,
                    letterSpacing: "1px",
                    color: "var(--purple)",
                  }}
                >
                  TEACHER EXPLANATION
                </small>
                <p
                  style={{
                    fontSize: "13px",
                    lineHeight: 1.6,
                    margin: "4px 0 0",
                    color: "#3e3b52",
                    fontWeight: 500,
                  }}
                >
                  “Think of BFS like ripples spreading in a pond — it visits all
                  immediate neighbors first before going deeper.”
                </p>
              </div>
            </div>

            {/* Micro grid */}
            <div
              className="mock-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                marginTop: 16,
              }}
            >
              <div
                style={{
                  background: "#fbfaff",
                  border: "1px solid var(--line)",
                  padding: "12px",
                  borderRadius: "12px",
                }}
              >
                <small style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 700 }}>
                  QUIZ MASTERY
                </small>
                <b style={{ display: "block", fontSize: "17px", marginTop: 4, color: "#10b981" }}>
                  9 / 10 (90%)
                </b>
              </div>
              <div
                style={{
                  background: "#fbfaff",
                  border: "1px solid var(--line)",
                  padding: "12px",
                  borderRadius: "12px",
                }}
              >
                <small style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 700 }}>
                  3D VIDEO SCENES
                </small>
                <b style={{ display: "block", fontSize: "17px", marginTop: 4, color: "var(--purple)" }}>
                  6 Scenes Ready
                </b>
              </div>
            </div>
          </SpotlightCard>

          {/* Floating Pill Badges */}
          <motion.div
            className="floating-pill pill-one card-3d"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position: "absolute",
              top: 80,
              right: -10,
              background: "#fff",
              border: "1px solid rgba(109, 93, 252, 0.2)",
              boxShadow: "0 14px 30px rgba(109, 93, 252, 0.15)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 16px",
              borderRadius: "14px",
              fontSize: "12.5px",
              fontWeight: 800,
            }}
          >
            <Sparkles size={14} color="var(--purple)" />
            <span>AI Tutor 24/7</span>
          </motion.div>

          <motion.div
            className="floating-pill pill-two card-3d"
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position: "absolute",
              bottom: 80,
              left: -10,
              background: "#fff",
              border: "1px solid rgba(0, 225, 255, 0.25)",
              boxShadow: "0 14px 30px rgba(0, 225, 255, 0.12)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 16px",
              borderRadius: "14px",
              fontSize: "12.5px",
              fontWeight: 800,
            }}
          >
            <Video size={14} color="#00a3c4" />
            <span>3D Masterclass Video</span>
          </motion.div>
        </div>
      </section>

      {/* 2. STATS STRIP */}
      <section
        style={{
          background: "linear-gradient(135deg, #0e0c1f 0%, #16132b 100%)",
          color: "#fff",
          padding: "36px 0",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          margin: "40px 0 80px",
        }}
      >
        <div
          style={{
            width: "min(1180px, 92%)",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "30px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "rgba(109, 93, 252, 0.2)",
                color: "#9b8eff",
                display: "grid",
                placeItems: "center",
                border: "1px solid rgba(109, 93, 252, 0.3)",
              }}
            >
              <Zap size={22} />
            </div>
            <div>
              <b style={{ fontSize: "22px", fontFamily: "Manrope" }}>10x Faster</b>
              <div style={{ fontSize: "12px", color: "#a5a1ba" }}>Deep understanding</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "rgba(0, 225, 255, 0.15)",
                color: "#00e1ff",
                display: "grid",
                placeItems: "center",
                border: "1px solid rgba(0, 225, 255, 0.25)",
              }}
            >
              <Video size={22} />
            </div>
            <div>
              <b style={{ fontSize: "22px", fontFamily: "Manrope" }}>3D Video Engine</b>
              <div style={{ fontSize: "12px", color: "#a5a1ba" }}>Turn notes to masterclasses</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "rgba(16, 185, 129, 0.15)",
                color: "#10b981",
                display: "grid",
                placeItems: "center",
                border: "1px solid rgba(16, 185, 129, 0.25)",
              }}
            >
              <BrainCircuit size={22} />
            </div>
            <div>
              <b style={{ fontSize: "22px", fontFamily: "Manrope" }}>Autonomous AI</b>
              <div style={{ fontSize: "12px", color: "#a5a1ba" }}>Researches any concept</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "rgba(245, 158, 11, 0.15)",
                color: "#f59e0b",
                display: "grid",
                placeItems: "center",
                border: "1px solid rgba(245, 158, 11, 0.25)",
              }}
            >
              <FileQuestion size={22} />
            </div>
            <div>
              <b style={{ fontSize: "22px", fontFamily: "Manrope" }}>Instant Quizzes</b>
              <div style={{ fontSize: "12px", color: "#a5a1ba" }}>Test yourself in seconds</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SKIPER UI BENTO GRID */}
      <section className="section" style={{ margin: "60px auto 100px" }}>
        <div className="section-heading" style={{ textAlign: "center", maxWidth: 680, margin: "0 auto 45px" }}>
          <span className="bento-tag" style={{ margin: "0 auto 12px" }}>
            <Sparkles size={11} /> SKIPER ARCHITECTURE
          </span>
          <h2 style={{ fontSize: "38px", letterSpacing: "-1.5px" }}>
            The all-in-one studio built for <span>how you actually learn.</span>
          </h2>
          <p style={{ color: "var(--muted)", fontSize: "16px" }}>
            Engineered with modern cognitive science: conceptual breakdown, active recall, analogies, and dynamic audio-visual synthesis.
          </p>
        </div>

        <div className="bento-grid">
          {/* Card 1: 3D Masterclass Video (Span 7, Dark/Signature) */}
          <div className="bento-col-7 bento-card dark" style={{ gridColumn: "span 7", minHeight: 340 }}>
            <BorderBeam size={280} duration={8} colorFrom="#6d5dfc" colorTo="#00e1ff" />
            <div>
              <span className="bento-tag">
                <Video size={12} /> 3D VIDEO SYNTHESIS
              </span>
              <h3 style={{ fontSize: "26px", margin: "10px 0 8px", letterSpacing: "-0.8px" }}>
                Notes → 3D Masterclass Video
              </h3>
              <p style={{ color: "#beb9d4", fontSize: "14.5px", lineHeight: 1.65, maxWidth: "90%" }}>
                Feed your slides, PDFs, or notes into our video pipeline. It extracts formulas, designs dynamic charts, orchestrates scene timelines, and pairs natural teacher narration.
              </p>
            </div>

            <div
              style={{
                marginTop: "24px",
                padding: "16px 20px",
                borderRadius: "14px",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #6d5dfc, #00e1ff)",
                    display: "grid",
                    placeItems: "center",
                    color: "#fff",
                  }}
                >
                  <Play size={16} fill="#fff" />
                </div>
                <div>
                  <b style={{ fontSize: "13.5px" }}>Teacher Masterclass Pipeline</b>
                  <div style={{ fontSize: "11px", color: "#958fb8" }}>Dynamic Graphs · Formula Derivations · Quizzes</div>
                </div>
              </div>
              <Link to="/notes-to-video" className="btn" style={{ fontSize: "12px", padding: "8px 14px" }}>
                Try Studio →
              </Link>
            </div>
          </div>

          {/* Card 2: Autonomous AI Topic Researcher (Span 5) */}
          <div className="bento-col-5 bento-card" style={{ gridColumn: "span 5", minHeight: 340 }}>
            <div>
              <span className="bento-tag" style={{ background: "rgba(0, 225, 255, 0.1)", color: "#0284c7" }}>
                <BrainCircuit size={12} /> AUTONOMOUS ENGINE
              </span>
              <h3 style={{ fontSize: "24px", margin: "10px 0 8px", letterSpacing: "-0.6px" }}>
                Zero-Source Topic Research
              </h3>
              <p style={{ color: "var(--muted)", fontSize: "14px", lineHeight: 1.6 }}>
                Don't have notes yet? Type any topic like <em>"QuickSort vs MergeSort"</em> or <em>"Transformer Attention"</em> and our AI acts as a university professor, formulating the entire syllabus.
              </p>
            </div>

            <div style={{ marginTop: "20px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "10px 14px",
                  borderRadius: "12px",
                  background: "var(--soft)",
                  border: "1px solid var(--line)",
                  fontSize: "13px",
                  color: "#6b677e",
                  fontWeight: 600,
                }}
              >
                <span>✦ Enter any concept...</span>
                <span style={{ marginLeft: "auto", color: "var(--purple)", fontWeight: 700 }}>Auto-Generate →</span>
              </div>
            </div>
          </div>

          {/* Card 3: Interactive Checkpoints & Quizzes (Span 4) */}
          <div className="bento-card" style={{ gridColumn: "span 4" }}>
            <div className="bento-icon" style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981" }}>
              <FileQuestion size={22} />
            </div>
            <h3 style={{ fontSize: "20px", margin: "0 0 8px" }}>Instant Quizzes</h3>
            <p style={{ color: "var(--muted)", fontSize: "13.5px", lineHeight: 1.6, margin: "0 0 16px" }}>
              Validate your retention with instant checkpoint quizzes generated right from your source material. Complete with confetti celebration!
            </p>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#10b981" }}>✓ Active Recall & Spaced Review</div>
          </div>

          {/* Card 4: Personal AI Tutor (Span 4) */}
          <div className="bento-card" style={{ gridColumn: "span 4" }}>
            <div className="bento-icon">
              <Sparkles size={22} />
            </div>
            <h3 style={{ fontSize: "20px", margin: "0 0 8px" }}>24/7 AI Tutor</h3>
            <p style={{ color: "var(--muted)", fontSize: "13.5px", lineHeight: 1.6, margin: "0 0 16px" }}>
              Ask anything about your notes. Learnify breaks problems down with real-world analogies, code implementations, and exam tips.
            </p>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--purple)" }}>✦ Context-Aware Q&A</div>
          </div>

          {/* Card 5: Multi-Format Upload (Span 4) */}
          <div className="bento-card" style={{ gridColumn: "span 4" }}>
            <div className="bento-icon" style={{ background: "rgba(245, 158, 11, 0.1)", color: "#f59e0b" }}>
              <UploadCloud size={22} />
            </div>
            <h3 style={{ fontSize: "20px", margin: "0 0 8px" }}>Drop Any File</h3>
            <p style={{ color: "var(--muted)", fontSize: "13.5px", lineHeight: 1.6, margin: "0 0 16px" }}>
              PDF, Word DOCX, or plain TXT files. Instant text extraction, topic hierarchy partitioning, and key concept indexing.
            </p>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#d97706" }}>⚡ Fast Document Parsing</div>
          </div>
        </div>
      </section>

      {/* 4. INTERACTIVE FEATURE DEMO TABS (MOTION PRIMITIVES) */}
      <section
        style={{
          width: "min(1180px, 92%)",
          margin: "0 auto 100px",
          padding: "50px 30px",
          background: "#ffffff",
          border: "1px solid var(--line)",
          borderRadius: "28px",
          boxShadow: "0 20px 60px rgba(23, 20, 45, 0.05)",
          textAlign: "center",
        }}
      >
        <span className="bento-tag" style={{ margin: "0 auto 12px" }}>
          <Layers size={12} /> LIVE INTERACTIVE PREVIEWS
        </span>
        <h2 style={{ fontSize: "32px", letterSpacing: "-1px", margin: "8px 0 24px" }}>
          Experience the Learnify Suite
        </h2>

        {/* Animated Segmented Tabs */}
        <AnimatedTabs
          tabs={demoTabs}
          activeTab={activeDemoTab}
          onChange={setActiveDemoTab}
          layoutId="homeDemoTabs"
          style={{
            background: "#f0edf9",
            border: "1px solid #dfdaef",
            marginBottom: "36px",
          }}
        />

        {/* Tab Content Preview Container */}
        <div
          style={{
            maxWidth: 720,
            margin: "0 auto",
            padding: "30px",
            borderRadius: "20px",
            background: "#faf9ff",
            border: "1px solid #e7e3f5",
            textAlign: "left",
          }}
        >
          {activeDemoTab === "video" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <span className="badge" style={{ background: "rgba(0, 225, 255, 0.15)", color: "#0284c7" }}>
                  3D SCENE 02 · FORMULA DERIVATION
                </span>
                <span style={{ fontSize: "12px", color: "var(--muted)" }}>01:45 / 05:00</span>
              </div>
              <h4 style={{ fontSize: "20px", margin: "0 0 10px", color: "var(--ink)" }}>
                Time Complexity: Master Theorem Visualization
              </h4>
              <p style={{ fontSize: "14px", color: "var(--muted)", lineHeight: 1.6 }}>
                "In merge sort, we split the array into two halves of size N/2, doing O(N) work at each step. This yields T(N) = 2T(N/2) + O(N) = O(N log N)."
              </p>
              <div
                style={{
                  marginTop: 18,
                  padding: "16px",
                  borderRadius: "12px",
                  background: "#16132b",
                  color: "#00e1ff",
                  fontFamily: "monospace",
                  fontSize: "14px",
                }}
              >
                {"T(n) = a·T(n/b) + f(n) ➔ Case 2: T(n) = Θ(n^(log_b a) · log n)"}
              </div>
            </div>
          )}

          {activeDemoTab === "lesson" && (
            <div>
              <span className="badge" style={{ background: "rgba(109, 93, 252, 0.15)", color: "var(--purple)" }}>
                STRUCTURED LESSON BREAKDOWN
              </span>
              <h4 style={{ fontSize: "20px", margin: "10px 0 8px" }}>
                Depth-First Search (DFS) Made Easy
              </h4>
              <p style={{ fontSize: "14px", color: "var(--muted)", lineHeight: 1.6 }}>
                <strong>Analogy:</strong> Imagine exploring a labyrinth with a ball of string. You keep walking until you hit a dead end, then rewind your string to try the next path.
              </p>
              <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                <span style={{ padding: "6px 12px", borderRadius: 8, background: "#fff", border: "1px solid var(--line)", fontSize: "12px", fontWeight: 700 }}>
                  💡 Real-world: File traversal
                </span>
                <span style={{ padding: "6px 12px", borderRadius: 8, background: "#fff", border: "1px solid var(--line)", fontSize: "12px", fontWeight: 700 }}>
                  ⚡ Stack: LIFO Structure
                </span>
              </div>
            </div>
          )}

          {activeDemoTab === "tutor" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--purple)", color: "#fff", display: "grid", placeItems: "center", fontSize: 13 }}>
                  ✦
                </div>
                <b style={{ fontSize: "14px" }}>AI Tutor Assistant</b>
              </div>
              <div style={{ padding: 14, borderRadius: 12, background: "#ffffff", border: "1px solid var(--line)", marginBottom: 10, fontSize: "13.5px" }}>
                <b>Student:</b> What is the main difference between TCP and UDP in real terms?
              </div>
              <div style={{ padding: 14, borderRadius: 12, background: "rgba(109, 93, 252, 0.08)", border: "1px solid rgba(109, 93, 252, 0.2)", fontSize: "13.5px" }}>
                <b>AI Tutor:</b> TCP is like a registered mail letter where the recipient signs for every package. UDP is like shouting across a room — fast, low latency, but some words might get lost!
              </div>
            </div>
          )}

          {activeDemoTab === "quiz" && (
            <div>
              <span className="badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}>
                QUESTION 1 OF 3
              </span>
              <h4 style={{ fontSize: "18px", margin: "10px 0 14px" }}>
                Which data structure does Breadth-First Search (BFS) use?
              </h4>
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ padding: "10px 14px", borderRadius: 10, background: "#fff", border: "1px solid var(--line)", fontSize: "13px" }}>
                  A) Stack
                </div>
                <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(16, 185, 129, 0.12)", border: "1.5px solid #10b981", fontSize: "13px", fontWeight: 700, color: "#065f46" }}>
                  ✓ B) Queue (FIFO) — Correct Answer!
                </div>
                <div style={{ padding: "10px 14px", borderRadius: 10, background: "#fff", border: "1px solid var(--line)", fontSize: "13px" }}>
                  C) Priority Queue only
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 5. HIGH CONVERTING CALL TO ACTION */}
      <section
        className="cta-section card-3d"
        style={{
          position: "relative",
          background: "linear-gradient(135deg, #181530 0%, #2f2560 100%)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow: "0 25px 70px rgba(23, 20, 45, 0.25)",
        }}
      >
        <BorderBeam size={320} duration={12} colorFrom="#00e1ff" colorTo="#6d5dfc" />
        <div style={{ position: "relative", zIndex: 3 }}>
          <span className="eyebrow" style={{ color: "#b9afff" }}>
            READY WHEN YOU ARE
          </span>
          <h2 style={{ fontSize: "38px", letterSpacing: "-1.5px", margin: "10px 0" }}>
            Make your next study session count.
          </h2>
          <p style={{ color: "#cbc7dc", maxWidth: 520, fontSize: "16px", lineHeight: 1.6 }}>
            Upload your first notes or pick any topic. Let Learnify AI organize the complex work while you master the material.
          </p>
        </div>

        <div style={{ position: "relative", zIndex: 3 }}>
          <Link to={user ? "/upload" : "/register"} style={{ textDecoration: "none" }}>
            <ShimmerButton
              shimmerColor="#ffffff"
              style={{
                background: "#ffffff",
                color: "#181530",
                padding: "16px 30px",
                fontSize: "16px",
                fontWeight: 800,
              }}
            >
              <span>Get Started Now</span>
              <ArrowRight size={18} />
            </ShimmerButton>
          </Link>
        </div>
      </section>
    </div>
  );
}
