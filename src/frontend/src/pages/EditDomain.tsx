import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiUrl } from "../config/api";

const EditDomain: React.FC = () => {
  const { domain_id } = useParams<{ domain_id: string }>();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    domain_name: "",
    description: "",
    published: false,
    paper_name: "",
    paper_url: "",
    creator_ids: [] as number[],
  });

  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteComplete, setDeleteComplete] = useState(false);

  // Fetch available users and domain data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch users
        const usersRes = await fetch(apiUrl("/users/?role=admin,superadmin"), {
          credentials: "include",
        });
        if (usersRes.ok) {
          setAvailableUsers(await usersRes.json());
        }

        // Fetch domain
        if (domain_id) {
          const domainRes = await fetch(apiUrl(`/domain/${domain_id}/`), {
            credentials: "include",
          });
          if (domainRes.ok) {
            const domain = await domainRes.json();
            setFormData({
              domain_name: domain.domain_name || "",
              description: domain.description || "",
              published: domain.published || false,
              paper_name: domain.paper_name || "",
              paper_url: domain.paper_url || "",
              creator_ids: domain.creators?.map((c: any) => c.id) || [],
            });
          }
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [domain_id]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target as any;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : value,
    }));
  };

  const handleCreatorChange = (userId: number) => {
    setFormData((prev) => ({
      ...prev,
      creator_ids: prev.creator_ids.includes(userId)
        ? prev.creator_ids.filter((id) => id !== userId)
        : [...prev.creator_ids, userId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!formData.domain_name.trim() || !formData.description.trim()) {
      setError("Name and description are required.");
      return;
    }

    try {
      const response = await fetch(apiUrl(`/domain/${domain_id}/`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => navigate("/main"), 2000);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to update domain.");
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteDomain = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(apiUrl(`/domain/${domain_id}/`), {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        setDeleteComplete(true);
        // Clear localStorage so the next domain selection starts fresh
        try {
          localStorage.removeItem("dx:lastDomainId");
        } catch {}
        setTimeout(() => navigate("/main"), 2000);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to delete domain.");
        setIsDeleting(false);
      }
    } catch (err: any) {
      setError(err.message);
      setIsDeleting(false);
    }
  };

  if (loading)
    return (
      <div
        className="dx-bg"
        style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center" }}
      >
        <div style={{ color: "white" }}>Loading...</div>
      </div>
    );

  return (
    <div className="dx-bg" style={{ display: "flex", height: "100vh" }}>
      <style>{`
        .delete-domain-btn {
          transition: all 0.3s ease;
        }
        .delete-domain-btn:hover:not(:disabled) {
          background-color: #ff7875 !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(255, 77, 79, 0.4);
        }
        .cancel-btn-modal {
          transition: all 0.3s ease;
        }
        .cancel-btn-modal:hover:not(:disabled) {
          background-color: rgba(255, 255, 255, 0.1);
          transform: translateY(-2px);
        }
      `}</style>
      <div
        className="dx-card"
        style={{
          width: 160,
          padding: "22px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
          borderRight: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <button
          className="dx-btn dx-btn-outline"
          style={{ width: "100%", fontSize: "1rem", textAlign: "center" }}
          onClick={() => navigate("/main")}
        >
          ← Back
        </button>
      </div>

      <div
        style={{
          flex: 1,
          padding: "40px 60px",
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        <div className="stars"></div>

        <div style={{ maxWidth: "900px", color: "white" }}>
          <h1 style={{ color: "var(--accent)" }}>Edit Domain</h1>

          <div className="dx-card" style={{ padding: 20 }}>
            <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
              <label className="dx-label">
                Domain Name *
                <input
                  className="dx-input"
                  type="text"
                  name="domain_name"
                  value={formData.domain_name}
                  onChange={handleInputChange}
                  required
                />
              </label>

              <label className="dx-label">
                Description *
                <textarea
                  className="dx-input"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  required
                />
              </label>

              <label className="dx-label">
                <input
                  type="checkbox"
                  name="published"
                  checked={formData.published}
                  onChange={handleInputChange}
                  style={{ marginRight: 8 }}
                />
                Published
              </label>

              <label className="dx-label">
                Paper Name
                <input
                  className="dx-input"
                  type="text"
                  name="paper_name"
                  value={formData.paper_name}
                  onChange={handleInputChange}
                  placeholder="e.g., Research Paper Title"
                />
              </label>

              <label className="dx-label">
                Paper URL
                <input
                  className="dx-input"
                  type="url"
                  name="paper_url"
                  value={formData.paper_url}
                  onChange={handleInputChange}
                  placeholder="https://..."
                />
              </label>

              <fieldset style={{ border: "1px solid #444", padding: "12px", borderRadius: "4px" }}>
                <legend style={{ padding: "0 8px", color: "var(--accent)" }}>
                  Creators
                </legend>
                {availableUsers.length > 0 ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    {availableUsers.map((user) => (
                      <label
                        key={user.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={formData.creator_ids.includes(user.id)}
                          onChange={() => handleCreatorChange(user.id)}
                          style={{ marginRight: 8 }}
                        />
                        <span>{user.full_name || user.username} ({user.email})</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: "#888" }}>No users available.</p>
                )}
              </fieldset>

              {error && <div className="dx-error">{error}</div>}
              {success && (
                <div style={{ color: "var(--accent)", padding: "10px", borderRadius: "4px", backgroundColor: "rgba(var(--accent-rgb), 0.1)" }}>
                  ✓ Domain updated successfully! Redirecting...
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button
                  type="button"
                  className="dx-btn dx-btn-outline"
                  onClick={() => navigate("/main")}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="dx-btn dx-btn-primary"
                >
                  Save Changes
                </button>
              </div>
              
              <button
                type="button"
                className="dx-btn delete-domain-btn"
                style={{ backgroundColor: "#ff4d4f", borderColor: "#ff4d4f", color: "#fff" }}
                onClick={() => setShowDeleteConfirm(true)}
              >
                🗑️ Delete Domain
              </button>
            </form>

            {showDeleteConfirm && (
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  width: "100vw",
                  height: "100vh",
                  backgroundColor: "rgba(0, 0, 0, 0.6)",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  zIndex: 10000,
                }}
              >
                <div
                  style={{
                    background: "#fff",
                    padding: "24px",
                    borderRadius: "12px",
                    width: "350px",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
                    color: "#333",
                  }}
                >
                  {deleteComplete ? (
                    <>
                      <h3 style={{ marginTop: 0, color: "var(--accent)" }}>✓ Domain Deleted</h3>
                      <p style={{ marginBottom: 0 }}>
                        Domain <strong>{formData.domain_name}</strong> has been successfully deleted. Redirecting to main page...
                      </p>
                    </>
                  ) : isDeleting ? (
                    <>
                      <h3 style={{ marginTop: 0 }}>Domain Deletion in Process</h3>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ 
                          width: 24, 
                          height: 24, 
                          border: "3px solid #f0f0f0",
                          borderTop: "3px solid var(--accent)",
                          borderRadius: "50%",
                          animation: "spin 1s linear infinite"
                        }}></div>
                        <p style={{ margin: 0 }}>Please wait while we delete the domain...</p>
                      </div>
                      <style>{`
                        @keyframes spin {
                          0% { transform: rotate(0deg); }
                          100% { transform: rotate(360deg); }
                        }
                      `}</style>
                    </>
                  ) : (
                    <>
                      <h3 style={{ marginTop: 0 }}>Delete Domain</h3>
                      <p style={{ marginBottom: 20 }}>
                        Are you sure you want to delete <strong>{formData.domain_name}</strong>? This action cannot be undone.
                      </p>
                      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                        <button
                          className="dx-btn cancel-btn-modal"
                          onClick={() => setShowDeleteConfirm(false)}
                          disabled={isDeleting}
                          style={{ flex: 1, padding: "12px 24px", fontSize: "1rem" }}
                        >
                          Cancel
                        </button>
                        <button
                          className="dx-btn dx-btn-outline"
                          style={{ flex: 1, padding: "12px 24px", fontSize: "1rem", backgroundColor: "#ff4d4f", borderColor: "#ff4d4f", color: "#fff" }}
                          onClick={handleDeleteDomain}
                          disabled={isDeleting}
                        >
                          {isDeleting ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditDomain;
