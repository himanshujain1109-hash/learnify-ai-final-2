import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { uploadMaterial, researchMaterial } from "../services/materials";
import BackButton from "../components/BackButton";

export default function Upload() {
  const [activeTab, setActiveTab] = useState("file"); // "file" | "ai"
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [topicPrompt, setTopicPrompt] = useState("");
  const [language, setLanguage] = useState("Hinglish");
  const [level, setLevel] = useState("College");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleFileUpload = async (e) => {
    e.preventDefault();

    if (!file) {
      setError("Choose a PDF, DOCX or TXT file first.");
      return;
    }

    const maxMb = Number(import.meta.env.VITE_MAX_UPLOAD_MB || 4);
    if (file.size > maxMb * 1024 * 1024) {
      setError(`This file is too large. The maximum upload size is ${maxMb} MB.`);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await uploadMaterial(file, title);
      const materialId = data?.material?._id;
      if (!materialId) {
        throw new Error("Upload succeeded, but the server did not return a material ID.");
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
    e.preventDefault();

    if (!topicPrompt.trim()) {
      setError("Please enter a topic or concept name.");
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
        err.response?.data?.message ||
        err.message ||
        "AI Research failed. Please check backend status."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <BackButton to="/dashboard" label="Back to Dashboard" />

      <div className="form">
        <span className="eyebrow">STUDY HUB</span>
        <h1>Create Study Material</h1>
        <p className="form-intro">
          Upload your notes/PDF or let AI autonomously research and generate comprehensive lessons on any topic.
        </p>

        {/* Mode Switcher Tabs */}
        <div
          style={{
            display: "flex",
            gap: 10,
            background: "rgba(255, 255, 255, 0.05)",
            padding: 6,
            borderRadius: 14,
            marginBottom: 24,
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <button
            type="button"
            onClick={() => { setActiveTab("file"); setError(""); }}
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: 10,
              fontSize: "0.92rem",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              transition: "all 0.2s ease",
              background: activeTab === "file" ? "linear-gradient(135deg, #6d5dfc, #8577fc)" : "transparent",
              color: activeTab === "file" ? "#ffffff" : "#a19db5",
              boxShadow: activeTab === "file" ? "0 4px 12px rgba(109, 93, 252, 0.3)" : "none",
            }}
          >
            📄 Upload Notes (PDF / DOCX / TXT)
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("ai"); setError(""); }}
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: 10,
              fontSize: "0.92rem",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              transition: "all 0.2s ease",
              background: activeTab === "ai" ? "linear-gradient(135deg, #6d5dfc, #00e1ff)" : "transparent",
              color: activeTab === "ai" ? "#ffffff" : "#a19db5",
              boxShadow: activeTab === "ai" ? "0 4px 12px rgba(0, 225, 255, 0.25)" : "none",
            }}
          >
            ✦ AI Autonomous Topic Research
          </button>
        </div>

        {error && <div className="error" style={{ marginBottom: 16 }}>{error}</div>}

        {/* Tab 1: File Upload */}
        {activeTab === "file" ? (
          <form onSubmit={handleFileUpload}>
            <div className="field">
              <label>Material title (Optional)</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Data Structures — Unit 1"
              />
            </div>

            <div className="field">
              <label>File</label>
              <div className="upload-drop">
                <input
                  type="file"
                  accept=".pdf,.docx,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  required
                />
                <p className="muted">
                  PDF, DOCX or TXT · max {import.meta.env.VITE_MAX_UPLOAD_MB || 4} MB
                </p>
              </div>
            </div>

            <button className="btn btn-primary" disabled={loading} style={{ width: "100%", marginTop: 12 }}>
              {loading ? "Reading & Analyzing PDF..." : "Upload & Deep-Analyze PDF →"}
            </button>
          </form>
        ) : (
          /* Tab 2: AI Topic Generator */
          <form onSubmit={handleTopicResearch}>
            <div className="field">
              <label>Topic or Subject to Research</label>
              <input
                value={topicPrompt}
                onChange={(e) => setTopicPrompt(e.target.value)}
                placeholder="e.g. Binary Search Trees & AVL Balancing, Quantum Computing Basics, or French Revolution..."
                required
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
                >
                  <option value="Hinglish" style={{ background: "#1c2145" }}>Hinglish</option>
                  <option value="English" style={{ background: "#1c2145" }}>English</option>
                  <option value="Hindi" style={{ background: "#1c2145" }}>Hindi</option>
                </select>
              </div>

              <div className="field" style={{ marginBottom: 0 }}>
                <label>Academic Level</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
                >
                  <option value="Beginner" style={{ background: "#1c2145" }}>Beginner</option>
                  <option value="College" style={{ background: "#1c2145" }}>College</option>
                  <option value="Advanced" style={{ background: "#1c2145" }}>Advanced</option>
                </select>
              </div>
            </div>

            <button className="btn btn-primary" disabled={loading} style={{ width: "100%", marginTop: 12 }}>
              {loading ? "AI is Researching & Generating Notes..." : "✦ Generate Complete Study Material & Lessons →"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
