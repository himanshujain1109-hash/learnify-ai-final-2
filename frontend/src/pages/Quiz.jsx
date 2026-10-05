import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { getQuiz, submitQuiz } from "../services/quiz";
import Loader from "../components/Loader";
import BackButton from "../components/BackButton";
import SpotlightCard from "../components/ui/SpotlightCard";
import ShimmerButton from "../components/ui/ShimmerButton";
import {
  FileQuestion,
  CheckCircle2,
  XCircle,
  Award,
  ArrowRight,
  RotateCcw,
  Sparkles,
  AlertCircle,
} from "lucide-react";

export default function Quiz() {
  const { lessonId } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getQuiz(lessonId)
      .then(setQuiz)
      .catch((e) => setError(e.response?.data?.message || "Quiz unavailable"));
  }, [lessonId]);

  const questions = quiz?.questions || [];

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#6d5dfc", "#00e1ff", "#10b981", "#ffbb00"],
      });
    } catch (e) {
      console.warn("Confetti error", e);
    }
  };

  const submit = async () => {
    if (Object.keys(answers).length < questions.length) {
      if (
        !window.confirm(
          `You have answered ${Object.keys(answers).length} of ${questions.length} questions. Submit anyway?`
        )
      ) {
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await submitQuiz(quiz._id, answers);
      setResult(res);
      if (res.score >= Math.ceil(res.total * 0.6)) {
        triggerConfetti();
      }
    } catch (e) {
      setError(e.response?.data?.message || "Could not submit quiz");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetake = () => {
    setAnswers({});
    setResult(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (error) {
    return (
      <div style={{ marginTop: 20 }}>
        <BackButton label="Back to Lesson" />
        <div className="error" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!quiz) return <Loader text="Building your interactive practice quiz..." />;

  const answeredCount = Object.keys(answers).length;
  const progressPercent = Math.round((answeredCount / (questions.length || 1)) * 100);

  return (
    <div style={{ maxWidth: 740, margin: "0 auto", paddingBottom: "70px" }}>
      <BackButton label="Back to Lesson" />

      {/* Quiz Header */}
      <div style={{ marginBottom: "28px" }}>
        <span className="bento-tag">
          <Sparkles size={11} /> ACTIVE RECALL CHECKPOINT
        </span>
        <h1 style={{ fontSize: "32px", letterSpacing: "-1px", margin: "6px 0 8px" }}>
          Practice & Test Retention
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "15px", margin: 0 }}>
          Answer each question based on your understanding of the lesson.
        </p>

        {/* Progress bar */}
        <div style={{ marginTop: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", fontWeight: 700, color: "var(--muted)", marginBottom: 6 }}>
            <span>Progress ({answeredCount}/{questions.length} answered)</span>
            <span style={{ color: "var(--purple)" }}>{progressPercent}%</span>
          </div>
          <div style={{ height: 6, borderRadius: 99, background: "var(--line)", overflow: "hidden" }}>
            <motion.div
              style={{
                height: "100%",
                background: "linear-gradient(90deg, #6d5dfc, #00e1ff)",
                borderRadius: 99,
              }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>

      {/* Questions List */}
      <div style={{ display: "grid", gap: "20px" }}>
        {questions.map((q, i) => {
          const isAnswered = answers[i] !== undefined;
          return (
            <motion.div
              key={q.id || i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              style={{
                background: "#ffffff",
                border: `1.5px solid ${isAnswered ? "rgba(109, 93, 252, 0.4)" : "var(--line)"}`,
                borderRadius: "20px",
                padding: "24px",
                boxShadow: "0 8px 25px rgba(23, 20, 45, 0.03)",
                transition: "border-color 0.2s ease",
              }}
            >
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", marginBottom: 16 }}>
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: isAnswered ? "var(--purple)" : "var(--soft)",
                    color: isAnswered ? "#ffffff" : "var(--purple)",
                    fontWeight: 800,
                    fontSize: "12px",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </span>
                <h3 style={{ fontSize: "17px", fontWeight: 700, margin: "2px 0 0", color: "var(--ink)" }}>
                  {q.question}
                </h3>
              </div>

              {/* Options */}
              <div style={{ display: "grid", gap: "8px" }}>
                {(q.options || []).map((opt, j) => {
                  const isSelected = answers[i] === j;
                  const letter = String.fromCharCode(65 + j);
                  return (
                    <div
                      key={j}
                      onClick={() => !result && setAnswers({ ...answers, [i]: j })}
                      className={`quiz-option-card ${isSelected ? "selected" : ""}`}
                      style={{
                        pointerEvents: result ? "none" : "auto",
                      }}
                    >
                      <span className="quiz-option-index">{letter}</span>
                      <span style={{ fontSize: "14px", fontWeight: isSelected ? 600 : 500, color: "var(--ink)", flex: 1 }}>
                        {opt}
                      </span>
                      {isSelected && (
                        <CheckCircle2 size={18} color="var(--purple)" style={{ flexShrink: 0 }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Quiz Submit Bar */}
      {!result ? (
        <div style={{ marginTop: "32px", display: "flex", justifyContent: "flex-end" }}>
          <ShimmerButton
            onClick={submit}
            disabled={submitting}
            style={{ padding: "14px 28px", fontSize: "15px" }}
          >
            {submitting ? "Grading Quiz..." : "Submit Quiz →"}
          </ShimmerButton>
        </div>
      ) : (
        /* Result Card with Score Breakdown */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            marginTop: "36px",
            background: "linear-gradient(135deg, #131126 0%, #221c4b 100%)",
            color: "#ffffff",
            borderRadius: "24px",
            padding: "32px",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            boxShadow: "0 25px 60px rgba(23, 20, 45, 0.2)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              background: result.score >= Math.ceil(result.total * 0.6)
                ? "linear-gradient(135deg, #10b981, #00e1ff)"
                : "linear-gradient(135deg, #f59e0b, #ef4444)",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 16px",
            }}
          >
            <Award size={32} />
          </div>

          <span
            style={{
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              color: "#00e1ff",
            }}
          >
            QUIZ COMPLETE
          </span>

          <h2 style={{ fontSize: "36px", margin: "10px 0 6px", fontFamily: "Manrope" }}>
            Score: {result.score} / {result.total}
          </h2>

          <p style={{ color: "#beb9d4", fontSize: "15px", margin: "0 0 24px" }}>
            {result.score >= Math.ceil(result.total * 0.6)
              ? "🎉 Excellent mastery! You have understood the key principles of this lesson."
              : "Keep practicing! Review the lesson points and give the quiz another shot."}
          </p>

          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleRetake}
              className="btn secondary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "12px 20px",
                borderRadius: 12,
                fontSize: "13.5px",
                background: "rgba(255, 255, 255, 0.1)",
                color: "#fff",
                border: "1px solid rgba(255, 255, 255, 0.2)",
              }}
            >
              <RotateCcw size={15} />
              <span>Retake Quiz</span>
            </button>

            <Link
              to={`/lessons/${lessonId}`}
              className="btn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "12px 20px",
                borderRadius: 12,
                fontSize: "13.5px",
              }}
            >
              <span>Back to Lesson</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </motion.div>
      )}
    </div>
  );
}
