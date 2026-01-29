import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../config/api";
import { useAuthStore } from "../store/useAuthStore";

interface Domain {
  domain_ID: string;
  domain_name: string;
}

interface User {
  id: number;
  email: string;
  username: string;
  role: string;
  first_name: string;
  last_name: string;
  full_name: string | null;
  domains?: Domain[];
}

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState({
    first_name: "",
    last_name: "",
    role: "",
    domain_ids: [] as string[],
  });
  const [allDomains, setAllDomains] = useState<Domain[]>([]);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  useEffect(() => {
    if (user === undefined) {
      return;
    }
    if (!user || user.role !== "superadmin") {
      navigate("/main");
      return;
    }

    fetchUsers();
    fetchAllDomains();
  }, [user, navigate]);

  const fetchAllDomains = async () => {
    try {
      const response = await fetch(apiUrl("/domain/"), {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setAllDomains(data);
      }
    } catch (err) {
      console.error("Error fetching domains:", err);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(apiUrl("/users/?include_domains=true"), {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
      setUsers(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setEditFormData({
      first_name: u.first_name || "",
      last_name: u.last_name || "",
      role: u.role,
      domain_ids: u.domains?.map(d => d.domain_ID) || [],
    });
    setUpdateError(null);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingUser(null);
    setUpdateError(null);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      setUpdateLoading(true);
      setUpdateError(null);

      const response = await fetch(apiUrl(`/users/${editingUser.id}/`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(editFormData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update user");
      }

      await fetchUsers();
      closeEditModal();
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setUpdateLoading(false);
    }
  };

  const toggleDomain = (domainId: string) => {
    setEditFormData(prev => ({
      ...prev,
      domain_ids: prev.domain_ids.includes(domainId)
        ? prev.domain_ids.filter(id => id !== domainId)
        : [...prev.domain_ids, domainId]
    }));
  };

  if (loading) {
    return (
      <div className="dx-bg" style={{ display: "flex", height: "100vh" }}>
        <div className="stars"></div>
        <div style={{ margin: "auto", color: "white", fontSize: "1.5rem" }}>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dx-bg" style={{ display: "flex", height: "100vh" }}>
        <div className="stars"></div>
        <div style={{ margin: "auto", color: "var(--danger)", fontSize: "1.5rem" }}>
          Error: {error}
          <button className="dx-btn dx-btn-primary" onClick={fetchUsers} style={{ marginLeft: "20px" }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dx-bg" style={{ display: "flex", height: "100vh" }}>
      <div
        style={{
          flex: 1,
          padding: "40px 60px",
          color: "white",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          position: "relative",
        }}
      >
        <div className="stars"></div>

        <div style={{ color: "white", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
          <button
            className="dx-btn dx-btn-outline"
            style={{ width: "fit-content", fontSize: "1rem", marginBottom: 20 }}
            onClick={() => navigate("/main")}
          >
            ← Back
          </button>
          
          <h1 style={{ color: "var(--accent)", marginBottom: 14 }}>Manage Users</h1>

          <div
            className="dx-card"
            style={{
              padding: 14,
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div className="dx-table-wrap dx-table-scroll" style={{ flex: 1, minHeight: 0 }}>
              <table className="dx-table">
                <thead>
                  <tr>
                    <th className="dx-th-sticky">Actions</th>
                    <th className="dx-th-sticky">Email</th>
                    <th className="dx-th-sticky">Username</th>
                    <th className="dx-th-sticky">Full Name</th>
                    <th className="dx-th-sticky">Role</th>
                    <th className="dx-th-sticky">Associated Domains</th>
                  </tr>
                </thead>

                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "40px", color: "var(--text-dim)" }}>
                        No users found
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                        <td style={{ minWidth: 80 }}>
                          <button
                            className="dx-btn dx-btn-outline"
                            onClick={() => openEditModal(u)}
                            style={{ fontSize: "0.85rem", padding: "4px 12px" }}
                          >
                            Edit
                          </button>
                        </td>
                        <td style={{ minWidth: 200 }}>{u.email}</td>
                        <td style={{ minWidth: 120 }}>{u.username}</td>
                        <td style={{ minWidth: 150 }}>{u.full_name || "—"}</td>
                        <td style={{ minWidth: 120 }}>
                          <span
                            style={{
                              padding: "4px 12px",
                              borderRadius: "8px",
                              fontSize: "0.85rem",
                              fontWeight: "500",
                              backgroundColor:
                                u.role === "superadmin"
                                  ? "rgba(251, 191, 36, 0.2)"
                                  : u.role === "admin"
                                  ? "rgba(96, 165, 250, 0.2)"
                                  : "rgba(156, 163, 175, 0.2)",
                              color:
                                u.role === "superadmin"
                                  ? "#fbbf24"
                                  : u.role === "admin"
                                  ? "#60a5fa"
                                  : "#9ca3af",
                            }}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td style={{ minWidth: 250 }}>
                          {u.role === "admin" || u.role === "superadmin" ? (
                            u.domains && u.domains.length > 0 ? (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                {u.domains.map((domain) => (
                                  <span
                                    key={domain.domain_ID}
                                    style={{
                                      padding: "4px 10px",
                                      backgroundColor: "rgba(139, 92, 246, 0.2)",
                                      color: "#a78bfa",
                                      borderRadius: "6px",
                                      fontSize: "0.8rem",
                                      fontWeight: "500",
                                    }}
                                  >
                                    {domain.domain_name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span style={{ color: "var(--text-dim)", fontSize: "0.9rem" }}>No domains</span>
                            )
                          ) : (
                            <span style={{ color: "var(--text-dim)", fontSize: "0.9rem" }}>N/A</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.08)", color: "var(--text-dim)", fontSize: "0.9rem" }}>
              <div style={{ display: "flex", gap: 24 }}>
                <span>Total Users: {users.length}</span>
                <span>Admins: {users.filter((u) => u.role === "admin").length}</span>
                <span>Superadmins: {users.filter((u) => u.role === "superadmin").length}</span>
                <span>Regular Users: {users.filter((u) => u.role === "user").length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit User Modal */}
      {isEditModalOpen && editingUser && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={closeEditModal}
        >
          <div
            className="dx-card"
            style={{
              width: "90%",
              maxWidth: "600px",
              maxHeight: "80vh",
              overflow: "auto",
              padding: "24px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ color: "var(--accent)", marginBottom: 20 }}>
              Edit User: {editingUser.email}
            </h2>

            {updateError && (
              <div
                style={{
                  padding: "12px",
                  backgroundColor: "rgba(239, 68, 68, 0.2)",
                  color: "#f87171",
                  borderRadius: "8px",
                  marginBottom: 16,
                }}
              >
                {updateError}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", marginBottom: 8, color: "var(--text-main)" }}>
                  First Name
                </label>
                <input
                  className="dx-input"
                  type="text"
                  value={editFormData.first_name}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, first_name: e.target.value })
                  }
                  placeholder="First name"
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: 8, color: "var(--text-main)" }}>
                  Last Name
                </label>
                <input
                  className="dx-input"
                  type="text"
                  value={editFormData.last_name}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, last_name: e.target.value })
                  }
                  placeholder="Last name"
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: 8, color: "var(--text-main)" }}>
                  Role
                </label>
                <select
                  className="dx-input"
                  value={editFormData.role}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, role: e.target.value })
                  }
                  style={{ width: "100%" }}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Superadmin</option>
                </select>
              </div>

              {(editFormData.role === "admin" || editFormData.role === "superadmin") && (
                <div>
                  <label style={{ display: "block", marginBottom: 8, color: "var(--text-main)" }}>
                    Associated Domains
                  </label>
                  <div
                    style={{
                      maxHeight: "200px",
                      overflow: "auto",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      padding: "12px",
                    }}
                  >
                    {allDomains.length === 0 ? (
                      <div style={{ color: "var(--text-dim)" }}>No domains available</div>
                    ) : (
                      allDomains.map((domain) => (
                        <label
                          key={domain.domain_ID}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            padding: "8px",
                            cursor: "pointer",
                            borderRadius: "6px",
                            marginBottom: "4px",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "transparent";
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={editFormData.domain_ids.includes(domain.domain_ID)}
                            onChange={() => toggleDomain(domain.domain_ID)}
                            style={{ marginRight: "10px", cursor: "pointer" }}
                          />
                          <span style={{ color: "var(--text-main)" }}>{domain.domain_name}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button
                  className="dx-btn dx-btn-primary"
                  onClick={handleUpdateUser}
                  disabled={updateLoading}
                  style={{ flex: 1 }}
                >
                  {updateLoading ? "Updating..." : "Update User"}
                </button>
                <button
                  className="dx-btn dx-btn-outline"
                  onClick={closeEditModal}
                  disabled={updateLoading}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
