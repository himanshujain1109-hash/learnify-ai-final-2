import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { getMaterial } from "../services/materials";
import { generateLesson } from "../services/lessons";
import Loader from "../components/Loader";
import BackButton from "../components/BackButton";
import SpotlightCard from "../components/ui/SpotlightCard";
import ShimmerButton from "../components/ui/ShimmerButton";
import {
  Video,
  Sparkles,
  BookOpen,
  ArrowRight,
  Layers,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";

export default function Material() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(null);

  const load = () =>
    getMaterial(id)
      .then(setData)
      .catch((e) => setError(e.response?.data?.message || "Failed to load material"));

  useEffect(() => {
    load();
  }, [id]);

  if (error) {
    return (
      <div style={{ marginTop: 20 }}>
        <BackButton to="/dashboard" label="Back to Dashboard" />
        <div className="error" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!data) return <Loader text="Loading study syllabus and topics..." />;

  const m = data.material || {};
  const topics = data.topics || [];

  const create = async (topicId) => {
    setGenerating(topicId);
    setError("");
    try {
      await generateLesson(topicId);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || "Could not generate the lesson.");
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div style={{ paddingBottom: "70px" }}>
      <BackButton to="/dashboard" label="Back to Dashboard" />

      {/* Hero Header */}
      <section
        style={{
          background: "linear-gradient(135deg, #121024 0%, #1e1842 100%)",
          color: "#ffffff",
          borderRadius: "24px",
          padding: "32px",
          marginBottom: "36px",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 20px 50px rgba(23, 20, 45, 0.15)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 24,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 99,
              background: "rgba(109, 93, 252, 0.2)",
              border: "1px solid rgba(109, 93, 252, 0.3)",
              fontSize: "10.5px",
              fontWeight: 800,
              letterSpacing: "1px",
              color: "#a498ff",
              marginBottom: "12px",
            }}
          >
            <Sparkles size={11} /> STUDY SYLLABUS
          </div>

          <h1 style={{ fontSize: "32px", margin: "4px 0 8px", letterSpacing: "-0.8px" }}>
            {m.title}
          </h1>

          <p style={{ color: "#beb9d4", fontSize: "14px", margin: 0 }}>
            {m.originalFileName || "AI Autonomous Research Module"} ·{" "}
            <span style={{ color: "#10b981", fontWeight: 600 }}>{m.status || "Ready"}</span>
          </p>
        </div>

        {/* Quick Launch Buttons */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Link to={`/notes-to-video/${m._id}`} style={{ textDecoration: "none" }}>
            <ShimmerButton
              shimmerColor="#ffffff"
              style={{
                background: "linear-gradient(135deg, #6d5dfc, #00e1ff)",
                padding: "11px 18px",
                fontSize: "13.5px",
              }}
            >
              <Video size={16} />
              <span>3D Masterclass Video</span>
            </ShimmerButton>
          </Link>

          <Link
            to={`/tutor/${m._id}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "11px 18px",
              borderRadius: "14px",
              background: "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              color: "#ffffff",
              fontSize: "13.5px",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            <Sparkles size={15} color="#a498ff" />
            <span>Ask AI Tutor</span>
          </Link>
        </div>
      </section>

      {/* Topics Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <div>
          <span className="eyebrow" style={{ color: "var(--purple)", fontWeight: 800 }}>
            LEARNING ROADMAP
          </span>
          <h2 style={{ fontSize: "26px", margin: "4px 0 0", letterSpacing: "-0.5px" }}>
            Curriculum Topics
          </h2>
        </div>
        <span
          style={{
            padding: "6px 12px",
            borderRadius: 99,
            background: "var(--soft)",
            color: "var(--purple)",
            fontWeight: 700,
            fontSize: "12.5px",
          }}
        >
          {topics.length} Topics Extracted
        </span>
      </div>

      {/* Topic Cards Grid */}
      {topics.length ? (
        <div className="grid">
          {topics.map((t, idx) => {
            const hasLesson = Boolean(t.lessonId);
            const isGenerating = generating === t._id;

            return (
              <SpotlightCard
                key={t._id}
                spotlightColor="rgba(109, 93, 252, 0.16)"
                style={{
                  background: "#ffffff",
                  border: "1px solid var(--line)",
                  borderRadius: "20px",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: "0 8px 24px rgba(23, 20, 45, 0.04)",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: 99,
                        fontSize: "11px",
                        fontWeight: 800,
                        background: hasLesson ? "rgba(16, 185, 129, 0.12)" : "var(--soft)",
                        color: hasLesson ? "#10b981" : "var(--purple)",
                      }}
                    >
                      {hasLesson ? "Lesson Ready" : `Topic ${t.order || idx + 1}`}
                    </span>

                    <span style={{ fontSize: "11.5px", color: "var(--muted)", fontWeight: 600 }}>
                      {t.difficulty || "College Level"}
                    </span>
                  </div>

                  <h3
                    style={{
                      fontSize: "18px",
                      fontWeight: 700,
                      margin: "12px 0 8px",
                      color: "var(--ink)",
                      letterSpacing: "-0.3px",
                    }}
                  >
                    {t.title}
                  </h3>

                  <p
                    style={{
                      fontSize: "13.5px",
                      color: "var(--muted)",
                      lineHeight: 1.6,
                      margin: "0 0 20px",
                    }}
                  >
                    {t.description || "In-depth concept breakdown with definitions, diagrams, and quizzes."}
                  </p>
                </div>

                <div>
                  {hasLesson ? (
                    <Link
                      to={`/lessons/${t.lessonId}`}
                      className="btn"
                      style={{
                        width: "100%",
                        padding: "10px",
                        fontSize: "13px",
                        fontWeight: 700,
                        justifyContent: "center",
                      }}
                    >
                      <span>Study Lesson</span>
                      <ArrowRight size={14} style={{ marginLeft: 4 }} />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => create(t._id)}
                      disabled={isGenerating}
                      className="btn secondary"
                      style={{
                        width: "100%",
                        padding: "10px",
                        fontSize: "13px",
                        fontWeight: 700,
                        justifyContent: "center",
                        cursor: isGenerating ? "wait" : "pointer",
                      }}
                    >
                      {isGenerating ? (
                        <span>Synthesizing Lesson...</span>
                      ) : (
                        <span>Generate Lesson ✦</span>
                      )}
                    </button>
                  )}
                </div>
              </SpotlightCard>
            );
          })}
        </div>
      ) : (
        <div
          className="empty-state card-3d"
          style={{
            background: "#ffffff",
            border: "1px dashed var(--line)",
            borderRadius: "20px",
            padding: "50px 20px",
            textAlign: "center",
          }}
        >
          <BookOpen size={36} color="var(--purple)" style={{ marginBottom: 12 }} />
          <h3>No topics detected</h3>
          <p style={{ color: "var(--muted)" }}>
            Try uploading a clearer document with distinct headers and text sections.
          </p>
        </div>
      )}
    </div>
  );
}
