import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiUrl } from "../config/api";
import SuccessNotification from "../components/SuccessNotification";
import { ArrowLeft } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";

interface Library {
  library_ID: string;
  library_name: string;
  github_url: string | null;
  url: string | null;
  programming_language: string;
}

const clamp2Style: React.CSSProperties = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

const clamp3Style: React.CSSProperties = {
  display: "-webkit-box",
  WebkitLineClamp: 3,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

const cellBaseStyle: React.CSSProperties = {
  padding: "9px 10px",
  verticalAlign: "top",
  fontSize: 13.5,
  lineHeight: 1.4,
  overflowWrap: "anywhere",
};

const metricCellStyle: React.CSSProperties = {
  ...cellBaseStyle,
  color: "rgba(255,255,255,0.9)",
};

const headerCellStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 10px",
  fontSize: 13,
  lineHeight: 1.3,
  fontWeight: 700,
  color: "rgba(255,255,255,0.92)",
  background: "rgba(20, 24, 38, 0.96)",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  overflowWrap: "anywhere",
};

const ErrorNotification: React.FC<{ show: boolean; message: string }> = ({
  show,
  message,
}) => {
  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 18,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10001,
        background: "rgba(255, 77, 79, 0.92)",
        border: "1px solid rgba(255,255,255,0.18)",
        color: "white",
        padding: "12px 16px",
        borderRadius: 12,
        boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
        maxWidth: "min(720px, calc(100vw - 32px))",
        fontWeight: 700,
        letterSpacing: 0.2,
      }}
    >
      {message}
    </div>
  );
};

const AddLibraryPage: React.FC = () => {
  const { domainId } = useParams<{ domainId: string }>();
  const DOMAIN_ID = domainId;
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [pageError, setPageError] = useState<string>("");
  
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState<string>("");
  const [name, setName] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [url, setUrl] = useState("");
  const [language, setLanguage] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);

  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [fail, setFail] = useState(false);
  const [failMessage, setFailMessage] = useState("");

  useEffect(() => {
    if (!user) {
      navigate("/login", { 
        state: { from: `/libraries/${domainId}` }
      });
    }
  }, [user, navigate, domainId]);

  useEffect(() => {
    if (!DOMAIN_ID || !user) return;
    document.title = "DomainX – Libraries";
    loadLibraries();
  }, [DOMAIN_ID, user]);
  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 1500);
  };

  const showFail = (msg: string) => {
    setFailMessage(msg);
    setFail(true);
    setTimeout(() => setFail(false), 2200);
  };

  if (!user) {
    return (
      <div className="dx-bg" style={{ display: "flex", height: "100vh", justifyContent: "center", alignItems: "center" }}>
        <div>Redirecting to login...</div>
      </div>
    );
  }


  const getErrorMessage = (data: any, fallback: string) => {
    if (!data) return fallback;

    if (typeof data === "string") return data;
    if (data.detail) return data.detail;
    if (data.error) return data.error;

    if (data.library_name) {
      return Array.isArray(data.library_name)
        ? data.library_name[0]
        : data.library_name;
    }

    if (data.github_url) {
      return Array.isArray(data.github_url)
        ? data.github_url[0]
        : data.github_url;
    }

    if (data.url) {
      return Array.isArray(data.url) ? data.url[0] : data.url;
    }

    if (data.domain) {
      return Array.isArray(data.domain) ? data.domain[0] : data.domain;
    }

    const firstKey = Object.keys(data)[0];
    if (firstKey) {
      const value = data[firstKey];
      if (Array.isArray(value)) return value[0];
      if (typeof value === "string") return value;
    }

    return fallback;
  };
  
  const closeModal = () => {
    setModalOpen(false);
    setFormError("");
    setName("");
    setGithubUrl("");
    setUrl("");
    setLanguage("");
    setEditingId(null);
  };

  const openCreateModal = () => {
    setFormError("");
    setName("");
    setGithubUrl("");
    setUrl("");
    setLanguage("");
    setEditingId(null);
    setModalOpen(true);
  };

  const openEditModal = (lib: Library) => {
    setFormError("");
    setName(lib.library_name || "");
    setGithubUrl(lib.github_url || "");
    setUrl(lib.url || "");
    setLanguage(lib.programming_language || "");
    setEditingId(lib.library_ID);
    setModalOpen(true);
  };

  const loadLibraries = async () => {
    try {
      setPageError("");

      const res = await fetch(apiUrl(`/libraries/by_domain/${DOMAIN_ID}/`), {
        credentials: "include",
      });

      const responseText = await res.text();
      if (!res.ok) throw new Error(`Server Error (${res.status})`);

      const data = JSON.parse(responseText);
      setLibraries(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setPageError("Failed to load libraries.");
      showFail("Failed to load libraries.");
    }
  };

  const validateForm = () => {
    if (!name.trim()) {
      setFormError("Library name is required.");
      return false;
    }

    if (!githubUrl.trim()) {
      setFormError("GitHub URL is required.");
      return false;
    }

    const githubRepoRegex =
      /^(https?:\/\/)?(www\.)?github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/;

    if (!githubRepoRegex.test(githubUrl.trim())) {
      setFormError(
        "GitHub URL must be a valid GitHub repository (e.g., https://github.com/user/repo)."
      );
      return false;
    }

    if (url.trim()) {
      try {
        new URL(url.trim());
      } catch {
        setFormError("URL must be a valid website link.");
        return false;
      }
    }

    return true;
  };

  const addLibrary = async () => {
    if (!validateForm()) return;

    const payload = {
      library_name: name.trim(),
      github_url: githubUrl.trim() || null,
      url: url.trim() || null,
      programming_language: language.trim(),
      domain: DOMAIN_ID,
    };

    try {
      setFormError("");

      const res = await fetch(apiUrl("/libraries/"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {}

      if (!res.ok) {
        const msg = getErrorMessage(data, "Create failed.");
        setFormError(msg);
        return;
      }

      const created = data?.library;
      if (created?.library_ID) {
        setLibraries((prev) => [created, ...prev]);
      } else {
        await loadLibraries();
      }

      showSuccess("Library created successfully!");
      closeModal();
    } catch (err) {
      console.error(err);
      const msg = "Something went wrong. Please try again.";
      setFormError(msg);
    }
  };

  const updateLibrary = async () => {
    if (!editingId) return;
    if (!validateForm()) return;

    const payload = {
      library_name: name.trim(),
      github_url: githubUrl.trim() || null,
      url: url.trim() || null,
      programming_language: language.trim(),
      domain: DOMAIN_ID,
    };

    try {
      setFormError("");

      const res = await fetch(apiUrl(`/libraries/${editingId}/`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {}

      if (!res.ok) {
        const msg = getErrorMessage(data, "Update failed.");
        setFormError(msg);
        return;
      }

      const updated = data?.library;
      if (updated?.library_ID) {
        setLibraries((prev) =>
          prev.map((l) => (l.library_ID === updated.library_ID ? updated : l))
        );
      } else {
        await loadLibraries();
      }

      showSuccess("Library updated successfully!");
      closeModal();
    } catch (err) {
      console.error(err);
      setFormError("Failed to update library.");
    }
  };

  const deleteLibrary = async (id: string) => {
    try {
      const res = await fetch(apiUrl(`/libraries/${id}/`), {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        setLibraries((prev) => prev.filter((l) => l.library_ID !== id));
        showSuccess("Library deleted successfully!");
      } else {
        const text = await res.text();
        showFail(text || "Failed to delete library.");
      }
    } catch (err) {
      console.error(err);
      showFail("Failed to delete library.");
    }
  };

  const handleSave = () => {
    if (editingId) updateLibrary();
    else addLibrary();
  };

  return (
    <div className="dx-bg" style={{ display: "flex", height: "100vh" }}>
      <SuccessNotification show={success} message={successMessage} />
      <ErrorNotification show={fail} message={failMessage} />

      <div
        className="dx-card"
        style={{
          width: 120,
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
          onClick={() => navigate(`/comparison-tool/${domainId}`)}
        >
          <ArrowLeft size={18} />
          Back
        </button>
      </div>

      <div
        style={{
          flex: 1,
          padding: "28px 32px",
          color: "white",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          minHeight: 0,
          position: "relative",
        }}
      >
        <div className="stars"></div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 18,
          }}
        >
          <h1 style={{ color: "var(--accent)", margin: 0 }}>Libraries</h1>
          <div style={{ flexGrow: 1 }} />
        </div>

        {pageError && (
          <div
            style={{
              marginBottom: 14,
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(255, 77, 79, 0.35)",
              background: "rgba(255, 77, 79, 0.12)",
              color: "#ffb3b3",
              fontSize: "0.95rem",
            }}
          >
            {pageError}
          </div>
        )}

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
          <div
            style={{
              display: "flex",
              justifyContent: "flex-start",
              marginBottom: 10,
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <button className="dx-btn dx-btn-primary" onClick={openCreateModal}>
              + Add New Library
            </button>
          </div>

          <div
            className="dx-table-wrap dx-table-scroll"
            style={{ flex: 1, minHeight: 0 }}
          >
            <table
              className="dx-table"
              style={{
                tableLayout: "fixed",
                width: "100%",
                borderCollapse: "separate",
                borderSpacing: 0,
              }}
            >
              <thead>
                <tr>
                  <th
                    className="dx-th-sticky"
                    style={{
                      ...headerCellStyle,
                      width: 220,
                      minWidth: 220,
                      maxWidth: 220,
                    }}
                  >
                    Name
                  </th>
                  <th
                    className="dx-th-sticky"
                    style={{
                      ...headerCellStyle,
                      width: 150,
                      minWidth: 150,
                      maxWidth: 150,
                    }}
                  >
                    Language
                  </th>
                  <th
                    className="dx-th-sticky"
                    style={{
                      ...headerCellStyle,
                      width: 260,
                      minWidth: 260,
                      maxWidth: 260,
                    }}
                  >
                    GitHub URL
                  </th>
                  <th
                    className="dx-th-sticky"
                    style={{
                      ...headerCellStyle,
                      width: 260,
                      minWidth: 260,
                      maxWidth: 260,
                    }}
                  >
                    URL
                  </th>
                  <th
                    className="dx-th-sticky"
                    style={{
                      ...headerCellStyle,
                      width: 210,
                      minWidth: 210,
                      maxWidth: 210,
                    }}
                  />
                </tr>
              </thead>

              <tbody>
                {libraries.map((lib, index) => (
                  <tr
                    key={lib.library_ID}
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.08)",
                      background:
                        index % 2 === 0
                          ? "rgba(255,255,255,0.01)"
                          : "rgba(255,255,255,0.025)",
                    }}
                  >
                    <td
                      style={{
                        ...cellBaseStyle,
                        fontWeight: 700,
                        fontSize: 14.5,
                        lineHeight: 1.35,
                      }}
                      title={lib.library_name}
                    >
                      <div style={clamp2Style}>{lib.library_name}</div>
                    </td>

                    <td
                      style={metricCellStyle}
                      title={lib.programming_language || "—"}
                    >
                      <div style={clamp2Style}>{lib.programming_language || "—"}</div>
                    </td>

                    <td
                      style={metricCellStyle}
                      title={lib.github_url || "—"}
                    >
                      <div style={clamp3Style}>{lib.github_url || "—"}</div>
                    </td>

                    <td
                      style={metricCellStyle}
                      title={lib.url || "—"}
                    >
                      <div style={clamp3Style}>{lib.url || "—"}</div>
                    </td>

                    <td style={{ ...cellBaseStyle, paddingTop: 8, paddingBottom: 8 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          className="dx-btn dx-btn-outline"
                          onClick={() => openEditModal(lib)}
                        >
                          Edit
                        </button>
                        <button
                          className="dx-btn dx-btn-outline"
                          style={{
                            borderColor: "var(--danger)",
                            color: "var(--danger)",
                          }}
                          onClick={() => deleteLibrary(lib.library_ID)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {libraries.length === 0 && (
              <div style={{ padding: 20, opacity: 0.6 }}>No libraries yet.</div>
            )}
          </div>
        </div>

        {modalOpen && (
          <div
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeModal();
            }}
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
              zIndex: 9999,
              padding: 16,
            }}
          >
            <div
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                background: "rgba(18, 18, 26, 0.98)",
                padding: "24px",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 16,
                width: "min(860px, 92vw)",
                maxHeight: "85vh",
                overflow: "auto",
                boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
                color: "white",
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <h2
                  style={{ margin: 0, color: "var(--accent)", fontSize: "1.25rem" }}
                >
                  {editingId ? "Edit Library" : "Add New Library"}
                </h2>
                <div style={{ flexGrow: 1 }} />
                <button
                  className="dx-btn dx-btn-outline"
                  onClick={closeModal}
                  style={{
                    width: 38,
                    height: 38,
                    padding: 0,
                    borderRadius: 10,
                    lineHeight: 1,
                  }}
                  aria-label="Close"
                  title="Close"
                >
                  ✕
                </button>
              </div>

              {formError && (
                <div
                  style={{
                    color: "#ffb3b3",
                    backgroundColor: "rgba(255,77,79,0.12)",
                    border: "1px solid rgba(255,77,79,0.35)",
                    padding: "10px 12px",
                    borderRadius: 10,
                    fontSize: "0.95rem",
                  }}
                >
                  ⚠️ {formError}
                </div>
              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "0.9rem", color: "var(--text-dim)" }}>
                    Library Name
                  </label>
                  <input
                    className="dx-input"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (formError) setFormError("");
                    }}
                    placeholder="e.g., PyTorch"
                    style={{
                      color: "white",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.18)",
                    }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "0.9rem", color: "var(--text-dim)" }}>
                    Programming Language
                  </label>
                  <input
                    className="dx-input"
                    value={language}
                    onChange={(e) => {
                      setLanguage(e.target.value);
                      if (formError) setFormError("");
                    }}
                    placeholder="e.g., Python"
                    style={{
                      color: "white",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.18)",
                    }}
                  />
                </div>

                <div
                  style={{
                    gridColumn: "1 / -1",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <label style={{ fontSize: "0.9rem", color: "var(--text-dim)" }}>
                    GitHub Repository URL
                  </label>
                  <input
                    className="dx-input"
                    value={githubUrl}
                    onChange={(e) => {
                      setGithubUrl(e.target.value);
                      if (formError) setFormError("");
                    }}
                    placeholder="https://github.com/..."
                    style={{
                      color: "white",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.18)",
                    }}
                  />
                </div>

                <div
                  style={{
                    gridColumn: "1 / -1",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <label style={{ fontSize: "0.9rem", color: "var(--text-dim)" }}>
                    URL
                  </label>
                  <input
                    className="dx-input"
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value);
                      if (formError) setFormError("");
                    }}
                    placeholder="https://pytorch.org/projects/pytorch/"
                    style={{
                      color: "white",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.18)",
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  justifyContent: "flex-end",
                  marginTop: 6,
                  flexWrap: "wrap",
                }}
              >
                <button className="dx-btn dx-btn-outline" onClick={closeModal}>
                  Cancel
                </button>
                <button className="dx-btn dx-btn-primary" onClick={handleSave}>
                  {editingId ? "Save Changes" : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddLibraryPage;