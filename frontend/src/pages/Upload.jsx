import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { uploadMaterial, researchMaterial } from "../services/materials";
import BackButton from "../components/BackButton";
import AnimatedTabs from "../components/ui/AnimatedTabs";
import BorderBeam from "../components/ui/BorderBeam";
import ShimmerButton from "../components/ui/ShimmerButton";
import {
  UploadCloud,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  BookOpen,
} from "lucide-react";

export default function Upload() {
  const [activeTab, setActiveTab] = useState("file"); // "file" | "ai"
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [topicPrompt, setTopicPrompt] = useState("");
  const [language, setLanguage] = useState("Hinglish");
  const [level, setLevel] = useState("College");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const navigate = useNavigate();

  const tabs = [
    { id: "file", label: "Upload Documents", icon: <FileText size={15} /> },
    { id: "ai", label: "AI Autonomous Research", icon: <Sparkles size={15} /> },
  ];

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileUpload = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!file) {
      setError("Please choose a PDF, DOCX or TXT file first.");
      return;
    }

    const maxMb = Number(import.meta.env.VITE_MAX_UPLOAD_MB || 4);
    if (file.size > maxMb * 1024 * 1024) {
      setError(`This file exceeds the limit of ${maxMb} MB.`);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await uploadMaterial(file, title);
      const materialId = data?.material?._id;
      if (!materialId) {
        throw new Error("Upload succeeded, but no material ID was returned.");
      }
      navigate(`/materials/${encodeURIComponent(materialId)}`, { replace: true });
    } catch (err) {
      setError(
        err.friendlyMessage ||
        err.response?.data?.message ||
        err.message ||
        "Upload failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTopicResearch = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!topicPrompt.trim()) {
      setError("Please enter a concept or topic name to research (or click one of the suggestions below).");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await researchMaterial({
        topic: topicPrompt.trim(),
        language,
        level,
      });

      const materialId = data?.material?._id;
      if (!materialId) {
        throw new Error("Research completed, but no material ID was returned.");
      }
      navigate(`/materials/${encodeURIComponent(materialId)}`, { replace: true });
    } catch (err) {
      setError(
        err.friendlyMessage ||
        err.response?.data?.message ||
        err.message ||
        "AI Research failed. Please verify backend status."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", paddingBottom: "70px" }}>
      <BackButton to="/dashboard" label="Back to Dashboard" />

      <div
        className="card-3d"
        style={{
          background: "#ffffff",
          border: "1px solid var(--line)",
          borderRadius: "24px",
          padding: "36px",
          boxShadow: "0 20px 60px rgba(23, 20, 45, 0.05)",
          position: "relative",
        }}
      >
        <div style={{ marginBottom: "24px" }}>
          <span className="bento-tag" style={{ marginBottom: "10px" }}>
            <Sparkles size={12} /> STUDY HUB INGESTION
          </span>
          <h1 style={{ fontSize: "32px", letterSpacing: "-1px", margin: "4px 0 8px" }}>
            Create Study Material
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "15px", lineHeight: 1.6, margin: 0 }}>
            Upload existing class notes and PDFs, or let our autonomous agent research any subject from first principles.
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div style={{ marginBottom: "26px" }}>
          <AnimatedTabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={(tab) => {
              setActiveTab(tab);
              setError("");
            }}
            layoutId="uploadModeTabs"
            style={{ width: "100%", justifyContent: "center", padding: "6px" }}
          />
        </div>

        {error && (
          <div
            className="error"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "20px",
            }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Tab 1: File Upload */}
        {activeTab === "file" ? (
          <form onSubmit={handleFileUpload}>
            <div className="modern-field">
              <label>Material Title (Optional)</label>
              <input
                className="modern-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Operating Systems — Virtual Memory"
              />
            </div>

            {/* Drag & Drop File Zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              style={{
                position: "relative",
                border: `2px dashed ${dragActive ? "var(--purple)" : "#d7d2eb"}`,
                borderRadius: "18px",
                background: dragActive ? "rgba(109, 93, 252, 0.04)" : "#faf9ff",
                padding: "36px 20px",
                textAlign: "center",
                transition: "all 0.2s ease",
                marginBottom: "24px",
              }}
            >
              {dragActive && (
                <BorderBeam size={220} duration={6} colorFrom="#6d5dfc" colorTo="#00e1ff" />
              )}
              <input
                id="file-input-field"
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={(e) => setFile(e.target.files[0] || null)}
                style={{ display: "none" }}
              />
              <label htmlFor="file-input-field" style={{ cursor: "pointer", display: "block" }}>
                <div
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 16,
                    background: file ? "#e8f7ec" : "var(--soft)",
                    color: file ? "#10b981" : "var(--purple)",
                    display: "grid",
                    placeItems: "center",
                    margin: "0 auto 12px",
                  }}
                >
                  {file ? <CheckCircle2 size={26} /> : <UploadCloud size={26} />}
                </div>

                <strong style={{ display: "block", fontSize: "16px", color: "var(--ink)", marginBottom: 4 }}>
                  {file ? file.name : "Drag & drop your notes or click to browse"}
                </strong>
                <span style={{ fontSize: "12.5px", color: "var(--muted)" }}>
                  {file
                    ? `${(file.size / (1024 * 1024)).toFixed(2)} MB · Ready to process`
                    : "Supports PDF, DOCX, and TXT files (up to 4 MB)"}
                </span>
              </label>
            </div>

            <ShimmerButton
              type="submit"
              disabled={loading}
              style={{ width: "100%", padding: "14px", fontSize: "15px" }}
            >
              {loading ? "Analyzing Document & Extracting Topics..." : "Process Study Material →"}
            </ShimmerButton>
          </form>
        ) : (
          /* Tab 2: AI Autonomous Topic Research */
          <form onSubmit={handleTopicResearch}>
            <div className="modern-field">
              <label>Topic or Subject Concept</label>
              <input
                className="modern-input"
                value={topicPrompt}
                onChange={(e) => {
                  setTopicPrompt(e.target.value);
                  if (error) setError("");
                }}
                placeholder="e.g., Dijkstra's Shortest Path Algorithm, Photosynthesis, Bayesian Networks"
              />
              <span style={{ fontSize: "11.5px", color: "var(--muted)", marginTop: 4, display: "block" }}>
                AI will research this topic, draft comprehensive curriculum modules, and format lessons.
              </span>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                <span style={{ fontSize: "12px", color: "var(--muted)", alignSelf: "center", marginRight: 2 }}>
                  Try:
                </span>
                {[
                  "Operating Systems — Virtual Memory",
                  "Dijkstra's Shortest Path",
                  "Statistics & Probability Distributions",
                  "Machine Learning Foundations",
                  "Photosynthesis & Calvin Cycle",
                ].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setTopicPrompt(s);
                      setError("");
                    }}
                    style={{
                      background: "rgba(109, 93, 252, 0.08)",
                      border: "1px solid rgba(109, 93, 252, 0.2)",
                      borderRadius: "8px",
                      padding: "4px 9px",
                      fontSize: "11.5px",
                      fontWeight: 500,
                      color: "var(--purple)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Level Selector */}
            <div className="modern-field">
              <label>Academic Level</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["High School", "College", "Competitive Exams", "Advanced Research"].map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLevel(l)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "10px",
                      fontSize: "12.5px",
                      fontWeight: 600,
                      border: `1.5px solid ${level === l ? "var(--purple)" : "var(--line)"}`,
                      background: level === l ? "rgba(109, 93, 252, 0.1)" : "#fff",
                      color: level === l ? "var(--purple)" : "var(--muted)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Language Selector */}
            <div className="modern-field">
              <label>Explanation Tone & Language</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["Hinglish", "English", "Hindi"].map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setLanguage(lang)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "10px",
                      fontSize: "12.5px",
                      fontWeight: 600,
                      border: `1.5px solid ${language === lang ? "var(--purple)" : "var(--line)"}`,
                      background: language === lang ? "rgba(109, 93, 252, 0.1)" : "#fff",
                      color: language === lang ? "var(--purple)" : "var(--muted)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {lang === "Hinglish" ? "Hinglish (Natural Student Style)" : lang}
                  </button>
                ))}
              </div>
            </div>

            <ShimmerButton
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px",
                fontSize: "15px",
                background: "linear-gradient(135deg, #6d5dfc 0%, #00e1ff 100%)",
              }}
            >
              {loading ? "Autonomous AI Research in progress..." : "✦ Autonomous AI Research & Synthesize"}
            </ShimmerButton>
          </form>
        )}
      </div>
    </div>
  );
}
