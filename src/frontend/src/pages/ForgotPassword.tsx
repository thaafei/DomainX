import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../config/api";

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError(null);
    setSuccess(null);

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    try {
      setLoading(true);

      const result = await fetch(apiUrl("/forgot-password/"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await result.json();

      if (!result.ok) {
        throw new Error(
          data.error ||
            data.errors?.email?.[0] ||
            "Failed to send password reset email."
        );
      }

      setSuccess(
        "If an account with that email exists, a password reset link has been sent."
      );
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home-bg dx-auth-bg">
      <div className="stars"></div>

      <div className="dx-auth-grid">
        <div className="dx-auth-hero">
          <h1 className="dx-hero-title">Forgot Your Password?</h1>
          <p className="dx-hero-desc">
            Enter your email address and we’ll send you a link to reset your
            password.
          </p>
        </div>

        <div className="dx-auth-card">
          <div className="dx-card dx-card-auth">
            <h3 style={{ marginTop: 0, marginBottom: "1.2rem" }}>
              Reset password
            </h3>

            {!success ? (
              <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
                <label className="dx-label">
                  Email
                  <input
                    className="dx-input"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </label>

                {error && <div className="dx-error">{error}</div>}

                <button
                  className="dx-btn dx-btn-primary"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>

                <div style={{ marginTop: 10, textAlign: "center" }}>
                  <span
                    style={{ color: "var(--accent)", cursor: "pointer" }}
                    onClick={() => navigate("/login")}
                  >
                    Back to Login
                  </span>
                </div>
              </form>
            ) : (
              <div style={{ display: "grid", gap: 18 }}>
                <div className="dx-success">{success}</div>

                <button
                  className="dx-btn dx-btn-primary"
                  type="button"
                  onClick={() => navigate("/login")}
                >
                  Back to Login
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;