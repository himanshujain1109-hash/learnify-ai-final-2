import TextShimmer from "./ui/TextShimmer";

export default function Loader({ text = "Preparing your study session..." }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 20px",
        textAlign: "center",
      }}
    >
      <div className="orbit-system" style={{ width: 70, height: 70, marginBottom: 20 }}>
        <div className="orbit-ring ring-1" />
        <div className="orbit-ring ring-2" />
        <div className="orbit-core" style={{ width: 18, height: 18, top: "calc(50% - 9px)", left: "calc(50% - 9px)" }} />
      </div>

      <TextShimmer
        as="p"
        duration={2}
        style={{
          fontSize: "15px",
          fontWeight: 600,
          color: "var(--purple)",
          margin: 0,
        }}
      >
        {text}
      </TextShimmer>
    </div>
  );
}
