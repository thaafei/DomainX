import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiUrl } from "../config/api";

const validatePassword = (password: string) => {
  return {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[^\w\s]/.test(password),
  };
};

const AcceptInvite: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [tokenUsed, setTokenUsed] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingInvite, setCheckingInvite] = useState(true);

  const navigate = useNavigate();

  const passwordRules = validatePassword(password);

  const passwordValid =
    passwordRules.length &&
    passwordRules.upper &&
    passwordRules.lower &&
    passwordRules.number &&
    passwordRules.special;

  const passwordsMatch = password === confirmPassword;

  const getInputBorder = (type: "password" | "confirm") => {
    if (type === "confirm" && confirmPassword.length > 0 && !passwordsMatch) {
      return "2px solid #ff4d4f";
    }
    if (type === "password" && password.length > 0 && !passwordValid) {
      return "2px solid #ff4d4f";
    }
    return undefined;
  };

  useEffect(() => {
    const checkInvite = async () => {
      if (!token) {
        setTokenError("This invitation link is invalid.");
        setCheckingInvite(false);
        return;
      }

      try {
        await fetch(apiUrl("/logout/"), {
          method: "POST",
          credentials: "include",
        });
      } catch {}

      try {
        const res = await fetch(
          apiUrl(`/validate-invite/?token=${encodeURIComponent(token)}`),
          {
            credentials: "include",
          }
        );
        const data = await res.json();

        if (!data.valid) {
          setTokenError(
            "This invitation link is invalid, expired, or has already been used."
          );
        }
      } catch {
        setTokenError(
          "We could not verify this invitation link. Please contact your administrator."
        );
      } finally {
        setCheckingInvite(false);
      }
    };

    checkInvite();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError(null);
    setSuccess(null);

    if (!token) {
      setError("Invalid or missing invite token.");
      return;
    }

    if (!passwordValid) {
      setError("Password does not meet the required security rules.");
      return;
    }

    if (!passwordsMatch) {
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
        const message =
          data.error ||
          data.errors?.password?.[0] ||
          "Failed to activate account.";

        const lowerMessage = message.toLowerCase();

        if (
          lowerMessage.includes("already been used") ||
          lowerMessage.includes("account already activated")
        ) {
          setTokenUsed(true);
          setTokenError(message);
          setError(null);
          return;
        }

        if (
          lowerMessage.includes("expired") ||
          lowerMessage.includes("invalid invite")
        ) {
          setTokenUsed(false);
          setTokenError(message);
          setError(null);
          return;
        }

        throw new Error(message);
      }

      setSuccess("Account activated successfully. Redirecting to login...");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingInvite) {
    return (
      <div className="home-bg dx-auth-bg">
        <div className="stars"></div>
        <div className="dx-auth-grid">
          <div className="dx-auth-card">
            <div className="dx-card dx-card-auth">
              <h3 style={{ marginTop: 0 }}>Checking invitation...</h3>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            <h3 style={{ marginTop: 0, marginBottom: "1.2rem" }}>
              Activate account
            </h3>

            {tokenError ? (
              <div style={{ display: "grid", gap: 16 }}>
                <div className="dx-error">{tokenError}</div>

                {tokenUsed ? (
                  <button
                    className="dx-btn dx-btn-primary"
                    type="button"
                    onClick={() => navigate("/login")}
                  >
                    Go to Login
                  </button>
                ) : (
                  <>
                    <button
                      className="dx-btn dx-btn-primary"
                      type="button"
                      onClick={() => navigate("/login")}
                    >
                      Back to Login
                    </button>

                    <div style={{ textAlign: "center" }}>
                      <span
                        style={{ color: "var(--accent)", cursor: "pointer" }}
                        onClick={() => navigate("/login")}
                      >
                        Contact your administrator for a new invite
                      </span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
                <label className="dx-label">
                  Password
                  <input
                    className="dx-input"
                    type="password"
                    required
                    minLength={8}
                    style={{
                      border: getInputBorder("password"),
                      transition: "border-color 0.2s ease",
                    }}
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
                    style={{
                      border: getInputBorder("confirm"),
                      transition: "border-color 0.2s ease",
                    }}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </label>

                {confirmPassword && !passwordsMatch && (
                  <span style={{ color: "#ff4d4f", fontSize: "0.75rem", marginTop: -8 }}>
                    Passwords do not match
                  </span>
                )}

                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--text-dim)",
                    marginTop: -6,
                  }}
                >
                  Password must contain:
                  <ul style={{ marginTop: 6, paddingLeft: 18, lineHeight: "1.6" }}>
                    <li style={{ color: passwordRules.length ? "#4ade80" : undefined }}>
                      At least 8 characters
                    </li>
                    <li style={{ color: passwordRules.upper ? "#4ade80" : undefined }}>
                      One uppercase letter
                    </li>
                    <li style={{ color: passwordRules.lower ? "#4ade80" : undefined }}>
                      One lowercase letter
                    </li>
                    <li style={{ color: passwordRules.number ? "#4ade80" : undefined }}>
                      One number
                    </li>
                    <li style={{ color: passwordRules.special ? "#4ade80" : undefined }}>
                      One special character
                    </li>
                  </ul>
                </div>

                {error && <div className="dx-error">{error}</div>}
                {success && <div className="dx-success">{success}</div>}

                <button
                  className="dx-btn dx-btn-primary"
                  type="submit"
                  disabled={loading || !passwordValid || !passwordsMatch}
                >
                  {loading ? "Activating..." : "Activate Account"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcceptInvite;
