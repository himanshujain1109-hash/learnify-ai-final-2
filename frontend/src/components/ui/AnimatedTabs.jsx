import { motion } from "framer-motion";

export default function AnimatedTabs({
  tabs = [],
  activeTab,
  onChange,
  layoutId = "activeTabPill",
  className = "",
  pillClassName = "",
  style = {},
}) {
  return (
    <div
      className={`animated-tabs-container ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px",
        borderRadius: "14px",
        background: "rgba(255, 255, 255, 0.06)",
        border: "1px solid rgba(255, 255, 255, 0.09)",
        backdropFilter: "blur(12px)",
        position: "relative",
        gap: "4px",
        ...style,
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            style={{
              position: "relative",
              padding: "9px 18px",
              borderRadius: "10px",
              fontSize: "0.88rem",
              fontWeight: 600,
              fontFamily: "inherit",
              border: "none",
              cursor: "pointer",
              background: "transparent",
              color: isActive ? "#ffffff" : "var(--tab-inactive, #8d8a9e)",
              transition: "color 0.2s ease",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              outline: "none",
              zIndex: 1,
            }}
          >
            {isActive && (
              <motion.span
                layoutId={layoutId}
                transition={{
                  type: "spring",
                  stiffness: 420,
                  damping: 32,
                }}
                className={`animated-tab-pill ${pillClassName}`}
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #6d5dfc, #8b7cff)",
                  boxShadow: "0 4px 18px rgba(109, 93, 252, 0.4)",
                  zIndex: -1,
                  pointerEvents: "none",
                }}
              />
            )}
            {tab.icon && <span style={{ display: "inline-flex", alignItems: "center" }}>{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge && (
              <span
                style={{
                  fontSize: "10px",
                  padding: "2px 6px",
                  borderRadius: "99px",
                  background: isActive ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.1)",
                  color: "#fff",
                  fontWeight: 700,
                }}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
