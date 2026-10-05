import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import {
  Sparkles,
  LayoutDashboard,
  UploadCloud,
  Video,
  LogOut,
  Menu,
  X,
  User,
  ArrowRight,
} from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const signOut = () => {
    logout();
    navigate("/");
  };

  const navLinks = [
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/upload", label: "Study Hub", icon: UploadCloud },
    { path: "/notes-to-video", label: "Notes → Video", icon: Video, badge: "3D" },
  ];

  return (
    <header className="floating-nav-wrapper">
      <nav className="floating-nav-dock">
        {/* Brand Logo */}
        <Link className="brand-dock" to="/" style={{ textDecoration: "none" }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              display: "grid",
              placeItems: "center",
              color: "#fff",
              background: "linear-gradient(135deg, #6d5dfc, #9b8eff)",
              boxShadow: "0 8px 20px rgba(109, 93, 252, 0.35)",
              fontWeight: 900,
              fontSize: "18px",
            }}
          >
            ✦
          </div>
          <span style={{ color: "var(--ink)" }}>
            Learnify <b style={{ color: "var(--purple)" }}>AI</b>
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="nav-links-dock" style={{ display: "flex" }}>
          {user ? (
            <>
              {navLinks.map((link) => {
                const isActive =
                  location.pathname === link.path ||
                  (link.path === "/notes-to-video" &&
                    (location.pathname === "/video" ||
                      location.pathname.startsWith("/notes-to-video")));
                const Icon = link.icon;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`nav-link-item ${isActive ? "active" : ""}`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="navActiveIndicator"
                        className="nav-link-active-bg"
                        transition={{
                          type: "spring",
                          stiffness: 450,
                          damping: 35,
                        }}
                      />
                    )}
                    <Icon size={16} />
                    <span>{link.label}</span>
                    {link.badge && (
                      <span
                        style={{
                          fontSize: "9.5px",
                          padding: "2px 6px",
                          borderRadius: 99,
                          background: isActive
                            ? "rgba(255, 255, 255, 0.25)"
                            : "rgba(109, 93, 252, 0.12)",
                          color: isActive ? "#fff" : "var(--purple)",
                          fontWeight: 800,
                        }}
                      >
                        {link.badge}
                      </span>
                    )}
                  </Link>
                );
              })}

              {/* User Profile & Sign Out */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginLeft: 10,
                  paddingLeft: 12,
                  borderLeft: "1px solid rgba(0,0,0,0.08)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--muted)",
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "var(--soft)",
                      display: "grid",
                      placeItems: "center",
                      color: "var(--purple)",
                    }}
                  >
                    <User size={15} />
                  </div>
                  <span>{user.name?.split(" ")[0]}</span>
                </div>

                <button
                  type="button"
                  onClick={signOut}
                  title="Sign out"
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#8e8a9f",
                    cursor: "pointer",
                    padding: "6px 8px",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: "12.5px",
                    transition: "color 0.2s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#e5484d")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#8e8a9f")}
                >
                  <LogOut size={15} />
                </button>
              </div>
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Link
                to="/login"
                style={{
                  fontSize: "13.5px",
                  fontWeight: 600,
                  color: "#555268",
                  padding: "8px 14px",
                  textDecoration: "none",
                }}
              >
                Log in
              </Link>
              <Link
                to="/register"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "9px 18px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #17152a, #2b274c)",
                  color: "#fff",
                  fontSize: "13.5px",
                  fontWeight: 700,
                  textDecoration: "none",
                  boxShadow: "0 6px 18px rgba(23, 21, 42, 0.15)",
                  transition: "transform 0.2s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
              >
                <span>Get Started</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            display: "none",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            padding: 8,
            color: "var(--ink)",
          }}
          className="mobile-nav-toggle"
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              pointerEvents: "auto",
              marginTop: 8,
              width: "min(1140px, 100%)",
              background: "rgba(255, 255, 255, 0.96)",
              backdropFilter: "blur(20px)",
              borderRadius: "18px",
              padding: "18px",
              border: "1px solid rgba(232, 230, 241, 0.8)",
              boxShadow: "0 15px 35px rgba(23, 20, 45, 0.1)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {user ? (
              <>
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "12px",
                      borderRadius: 10,
                      fontWeight: 600,
                      color: "var(--ink)",
                      textDecoration: "none",
                      background: location.pathname === link.path ? "var(--soft)" : "transparent",
                    }}
                  >
                    <link.icon size={18} color="var(--purple)" />
                    <span>{link.label}</span>
                  </Link>
                ))}
                <div style={{ height: 1, background: "var(--line)", margin: "8px 0" }} />
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut();
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "12px",
                    border: "none",
                    background: "transparent",
                    color: "#e5484d",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <LogOut size={18} />
                  <span>Log out</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ padding: "12px", fontWeight: 600, color: "var(--ink)" }}
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    padding: "12px",
                    borderRadius: 10,
                    background: "var(--purple)",
                    color: "#fff",
                    textAlign: "center",
                    fontWeight: 700,
                  }}
                >
                  Get Started Free
                </Link>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
