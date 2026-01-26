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

  if (loading) return <div className="home-bg dx-auth-bg"><div className="dx-auth-grid"><div>Loading...</div></div></div>;

  return (
    <div className="home-bg dx-auth-bg">
      <div className="stars"></div>
      <div className="dx-auth-grid">
        <div className="dx-auth-hero">
          <h1 className="dx-hero-title">Edit Domain</h1>
          <p className="dx-hero-desc">
            Update domain details, creators, and publication status.
          </p>
        </div>

        <div className="dx-auth-card">
          <div className="dx-card dx-card-auth" role="main">
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
                        {user.username} ({user.email})
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
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditDomain;
