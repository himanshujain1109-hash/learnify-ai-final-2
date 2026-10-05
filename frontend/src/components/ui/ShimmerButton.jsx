import { motion } from "framer-motion";

export default function ShimmerButton({
  children,
  onClick,
  className = "",
  shimmerColor = "#ffffff",
  shimmerSize = "0.08em",
  shimmerDuration = "3s",
  borderRadius = "14px",
  background = "linear-gradient(135deg, #6d5dfc 0%, #4f46e5 100%)",
  type = "button",
  disabled = false,
  style = {},
  ...props
}) {
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`shimmer-btn ${className}`}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "13px 24px",
        borderRadius,
        background,
        color: "#ffffff",
        fontWeight: 700,
        fontFamily: "inherit",
        fontSize: "0.95rem",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        boxShadow: "0 10px 30px rgba(109, 93, 252, 0.35), 0 0 1px 1px rgba(255,255,255,0.1) inset",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.7 : 1,
        overflow: "hidden",
        textDecoration: "none",
        ...style,
      }}
      {...props}
    >
      {/* Dynamic light sweep */}
      <span
        style={{
          position: "absolute",
          top: 0,
          left: "-100%",
          width: "50%",
          height: "100%",
          background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.25), transparent)",
          transform: "skewX(-20deg)",
          animation: `shimmer-sweep ${shimmerDuration} infinite ease-in-out`,
          pointerEvents: "none",
        }}
      />
      <span style={{ position: "relative", zIndex: 2, display: "inline-flex", alignItems: "center", gap: "8px", pointerEvents: "none" }}>
        {children}
      </span>
    </motion.button>
  );
}
