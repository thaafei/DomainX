import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiUrl } from "../config/api";
import SuccessNotification from "../components/SuccessNotification";
import {ArrowLeft} from "lucide-react";

interface Library {
  library_ID: string;
  library_name: string;
  url: string | null;
  programming_language: string;
}

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

  const [libraries, setLibraries] = useState<Library[]>([]);
  const [pageError, setPageError] = useState<string>("");

  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState<string>("");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [language, setLanguage] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);

  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [fail, setFail] = useState(false);
  const [failMessage, setFailMessage] = useState("");

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

  useEffect(() => {
    if (!DOMAIN_ID) return;
    document.title = "DomainX – Libraries";
    loadLibraries();
  }, [DOMAIN_ID]);

  const closeModal = () => {
    setModalOpen(false);
    setFormError("");
    setName("");
    setUrl("");
    setLanguage("");
    setEditingId(null);
  };

  const openCreateModal = () => {
    setFormError("");
    setName("");
    setUrl("");
    setLanguage("");
    setEditingId(null);
    setModalOpen(true);
  };

  const openEditModal = (lib: Library) => {
    setFormError("");
    setName(lib.library_name || "");
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
    if (!url.trim()) {
      setFormError("Github URL is required.");
      return false;
    }

    const githubRepoRegex =
      /^(https?:\/\/)?(www\.)?github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/;

    if (!githubRepoRegex.test(url.trim())) {
      setFormError(
        "URL must be a valid GitHub repository (e.g., https://github.com/user/repo)."
      );
      return false;
    }

    return true;
  };

  const addLibrary = async () => {
    if (!validateForm()) return;

    const payload = {
      library_name: name.trim(),
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
        const msg = data?.detail || data?.error || "Create failed.";
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
        const msg = data?.detail || data?.error || "Update failed.";
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
          padding: "40px 60px",
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
              marginBottom: 6,
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
              style={{ tableLayout: "fixed", width: "100%" }}
            >
              <thead>
                <tr>
                  <th
                    className="dx-th-sticky"
                    style={{ textAlign: "left", width: 280 }}
                  >
                    Name
                  </th>
                  <th
                    className="dx-th-sticky"
                    style={{ textAlign: "left", width: 180 }}
                  >
                    Language
                  </th>
                  <th
                    className="dx-th-sticky"
                    style={{
                      textAlign: "left",
                      whiteSpace: "normal",
                      wordBreak: "break-word",
                    }}
                  >
                    URL
                  </th>
                  <th className="dx-th-sticky" style={{ width: 220 }} />
                </tr>
              </thead>

              <tbody>
                {libraries.map((lib) => (
                  <tr
                    key={lib.library_ID}
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <td
                      style={{
                        padding: 10,
                        fontWeight: 600,
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                        verticalAlign: "top",
                      }}
                      title={lib.library_name}
                    >
                      {lib.library_name}
                    </td>

                    <td
                      style={{
                        padding: 10,
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                        verticalAlign: "top",
                      }}
                    >
                      {lib.programming_language || "—"}
                    </td>

                    <td
                      style={{
                        padding: 10,
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                        verticalAlign: "top",
                      }}
                      title={lib.url || ""}
                    >
                      {lib.url || "—"}
                    </td>

                    <td style={{ padding: 10, verticalAlign: "top" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                          gap: 8,
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
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
                    Repository URL
                  </label>
                  <input
                    className="dx-input"
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value);
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
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  justifyContent: "flex-end",
                  marginTop: 6,
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
