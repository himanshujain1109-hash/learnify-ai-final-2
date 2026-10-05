import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../services/auth";
import { useAuth } from "../context/AuthContext";
import SpotlightCard from "../components/ui/SpotlightCard";
import ShimmerButton from "../components/ui/ShimmerButton";
import { User, Mail, Lock, ArrowRight, Sparkles, AlertCircle } from "lucide-react";

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const data = await registerUser(form);
      login(data);
      navigate("/dashboard");
    } catch (err) {
      console.error("Registration error:", err);
      setError(err.friendlyMessage || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 460, margin: "40px auto 80px", padding: "0 16px" }}>
      <SpotlightCard
        className="card-3d"
        spotlightColor="rgba(109, 93, 252, 0.2)"
        borderColor="rgba(109, 93, 252, 0.4)"
        style={{
          background: "#ffffff",
          border: "1px solid var(--line)",
          borderRadius: "24px",
          padding: "36px",
          boxShadow: "0 20px 60px rgba(23, 20, 45, 0.06)",
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <span className="bento-tag" style={{ marginBottom: 8 }}>
            <Sparkles size={11} /> JOIN LEARNIFY AI
          </span>
          <h1 style={{ fontSize: "28px", letterSpacing: "-1px", margin: "6px 0 6px" }}>
            Create Your Workspace
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "14px", margin: 0 }}>
            One unified account for lessons, quizzes, 3D video, and personal AI tutor.
          </p>
        </div>

        {error && (
          <div
            className="error"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 18,
            }}
          >
            <AlertCircle size={17} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={submit}>
          <div className="modern-field">
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <User size={14} color="var(--purple)" />
              <span>Full Name</span>
            </label>
            <input
              type="text"
              required
              className="modern-input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Alex Johnson"
            />
          </div>

          <div className="modern-field">
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Mail size={14} color="var(--purple)" />
              <span>Email Address</span>
            </label>
            <input
              type="email"
              required
              className="modern-input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="alex@university.edu"
            />
          </div>

          <div className="modern-field">
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Lock size={14} color="var(--purple)" />
              <span>Password</span>
            </label>
            <input
              type="password"
              minLength="6"
              required
              className="modern-input"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Minimum 6 characters"
            />
          </div>

          <ShimmerButton
            type="submit"
            disabled={loading}
            style={{ width: "100%", padding: "13px", fontSize: "15px", marginTop: "10px" }}
          >
            {loading ? "Creating account..." : "Start Learning Free →"}
          </ShimmerButton>

          <p
            style={{
              textAlign: "center",
              marginTop: 20,
              fontSize: "13.5px",
              color: "var(--muted)",
            }}
          >
            Already have an account?{" "}
            <Link
              to="/login"
              style={{ color: "var(--purple)", fontWeight: 700, textDecoration: "none" }}
            >
              Log in
            </Link>
          </p>
        </form>
      </SpotlightCard>
    </div>
  );
}
