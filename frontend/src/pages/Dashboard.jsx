import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { getMaterials } from "../services/materials";
import MaterialCard from "../components/MaterialCard";
import Loader from "../components/Loader";
import { useAuth } from "../context/AuthContext";
import SpotlightCard from "../components/ui/SpotlightCard";
import BorderBeam from "../components/ui/BorderBeam";
import ShimmerButton from "../components/ui/ShimmerButton";
import {
  BookOpen,
  Sparkles,
  Video,
  Plus,
  Search,
  CheckCircle,
  FileText,
  Clock,
  ArrowRight,
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all"); // 'all' | 'file' | 'ai'

  useEffect(() => {
    getMaterials()
      .then((d) => setMaterials(d.materials || []))
      .catch((e) =>
        setError(e.response?.data?.message || "Could not load your materials.")
      )
      .finally(() => setLoading(false));
  }, []);

  // Time of day greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      const matchesSearch =
        (m.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.originalFileName || "").toLowerCase().includes(searchQuery.toLowerCase());
      const isAi = m.aiGenerated || m.tags?.includes("autonomous_research");
      if (filterType === "file") return matchesSearch && !isAi;
      if (filterType === "ai") return matchesSearch && isAi;
      return matchesSearch;
    });
  }, [materials, searchQuery, filterType]);

  return (
    <div className="dashboard" style={{ paddingBottom: "70px" }}>
      {/* 1. WELCOME HERO */}
      <section
        className="dash-hero"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 20,
          padding: "20px 0 35px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "4px 12px",
              borderRadius: 99,
              background: "rgba(109, 93, 252, 0.1)",
              border: "1px solid rgba(109, 93, 252, 0.2)",
              fontSize: "11px",
              fontWeight: 800,
              color: "var(--purple)",
              letterSpacing: "1.2px",
              marginBottom: "12px",
            }}
          >
            <span className="pulse-beacon" />
            <span>LEARNING HUB ACTIVE</span>
          </div>

          <h1 style={{ fontSize: "38px", letterSpacing: "-1.5px", margin: "4px 0 8px" }}>
            {greeting}, {user?.name?.split(" ")[0] || "Learner"} 👋
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "15px", margin: 0 }}>
            Continue your active modules or feed new notes to the AI synthesis engine.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <Link to="/upload" style={{ textDecoration: "none" }}>
            <ShimmerButton
              shimmerColor="#ffffff"
              style={{ padding: "12px 20px", fontSize: "14px" }}
            >
              <Plus size={16} />
              <span>Add Study Material</span>
            </ShimmerButton>
          </Link>
        </div>
      </section>

      {/* 2. SPOTLIGHT STATS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "16px",
          marginBottom: "40px",
        }}
      >
        <SpotlightCard
          style={{
            background: "#ffffff",
            border: "1px solid var(--line)",
            borderRadius: "18px",
            padding: "22px",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: "var(--soft)",
              color: "var(--purple)",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <BookOpen size={24} />
          </div>
          <div>
            <b style={{ fontSize: "24px", fontFamily: "Manrope", color: "var(--ink)" }}>
              {materials.length}
            </b>
            <div style={{ fontSize: "12.5px", color: "var(--muted)", fontWeight: 500 }}>
              Study Modules Ingested
            </div>
          </div>
        </SpotlightCard>

        <SpotlightCard
          style={{
            background: "#ffffff",
            border: "1px solid var(--line)",
            borderRadius: "18px",
            padding: "22px",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: "rgba(0, 225, 255, 0.12)",
              color: "#0284c7",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <Video size={24} />
          </div>
          <div>
            <b style={{ fontSize: "24px", fontFamily: "Manrope", color: "var(--ink)" }}>
              3D Studio
            </b>
            <div style={{ fontSize: "12.5px", color: "var(--muted)", fontWeight: 500 }}>
              Video Pipeline Ready
            </div>
          </div>
        </SpotlightCard>

        <SpotlightCard
          style={{
            background: "#ffffff",
            border: "1px solid var(--line)",
            borderRadius: "18px",
            padding: "22px",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: "rgba(16, 185, 129, 0.12)",
              color: "#10b981",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <Sparkles size={24} />
          </div>
          <div>
            <b style={{ fontSize: "24px", fontFamily: "Manrope", color: "var(--ink)" }}>
              AI Tutor
            </b>
            <div style={{ fontSize: "12.5px", color: "var(--muted)", fontWeight: 500 }}>
              Always Online & Contextual
            </div>
          </div>
        </SpotlightCard>
      </div>

      {/* 3. FEATURED BANNER (NOTES -> VIDEO) */}
      <div
        className="card-3d"
        style={{
          position: "relative",
          background: "linear-gradient(135deg, #131126 0%, #201a47 100%)",
          color: "#fff",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "22px",
          padding: "26px 30px",
          marginBottom: "45px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 20,
          flexWrap: "wrap",
          overflow: "hidden",
        }}
      >
        <BorderBeam size={260} duration={9} colorFrom="#6d5dfc" colorTo="#00e1ff" />
        <div style={{ position: "relative", zIndex: 3 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "1px",
              textTransform: "uppercase",
              color: "#00e1ff",
              marginBottom: "8px",
            }}
          >
            <Video size={13} /> 3D AI MASTERCLASS STUDIO
          </span>
          <h2 style={{ fontSize: "24px", margin: "4px 0 6px", letterSpacing: "-0.5px" }}>
            Turn Your Notes into 3D Video Masterclasses
          </h2>
          <p style={{ color: "#beb9d4", margin: 0, fontSize: "14px", maxWidth: 620 }}>
            Generate fully produced educational videos with visual algorithm traces, mathematical derivations, natural speech, and synchronized checkpoints.
          </p>
        </div>

        <Link
          to="/notes-to-video"
          className="btn"
          style={{
            position: "relative",
            zIndex: 3,
            background: "linear-gradient(135deg, #6d5dfc, #00e1ff)",
            color: "#fff",
            padding: "11px 22px",
            borderRadius: "12px",
            fontSize: "13.5px",
            fontWeight: 700,
            whiteSpace: "nowrap",
          }}
        >
          <span>Open Video Studio</span>
          <ArrowRight size={14} style={{ marginLeft: 6 }} />
        </Link>
      </div>

      {/* 4. LIBRARY CONTROLS & FILTER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: "24px",
        }}
      >
        <div>
          <span className="eyebrow" style={{ color: "var(--purple)", fontWeight: 800 }}>
            MY STUDY LIBRARY
          </span>
          <h2 style={{ fontSize: "26px", margin: "4px 0 0", letterSpacing: "-0.5px" }}>
            Recent Materials
          </h2>
        </div>

        {/* Search and Filters */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Search
              size={16}
              color="var(--muted)"
              style={{ position: "absolute", left: 12 }}
            />
            <input
              type="text"
              placeholder="Search materials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: "8px 12px 8px 36px",
                borderRadius: "10px",
                border: "1px solid var(--line)",
                background: "#fff",
                fontSize: "13px",
                outline: "none",
                width: 200,
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              gap: 4,
              padding: 3,
              borderRadius: 10,
              background: "var(--soft)",
              border: "1px solid var(--line)",
            }}
          >
            {["all", "file", "ai"].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFilterType(type)}
                style={{
                  border: "none",
                  padding: "5px 10px",
                  borderRadius: 7,
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  background: filterType === type ? "#ffffff" : "transparent",
                  color: filterType === type ? "var(--purple)" : "var(--muted)",
                  boxShadow: filterType === type ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
                }}
              >
                {type === "all" ? "All" : type === "file" ? "Documents" : "AI Research"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {/* 5. MATERIALS GRID */}
      {loading ? (
        <Loader text="Loading your library..." />
      ) : filteredMaterials.length ? (
        <motion.div
          className="grid material-grid"
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: { staggerChildren: 0.08 },
            },
          }}
        >
          {filteredMaterials.map((m) => (
            <motion.div
              key={m._id}
              variants={{
                hidden: { opacity: 0, y: 15 },
                show: { opacity: 1, y: 0 },
              }}
            >
              <MaterialCard material={m} />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div
          className="empty-state card-3d"
          style={{
            background: "#ffffff",
            border: "1.5px dashed #dcd7ed",
            borderRadius: "24px",
            padding: "50px 20px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "var(--soft)",
              color: "var(--purple)",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 16px",
            }}
          >
            <Sparkles size={26} />
          </div>
          <h3 style={{ fontSize: "20px", margin: "0 0 8px" }}>
            {searchQuery ? "No matching materials found" : "Your study library is waiting"}
          </h3>
          <p
            style={{
              color: "var(--muted)",
              maxWidth: 440,
              margin: "0 auto 20px",
              fontSize: "14px",
              lineHeight: 1.6,
            }}
          >
            {searchQuery
              ? "Try adjusting your search query or switching filters."
              : "Upload your course notes (PDF/DOCX/TXT) or let our AI autonomously research any topic from scratch."}
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/upload" className="btn" style={{ padding: "10px 18px", fontSize: "13.5px" }}>
              Upload Notes (PDF / DOCX)
            </Link>
            <Link
              to="/upload"
              className="btn secondary"
              style={{ padding: "10px 18px", fontSize: "13.5px" }}
            >
              ✦ Autonomous Topic Research
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
