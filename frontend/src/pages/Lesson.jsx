import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion, useScroll, useSpring } from "framer-motion";
import { getLesson } from "../services/lessons";
import Loader from "../components/Loader";
import BackButton from "../components/BackButton";
import SpotlightCard from "../components/ui/SpotlightCard";
import ShimmerButton from "../components/ui/ShimmerButton";
import {
  BookOpen,
  Sparkles,
  Lightbulb,
  FileQuestion,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Check,
} from "lucide-react";

export default function Lesson() {
  const { id } = useParams();
  const [lesson, setLesson] = useState(null);
  const [error, setError] = useState("");

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 200,
    damping: 30,
    restDelta: 0.001,
  });

  useEffect(() => {
    getLesson(id)
      .then((d) => setLesson(d.lesson))
      .catch((e) => setError(e.response?.data?.message || "Failed to load lesson"));
  }, [id]);

  if (error) {
    return (
      <div style={{ marginTop: 20 }}>
        <BackButton label="Back" />
        <div className="error">{error}</div>
      </div>
    );
  }

  if (!lesson) return <Loader text="Opening and rendering your lesson..." />;

  const backTarget = lesson.documentId ? `/materials/${lesson.documentId}` : "/dashboard";

  return (
    <article style={{ maxWidth: 840, margin: "0 auto", paddingBottom: "110px" }}>
      {/* Top Reading Progress Bar */}
      <motion.div className="reading-progress-bar" style={{ scaleX }} />

      <BackButton to={backTarget} label="Back to Topics" />

      {/* Lesson Hero */}
      <div
        style={{
          background: "linear-gradient(135deg, #131126 0%, #201a45 100%)",
          color: "#ffffff",
          borderRadius: "24px",
          padding: "36px",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 20px 50px rgba(23, 20, 45, 0.12)",
          marginBottom: "36px",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            borderRadius: 99,
            background: "rgba(109, 93, 252, 0.25)",
            border: "1px solid rgba(109, 93, 252, 0.35)",
            fontSize: "11px",
            fontWeight: 800,
            letterSpacing: "1px",
            textTransform: "uppercase",
            color: "#b4a9ff",
            marginBottom: "14px",
          }}
        >
          <BookOpen size={12} /> {lesson.difficulty || "College Level"}
        </span>

        <h1 style={{ fontSize: "36px", margin: "4px 0 10px", letterSpacing: "-1px", lineHeight: 1.15 }}>
          {lesson.title}
        </h1>

        <p style={{ color: "#beb9d4", fontSize: "15px", margin: 0 }}>
          Learn it. Connect it with real-world intuition. Test it in practice.
        </p>
      </div>

      {/* 1. Introduction Card */}
      <SpotlightCard
        style={{
          background: "#ffffff",
          border: "1px solid var(--line)",
          borderRadius: "20px",
          padding: "26px",
          marginBottom: "24px",
        }}
      >
        <span className="eyebrow" style={{ color: "var(--purple)", fontWeight: 800 }}>
          FOUNDATIONAL CONTEXT
        </span>
        <h2 style={{ fontSize: "22px", margin: "8px 0 12px", letterSpacing: "-0.4px" }}>
          Introduction
        </h2>
        <div style={{ fontSize: "15px", lineHeight: 1.8, color: "#3e3b52" }}>
          {lesson.introduction}
        </div>
      </SpotlightCard>

      {/* 2. Deep Teacher Explanation */}
      <SpotlightCard
        style={{
          background: "#ffffff",
          border: "1px solid var(--line)",
          borderRadius: "20px",
          padding: "26px",
          marginBottom: "24px",
        }}
      >
        <span className="eyebrow" style={{ color: "var(--purple)", fontWeight: 800 }}>
          CORE PRINCIPLES
        </span>
        <h2 style={{ fontSize: "22px", margin: "8px 0 12px", letterSpacing: "-0.4px" }}>
          Detailed Explanation
        </h2>
        <div style={{ fontSize: "15px", lineHeight: 1.8, color: "#3e3b52", whiteSpace: "pre-wrap" }}>
          {lesson.explanation}
        </div>
      </SpotlightCard>

      {/* 3. Real-Life Analogy Callout */}
      {lesson.realLifeExample && (
        <div
          style={{
            background: "linear-gradient(135deg, #fbfaff, #f1edff)",
            border: "1px solid #dcd7f5",
            borderLeft: "5px solid var(--purple)",
            borderRadius: "18px",
            padding: "24px",
            marginBottom: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Lightbulb size={18} color="var(--purple)" />
            <b style={{ fontSize: "13px", letterSpacing: "0.8px", color: "var(--purple)", textTransform: "uppercase" }}>
              Intuitive Analogy
            </b>
          </div>
          <p style={{ fontSize: "15px", lineHeight: 1.75, color: "#353246", margin: 0 }}>
            {lesson.realLifeExample}
          </p>
        </div>
      )}

      {/* 4. Important Points Checklist */}
      {lesson.importantPoints?.length > 0 && (
        <SpotlightCard
          style={{
            background: "#ffffff",
            border: "1px solid var(--line)",
            borderRadius: "20px",
            padding: "26px",
            marginBottom: "24px",
          }}
        >
          <span className="eyebrow" style={{ color: "#10b981", fontWeight: 800 }}>
            KEY TAKEAWAYS
          </span>
          <h2 style={{ fontSize: "22px", margin: "8px 0 16px", letterSpacing: "-0.4px" }}>
            Important Points
          </h2>
          <div style={{ display: "grid", gap: 12 }}>
            {lesson.importantPoints.map((x, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "rgba(16, 185, 129, 0.15)",
                    color: "#10b981",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  <Check size={13} strokeWidth={3} />
                </div>
                <span style={{ fontSize: "14.5px", lineHeight: 1.6, color: "#3e3b52" }}>
                  {x}
                </span>
              </div>
            ))}
          </div>
        </SpotlightCard>
      )}

      {/* 5. Exam Preparation Highlights */}
      {lesson.examPoints?.length > 0 && (
        <div
          style={{
            background: "linear-gradient(135deg, #fffbf2, #fff7e6)",
            border: "1px solid #f2dfb1",
            borderLeft: "5px solid #f59e0b",
            borderRadius: "18px",
            padding: "24px",
            marginBottom: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <AlertTriangle size={18} color="#d97706" />
            <b style={{ fontSize: "13px", letterSpacing: "0.8px", color: "#b45309", textTransform: "uppercase" }}>
              High-Yield Exam Tips
            </b>
          </div>
          <ul style={{ margin: 0, paddingLeft: "20px", lineHeight: 1.8, color: "#45381d", fontSize: "14.5px" }}>
            {lesson.examPoints.map((x, i) => (
              <li key={i} style={{ marginBottom: 6 }}>{x}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 6. Quick Revision Summary */}
      {lesson.summary && (
        <SpotlightCard
          style={{
            background: "#ffffff",
            border: "1px solid var(--line)",
            borderRadius: "20px",
            padding: "26px",
            marginBottom: "32px",
          }}
        >
          <span className="eyebrow" style={{ color: "var(--purple)", fontWeight: 800 }}>
            RECAP
          </span>
          <h2 style={{ fontSize: "22px", margin: "8px 0 10px", letterSpacing: "-0.4px" }}>
            Quick Revision
          </h2>
          <p style={{ fontSize: "14.5px", lineHeight: 1.7, color: "var(--muted)", margin: 0 }}>
            {lesson.summary}
          </p>
        </SpotlightCard>
      )}

      {/* Sticky Floating Action Dock */}
      <div
        style={{
          position: "sticky",
          bottom: 20,
          background: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(18px)",
          borderRadius: "18px",
          padding: "12px 20px",
          border: "1px solid var(--line)",
          boxShadow: "0 15px 35px rgba(23, 20, 45, 0.1)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
          zIndex: 90,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle2 size={18} color="#10b981" />
          <span style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--ink)" }}>
            Lesson Complete?
          </span>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {lesson.documentId && (
            <Link
              to={`/tutor/${lesson.documentId}`}
              className="btn secondary"
              style={{ padding: "10px 16px", fontSize: "13px", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Sparkles size={14} />
              <span>Ask Tutor</span>
            </Link>
          )}

          <Link to={`/quiz/${lesson._id}`} style={{ textDecoration: "none" }}>
            <ShimmerButton
              shimmerColor="#ffffff"
              style={{ padding: "10px 18px", fontSize: "13.5px" }}
            >
              <FileQuestion size={15} />
              <span>Take the Quiz →</span>
            </ShimmerButton>
          </Link>
        </div>
      </div>
    </article>
  );
}
