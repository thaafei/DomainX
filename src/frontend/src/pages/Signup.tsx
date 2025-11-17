import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const Signup: React.FC = () => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await fetch("http://127.0.0.1:8000/signup/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password }),
      });

      const data = await result.json();

      if (!result.ok) {
        setError(data.errors?.password || data.errors?.email || data.errors?.username || "Signup failed");
        setLoading(false);
        return;
      }

      navigate("/login");
    } catch (err: any) {
      setError("Something went wrong.");
    }

    setLoading(false);
  };

  return (
    <div className="home-bg dx-auth-bg">
      <div className="stars"></div>
      <div className="dx-auth-grid">
        <div className="dx-auth-hero">
          <h1 className="dx-hero-title">Create Your Account</h1>
          <p className="dx-hero-desc">
            Join DomainX and access the evaluation tools and dashboards.
          </p>
        </div>

        <div className="dx-auth-card">
          <div className="dx-card dx-card-auth">

            <h3 style={{ marginTop: 0, marginBottom: "1.2rem" }}>Sign up</h3>

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

              <label className="dx-label">
                Username
                <input
                  className="dx-input"
                  value={username}
                  required
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                />
              </label>

              <label className="dx-label">
                Password
                <input
                  className="dx-input"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </label>

              {error && <div className="dx-error">{error}</div>}

              <button className="dx-btn dx-btn-primary" type="submit" disabled={loading}>
                {loading ? "Creating account..." : "Sign up"}
              </button>

              <div style={{ marginTop: 10, textAlign: "center" }}>
                Already have an account?{" "}
                <span
                  style={{ color: "var(--accent)", cursor: "pointer" }}
                  onClick={() => navigate("/login")}
                >
                  Login
                </span>
              </div>

            </form>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Signup;
