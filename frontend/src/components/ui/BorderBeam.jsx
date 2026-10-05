export default function BorderBeam({
  className = "",
  size = 200,
  duration = 10,
  borderWidth = 1.5,
  colorFrom = "#6d5dfc",
  colorTo = "#00e1ff",
  delay = 0,
}) {
  return (
    <div
      style={{
        pointerEvents: "none",
        position: "absolute",
        inset: 0,
        borderRadius: "inherit",
        border: `${borderWidth}px solid transparent`,
        maskImage: "linear-gradient(transparent, transparent), linear-gradient(#000, #000)",
        maskClip: "padding-box, border-box",
        maskComposite: "intersect",
        WebkitMaskImage: "linear-gradient(transparent, transparent), linear-gradient(#000, #000)",
        WebkitMaskClip: "padding-box, border-box",
        WebkitMaskComposite: "xor",
        zIndex: 2,
      }}
      className={`border-beam-container ${className}`}
    >
      <div
        style={{
          position: "absolute",
          aspectRatio: "1/1",
          width: `${size}px`,
          backgroundImage: `conic-gradient(from 0deg, transparent 0 340deg, ${colorFrom} 355deg, ${colorTo} 360deg)`,
          animation: `border-beam ${duration}s infinite linear`,
          animationDelay: `-${delay}s`,
          transform: "translate(-50%, -50%)",
        }}
      />
    </div>
  );
}
