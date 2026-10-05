import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

export default function BackButton({ to, label = "Back", style = {} }) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };

  return (
    <motion.button
      type="button"
      onClick={handleBack}
      whileHover={{ x: -3 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px 16px",
        marginBottom: "22px",
        borderRadius: "12px",
        fontSize: "0.9rem",
        fontWeight: 600,
        fontFamily: "inherit",
        color: "#5f5b72",
        background: "rgba(255, 255, 255, 0.8)",
        border: "1px solid rgba(220, 215, 235, 0.8)",
        cursor: "pointer",
        backdropFilter: "blur(10px)",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
        ...style,
      }}
      title="Go back"
    >
      <ArrowLeft size={16} color="var(--purple)" />
      <span>{label}</span>
    </motion.button>
  );
}
