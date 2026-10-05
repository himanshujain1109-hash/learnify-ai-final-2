export default function TextShimmer({
  children,
  as: Component = "span",
  className = "",
  duration = 2.5,
  spread = 90,
  style = {},
  ...props
}) {
  return (
    <Component
      className={`text-shimmer ${className}`}
      style={{
        display: "inline-block",
        backgroundImage: `linear-gradient(${spread}deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,1) 50%, rgba(255,255,255,0.4) 100%)`,
        backgroundSize: "200% 100%",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        WebkitTextFillColor: "transparent",
        animation: `shimmer ${duration}s infinite linear`,
        ...style,
      }}
      {...props}
    >
      {children}
    </Component>
  );
}
