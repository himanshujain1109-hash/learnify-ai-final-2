import { useRef, useState } from "react";

export default function SpotlightCard({
  children,
  className = "",
  spotlightColor = "rgba(109, 93, 252, 0.18)",
  borderColor = "rgba(109, 93, 252, 0.4)",
  onClick,
  style = {},
  ...props
}) {
  const divRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseEnter = () => {
    setOpacity(1);
  };

  const handleMouseLeave = () => {
    setOpacity(0);
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={`spotlight-card-wrapper ${className}`}
      style={{
        position: "relative",
        borderRadius: "20px",
        overflow: "hidden",
        ...style,
      }}
      {...props}
    >
      {/* Ambient Spotlight Gradient */}
      <div
        style={{
          pointerEvents: "none",
          position: "absolute",
          inset: 0,
          opacity,
          transition: "opacity 0.3s ease",
          background: `radial-gradient(circle 420px at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 75%)`,
          zIndex: 1,
        }}
      />

      {/* Border Highlight Effect */}
      <div
        style={{
          pointerEvents: "none",
          position: "absolute",
          inset: 0,
          opacity: opacity * 0.7,
          transition: "opacity 0.3s ease",
          borderRadius: "inherit",
          border: `1px solid ${borderColor}`,
          maskImage: `radial-gradient(circle 280px at ${position.x}px ${position.y}px, black 40%, transparent 80%)`,
          WebkitMaskImage: `radial-gradient(circle 280px at ${position.x}px ${position.y}px, black 40%, transparent 80%)`,
          zIndex: 2,
        }}
      />

      {/* Inner Content */}
      <div style={{ position: "relative", zIndex: 3, height: "100%" }}>
        {children}
      </div>
    </div>
  );
}
