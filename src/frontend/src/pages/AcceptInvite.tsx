import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiUrl } from "../config/api";

const AcceptInvite: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!token) {
      setError("Invalid or missing invite token.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const result = await fetch(apiUrl("/auth/accept-invite/"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await result.json();

      if (!result.ok) {
        throw new Error(data.error || data.errors?.password?.[0] || "Failed to activate account.");
      }

      setSuccess("Account activated successfully. Redirecting to login...");
      setTimeout(() => navigate("/login"), 1500);
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
          <h1 className="dx-hero-title">Set Your Password</h1>
          <p className="dx-hero-desc">
            Complete your DomainX account setup.
          </p>
        </div>

        <div className="dx-auth-card">
          <div className="dx-card dx-card-auth">
            <h3 style={{ marginTop: 0, marginBottom: "1.2rem" }}>Activate account</h3>

            <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
              <label className="dx-label">
                Password
                <input
                  className="dx-input"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </label>

              <label className="dx-label">
                Confirm Password
                <input
                  className="dx-input"
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </label>

              {error && <div className="dx-error">{error}</div>}
              {success && <div className="dx-success">{success}</div>}

              <button className="dx-btn dx-btn-primary" type="submit" disabled={loading}>
                {loading ? "Activating..." : "Activate Account"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcceptInvite;