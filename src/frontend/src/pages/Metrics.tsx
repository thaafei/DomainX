import React, { useEffect, useMemo, useRef, useLayoutEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../config/api";

interface Metric {
  metric_ID: string;
  metric_name: string;
  value_type: string;
  option_category?: string | null;
  rule?: string | null;
  category?: string | null;
  description?: string | null;
  weight?: number;
}

type ModalMode = "create" | "edit" | null;

const MetricsPage: React.FC = () => {
  const navigate = useNavigate();

  const [metrics, setMetrics] = useState<Metric[]>([]);

  const [rulesData, setRulesData] = useState<any>(null);
  const [categories, setCategories] = useState<string[]>([]);

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const isModalOpen = modalMode !== null;

  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("float");
  const [newCategory, setNewCategory] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [selectedOptionCategory, setSelectedOptionCategory] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("float");
  const [editCategory, setEditCategory] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editOptionCategory, setEditOptionCategory] = useState("");
  const [editTemplate, setEditTemplate] = useState("");

  const firstColRef = useRef<HTMLTableCellElement>(null);
  const [offset, setOffset] = useState(0);

  useLayoutEffect(() => {
    if (firstColRef.current) {
      const width = firstColRef.current.getBoundingClientRect().width;
      setOffset(width);
    }
  }, [metrics]);

  useEffect(() => {
    const fetchRules = async () => {
      try {
        const response = await fetch(apiUrl("/metrics/rules/"));
        const data = await response.json();
        setRulesData(data);
      } catch (error) {
        console.error("Error fetching metric rules:", error);
      }
    };
    fetchRules();
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(apiUrl("/metrics/categories/"));
        const data = await response.json();
        setCategories(Array.isArray(data?.Categories) ? data.Categories : []);
      } catch (error) {
        console.error("Error fetching metric categories:", error);
      }
    };
    fetchCategories();
  }, []);

  const loadMetrics = async () => {
    try {
      const res = await fetch(apiUrl("/metrics/"), { credentials: "include" });
      const data = await res.json();

      const uniqueMetricsMap = new Map<string, Metric>();
      (Array.isArray(data) ? data : []).forEach((metric: Metric) => {
        uniqueMetricsMap.set(metric.metric_ID, metric);
      });
      setMetrics(Array.from(uniqueMetricsMap.values()));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  const isRuleType = (t: string) => t === "bool" || t === "range";

  const getAvailableCategoriesForType = (type: string) => {
    if (!rulesData) return {};
    if (type === "bool") return rulesData.bool || {};
    if (type === "range") return rulesData.range || {};
    return {};
  };

  useMemo(() => {
    return getAvailableCategoriesForType(newType);
  }, [rulesData, newType]);

  useEffect(() => {
    setSelectedOptionCategory("");
    setSelectedTemplate("");
  }, [newType]);

  const onEditTypeChange = (newVal: string) => {
    setEditType(newVal);
    setEditOptionCategory("");
    setEditTemplate("");
  };

  const openCreateModal = () => {
    setModalMode("create");
    setNewName("");
    setNewType("float");
    setNewCategory("");
    setNewDesc("");
    setSelectedOptionCategory("");
    setSelectedTemplate("");
  };

  const openEditModal = (m: Metric) => {
    setModalMode("edit");
    setEditingId(m.metric_ID);
    setEditName(m.metric_name || "");
    setEditType(m.value_type || "float");
    setEditCategory(m.category || "");
    setEditDesc(m.description || "");
    setEditOptionCategory(m.option_category || "");
    setEditTemplate(m.rule || "");
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingId(null);
  };

  const addMetric = async (): Promise<boolean> => {
    if (!newName.trim()) return false;

    const payload: any = {
      metric_name: newName.trim(),
      value_type: newType,
      category: newCategory.trim() || null,
      description: newDesc.trim() || null,
    };

    if (isRuleType(newType)) {
      if (!selectedOptionCategory) return false;
      if (!selectedTemplate) return false;
      payload.option_category = selectedOptionCategory;
      payload.rule = selectedTemplate;
    } else {
      payload.option_category = null;
      payload.rule = null;
    }

    try {
      const res = await fetch(apiUrl("/metrics/"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const responseBody = await res.text();
      if (!res.ok) {
        let errorMsg = responseBody;
        try {
          const errorJson = JSON.parse(responseBody);
          errorMsg = errorJson.detail || errorJson.error || responseBody;
        } catch {}
        throw new Error(`API Error (${res.status}): ${errorMsg}`);
      }

      const data = JSON.parse(responseBody);

      setMetrics((prev) => {
        const map = new Map(prev.map((x) => [x.metric_ID, x]));
        map.set(data.metric_ID, data);
        return Array.from(map.values());
      });

      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const saveEdit = async (): Promise<boolean> => {
    if (!editingId) return false;
    if (!editName.trim()) return false;

    const payload: any = {
      metric_name: editName.trim(),
      value_type: editType,
      category: editCategory.trim() || null,
      description: editDesc.trim() || null,
    };

    if (isRuleType(editType)) {
      if (!editOptionCategory) return false;
      if (!editTemplate) return false;
      payload.option_category = editOptionCategory;
      payload.rule = editTemplate;
    } else {
      payload.option_category = null;
      payload.rule = null;
    }

    try {
      const res = await fetch(apiUrl(`/metrics/${editingId}/`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const responseBody = await res.text();
      if (!res.ok) {
        let errorMsg = responseBody;
        try {
          const errorJson = JSON.parse(responseBody);
          errorMsg = errorJson.detail || errorJson.error || responseBody;
        } catch {}
        throw new Error(`API Error (${res.status}): ${errorMsg}`);
      }

      const updated = JSON.parse(responseBody);

      setMetrics((prev) => {
        const map = new Map(prev.map((x) => [x.metric_ID, x]));
        map.set(updated.metric_ID, updated);
        return Array.from(map.values());
      });

      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const deleteMetric = async (id: string) => {
    try {
      const res = await fetch(apiUrl(`/metrics/${id}/`), {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        setMetrics((prev) => prev.filter((m) => m.metric_ID !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const displayInputCategory = (m: Metric) => {
    if (!rulesData) return "—";
    if (m.value_type === "bool") {
      return rulesData?.bool?.[m.option_category || "yes_no"]?.display_name ?? "—";
    }
    if (m.value_type === "range") {
      return rulesData?.range?.[m.option_category || "file_ranges"]?.display_name ?? "—";
    }
    return "—";
  };

  const displayRulePreview = (m: Metric) => {
    if (!rulesData) return "—";
    if (m.value_type === "bool") {
      const obj = rulesData?.bool?.[m.option_category || "yes_no"]?.templates?.[m.rule || "standard"];
      return obj ? JSON.stringify(obj) : "—";
    }
    if (m.value_type === "range") {
      const obj = rulesData?.range?.[m.option_category || "file_ranges"]?.templates?.[m.rule || "standard"];
      return obj ? JSON.stringify(obj) : "—";
    }
    return "—";
  };

  const modalType = modalMode === "create" ? newType : editType;
  const modalAvailableCats = getAvailableCategoriesForType(modalType);
  const modalOptionCategory = modalMode === "create" ? selectedOptionCategory : editOptionCategory;
  const modalTemplate = modalMode === "create" ? selectedTemplate : editTemplate;

  const modalPreview =
    modalOptionCategory && modalTemplate
      ? modalAvailableCats?.[modalOptionCategory]?.templates?.[modalTemplate] ?? null
      : null;

  useEffect(() => {
    if (!isModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isModalOpen]);

  return (
    <div className="dx-bg" style={{ display: "flex", height: "100vh" }}>
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
          onClick={() => navigate("/main")}
        >
          ← Back
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
          position: "relative",
        }}
      >
        <div className="stars"></div>

        <div style={{ color: "white", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
          <h1 style={{ color: "var(--accent)", marginBottom: 14 }}>Manage Metrics</h1>

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
            <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 6 }}>
              <button className="dx-btn dx-btn-primary" onClick={openCreateModal}>
                Add New Metric
              </button>
            </div>

            <div className="dx-table-wrap dx-table-scroll" style={{ flex: 1, minHeight: 0 }}>
              <table className="dx-table">
                <thead>
                  <tr>
                    <th ref={firstColRef} className="dx-th-sticky dx-sticky-left" style={{ left: 0 }}>
                      Actions
                    </th>
                    <th className="dx-th-sticky dx-sticky-left" style={{ left: offset }}>
                      Name
                    </th>
                    <th className="dx-th-sticky">Type</th>
                    <th className="dx-th-sticky">Input Category</th>
                    <th className="dx-th-sticky">Scoring Rule</th>
                    <th className="dx-th-sticky">Category</th>
                    <th className="dx-th-sticky">Description</th>
                  </tr>
                </thead>

                <tbody>
                  {metrics.map((m) => (
                    <tr key={m.metric_ID} style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      <td className="dx-sticky-left" style={{ left: 0 }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button className="dx-btn dx-btn-outline" onClick={() => openEditModal(m)}>
                            Edit
                          </button>
                          <button
                            className="dx-btn dx-btn-outline"
                            style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
                            onClick={() => deleteMetric(m.metric_ID)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>

                      <td
                        className="dx-sticky-left"
                        style={{
                          left: offset,
                          minWidth: 120,
                          maxWidth: 180,
                          whiteSpace: "normal",
                          overflowWrap: "anywhere",
                          wordBreak: "break-word",
                        }}
                      >
                        {m.metric_name}
                      </td>

                      <td
                        style={{
                          minWidth: 60,
                          maxWidth: 90,
                          whiteSpace: "normal",
                          overflowWrap: "anywhere",
                          wordBreak: "break-word",
                        }}
                      >
                        {m.value_type}
                      </td>

                      <td
                        style={{
                          minWidth: 120,
                          maxWidth: 220,
                          whiteSpace: "normal",
                          overflowWrap: "anywhere",
                          wordBreak: "break-word",
                        }}
                      >
                        {displayInputCategory(m)}
                      </td>

                      <td
                        style={{
                          minWidth: 160,
                          maxWidth: 320,
                          whiteSpace: "normal",
                          overflowWrap: "anywhere",
                          wordBreak: "break-word",
                        }}
                      >
                        <code style={{ display: "block", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                          {displayRulePreview(m)}
                        </code>
                      </td>

                      <td
                        style={{
                          minWidth: 120,
                          maxWidth: 220,
                          whiteSpace: "normal",
                          overflowWrap: "anywhere",
                          wordBreak: "break-word",
                        }}
                      >
                        {m.category || "—"}
                      </td>

                      <td
                        style={{
                          minWidth: 160,
                          maxWidth: 280,
                          whiteSpace: "normal",
                          overflowWrap: "anywhere",
                          wordBreak: "break-word",
                        }}
                      >
                        {m.description || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {metrics.length === 0 && <div style={{ padding: 20, opacity: 0.6 }}>No metrics yet.</div>}
            </div>
          </div>
        </div>

        {isModalOpen && (
          <div
            className="dx-backdrop"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeModal();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(0, 0, 0, 0.6)",
              zIndex: 9999,
            }}
          >
            <div
              className="dx-card"
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                width: "min(900px, 92vw)",
                maxHeight: "85vh",
                overflow: "auto",
                padding: 18,
                position: "relative",
                background: "rgba(18, 18, 26, 0.98)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 16,
                boxShadow: "0px 10px 25px rgba(0, 0, 0, 0.2)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 14,
                }}
              >
                <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--accent)" }}>
                  {modalMode === "create" ? "Add New Metric" : "Edit Metric"}
                </div>

                <button
                  className="dx-btn dx-btn-outline"
                  onClick={closeModal}
                  aria-label="Close"
                  style={{ padding: "6px 10px" }}
                >
                  ✕
                </button>
              </div>
            <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ opacity: 0.85 }}>Metric Name</label>
                  <input
                    className="dx-input"
                    value={modalMode === "create" ? newName : editName}
                    onChange={(e) =>
                      modalMode === "create" ? setNewName(e.target.value) : setEditName(e.target.value)
                    }
                    maxLength={100}
                    placeholder="e.g. Commits (Last 5 Years)"
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ opacity: 0.85 }}>Type</label>
                  <select
                    className="dx-input"
                    value={modalMode === "create" ? newType : editType}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (modalMode === "create") setNewType(val);
                      else onEditTypeChange(val);
                    }}
                  >
                    <option value="float" style={{ color: "black" }}>
                      Float
                    </option>
                    <option value="int" style={{ color: "black" }}>
                      Integer
                    </option>
                    <option value="bool" style={{ color: "black" }}>
                      Boolean
                    </option>
                    <option value="range" style={{ color: "black" }}>
                      Range
                    </option>
                    <option value="text" style={{ color: "black" }}>
                      Text
                    </option>
                  </select>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ opacity: 0.85 }}>Category (optional)</label>
                  <select
                    className="dx-input"
                    value={modalMode === "create" ? newCategory : editCategory}
                    onChange={(e) =>
                      modalMode === "create" ? setNewCategory(e.target.value) : setEditCategory(e.target.value)
                    }
                    style={{ borderColor: "var(--accent)" }}
                  >
                    <option value="">-- Select Category --</option>
                    {categories.map((catName) => (
                      <option key={catName} value={catName} style={{ color: "black" }}>
                        {catName}
                      </option>
                    ))}
                  </select>
                </div>

                <div />

                {isRuleType(modalType) && (
                  <div
                    style={{
                      gridColumn: "1 / -1",
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: 12,
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <label style={{ opacity: 0.85 }}>Input Category</label>
                      <select
                        className="dx-input"
                        value={modalMode === "create" ? selectedOptionCategory : editOptionCategory}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (modalMode === "create") {
                            setSelectedOptionCategory(v);
                            setSelectedTemplate("");
                          } else {
                            setEditOptionCategory(v);
                            setEditTemplate("");
                          }
                        }}
                        style={{ borderColor: "var(--accent)" }}
                      >
                        <option value="">-- Select Input Category --</option>
                        {Object.entries(modalAvailableCats).map(([key, cat]: [string, any]) => (
                          <option key={key} value={key} style={{ color: "black" }}>
                            {cat.display_name || key}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <label style={{ opacity: 0.85 }}>Scoring Rule (template)</label>
                      <select
                        className="dx-input"
                        value={modalMode === "create" ? selectedTemplate : editTemplate}
                        onChange={(e) =>
                          modalMode === "create" ? setSelectedTemplate(e.target.value) : setEditTemplate(e.target.value)
                        }
                        disabled={!modalOptionCategory}
                        style={{ backgroundColor: "rgba(var(--accent-rgb), 0.1)" }}
                      >
                        <option value="">-- Select Template --</option>
                        {(modalOptionCategory
                          ? Object.keys(modalAvailableCats?.[modalOptionCategory]?.templates || {})
                          : []
                        ).map((tKey) => (
                          <option key={tKey} value={tKey} style={{ color: "black" }}>
                            {tKey.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                    </div>

                    {modalPreview && (
                      <div
                        style={{
                          gridColumn: "1 / -1",
                          padding: "10px 12px",
                          border: "1px dashed var(--accent)",
                          borderRadius: 10,
                          background: "rgba(255,255,255,0.03)",
                          color: "var(--accent)",
                          overflowWrap: "anywhere",
                        }}
                      >
                        <div style={{ fontSize: "0.85rem", marginBottom: 6, opacity: 0.9 }}>Rule Preview</div>
                        <code style={{ display: "block", whiteSpace: "pre-wrap", color: "inherit" }}>
                          {JSON.stringify(modalPreview, null, 2)}
                        </code>
                      </div>
                    )}
                  </div>
                )}
                <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ opacity: 0.85 }}>Description (optional)</label>
                  <textarea
                    className="dx-input"
                    value={modalMode === "create" ? newDesc : editDesc}
                    onChange={(e) =>
                      modalMode === "create" ? setNewDesc(e.target.value) : setEditDesc(e.target.value)
                    }
                    placeholder="Description…"
                    rows={4}
                    style={{
                      resize: "vertical",
                      minHeight: 110,
                      paddingTop: 10,
                      lineHeight: 1.35,
                      borderColor: "rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.03)",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
                <button className="dx-btn dx-btn-outline" onClick={closeModal}>
                  Cancel
                </button>
                <button
                  className="dx-btn dx-btn-primary"
                  onClick={async () => {
                    const ok = modalMode === "create" ? await addMetric() : await saveEdit();
                    if (ok) closeModal();
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricsPage;
