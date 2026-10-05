import { Link } from "react-router-dom";
import SpotlightCard from "./ui/SpotlightCard";
import { FileText, Sparkles, Video, ArrowRight, BookOpen } from "lucide-react";

export default function MaterialCard({ material }) {
  const fileName = material.originalFileName || "";
  const ext = fileName.split(".").pop()?.toUpperCase() || (material.aiGenerated ? "AI" : "DOC");

  const isAi = material.aiGenerated || material.tags?.includes("autonomous_research");

  return (
    <SpotlightCard
      className="card-3d"
      spotlightColor="rgba(109, 93, 252, 0.16)"
      borderColor="rgba(109, 93, 252, 0.3)"
      style={{
        background: "#ffffff",
        border: "1px solid var(--line)",
        borderRadius: "20px",
        padding: "24px",
        boxShadow: "0 10px 30px rgba(23, 20, 45, 0.04)",
      }}
    >
      <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
        {/* File Type Icon */}
        <div
          style={{
            width: 46,
            height: 54,
            borderRadius: 12,
            background: isAi
              ? "linear-gradient(135deg, #6d5dfc, #00e1ff)"
              : ext === "PDF"
              ? "linear-gradient(135deg, #ff4b4b, #ff7676)"
              : "linear-gradient(135deg, #4b7bff, #769eff)",
            color: "#ffffff",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            boxShadow: isAi
              ? "0 6px 18px rgba(109, 93, 252, 0.35)"
              : "0 6px 16px rgba(0, 0, 0, 0.08)",
          }}
        >
          {isAi ? (
            <Sparkles size={20} />
          ) : (
            <span style={{ fontSize: "11px", fontWeight: 900 }}>{ext}</span>
          )}
        </div>

        {/* Content */}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 8px",
                borderRadius: 99,
                fontSize: "10px",
                fontWeight: 800,
                textTransform: "uppercase",
                background: isAi ? "rgba(0, 225, 255, 0.12)" : "rgba(109, 93, 252, 0.1)",
                color: isAi ? "#0284c7" : "var(--purple)",
              }}
            >
              {isAi && <Sparkles size={10} />}
              {material.status || "Ready"}
            </span>

            <span style={{ fontSize: "11px", color: "#9ca3af" }}>
              {material.createdAt ? new Date(material.createdAt).toLocaleDateString() : ""}
            </span>
          </div>

          <h3
            style={{
              fontSize: "16.5px",
              fontWeight: 700,
              letterSpacing: "-0.3px",
              margin: "10px 0 6px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              color: "var(--ink)",
            }}
            title={material.title}
          >
            {material.title}
          </h3>

          <p
            style={{
              fontSize: "12px",
              color: "var(--muted)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              margin: "0 0 16px",
            }}
          >
            {material.originalFileName || "AI Generated Study Pack"}
          </p>

          {/* Action Row */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <Link
              to={`/materials/${material._id}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "7px 13px",
                borderRadius: "10px",
                fontSize: "12px",
                fontWeight: 700,
                background: "var(--purple)",
                color: "#fff",
                textDecoration: "none",
                boxShadow: "0 4px 12px rgba(109, 93, 252, 0.25)",
              }}
            >
              <span>Explore</span>
              <ArrowRight size={12} />
            </Link>

            <Link
              to={`/tutor/${material._id}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "7px 11px",
                borderRadius: "10px",
                fontSize: "12px",
                fontWeight: 600,
                background: "var(--soft)",
                color: "var(--purple)",
                textDecoration: "none",
              }}
              title="Ask AI Tutor about this document"
            >
              <Sparkles size={12} />
              <span>Tutor</span>
            </Link>

            <Link
              to={`/notes-to-video/${material._id}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "7px 11px",
                borderRadius: "10px",
                fontSize: "12px",
                fontWeight: 600,
                background: "rgba(0, 225, 255, 0.1)",
                color: "#0369a1",
                textDecoration: "none",
              }}
              title="Generate 3D Masterclass Video"
            >
              <Video size={12} />
              <span>Video</span>
            </Link>
          </div>
        </div>
      </div>
    </SpotlightCard>
  );
}
