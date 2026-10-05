import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../services/auth";
import { useAuth } from "../context/AuthContext";
import SpotlightCard from "../components/ui/SpotlightCard";
import ShimmerButton from "../components/ui/ShimmerButton";
import { Mail, Lock, ArrowRight, Sparkles, AlertCircle } from "lucide-react";

export default function Login() {
  const [form, setForm] = useState({
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
    setLoading(true);

    try {
      const data = await loginUser(form);
      login(data);
      navigate("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setError(err.friendlyMessage || "Login failed. Please check your credentials.");
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
            <Sparkles size={11} /> WELCOME BACK
          </span>
          <h1 style={{ fontSize: "28px", letterSpacing: "-1px", margin: "6px 0 6px" }}>
            Log in to Learnify
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "14px", margin: 0 }}>
            Access your notes, syllabus maps, and AI tutor.
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
              <Mail size={14} color="var(--purple)" />
              <span>Email Address</span>
            </label>
            <input
              type="email"
              required
              className="modern-input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@university.edu"
            />
          </div>

          <div className="modern-field">
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Lock size={14} color="var(--purple)" />
              <span>Password</span>
            </label>
            <input
              type="password"
              required
              className="modern-input"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Your password"
            />
          </div>

          <ShimmerButton
            type="submit"
            disabled={loading}
            style={{ width: "100%", padding: "13px", fontSize: "15px", marginTop: "10px" }}
          >
            {loading ? "Logging in..." : "Log In to Workspace →"}
          </ShimmerButton>

          <p
            style={{
              textAlign: "center",
              marginTop: 20,
              fontSize: "13.5px",
              color: "var(--muted)",
            }}
          >
            New to Learnify AI?{" "}
            <Link
              to="/register"
              style={{ color: "var(--purple)", fontWeight: 700, textDecoration: "none" }}
            >
              Create free account
            </Link>
          </p>
        </form>
      </SpotlightCard>
    </div>
  );
}
