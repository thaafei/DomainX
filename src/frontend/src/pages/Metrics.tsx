import React, { useEffect, useMemo, useState, useRef, useLayoutEffect } from "react";
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

const MetricsPage: React.FC = () => {
  const navigate = useNavigate();

  const [metrics, setMetrics] = useState<Metric[]>([]);

  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("float");
  const [newCategory, setNewCategory] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [selectedOptionCategory, setSelectedOptionCategory] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");

  const [rulesData, setRulesData] = useState<any>(null);
  const [categories, setCategories] = useState<string[]>([]);

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
  }, [metrics, editingId]);

  useEffect(() => {
    setSelectedOptionCategory("");
    setSelectedTemplate("");
  }, [newType]);

  useEffect(() => {
    const fetchRules = async () => {
      try {
        const response = await fetch(apiUrl("/metric-rules/"));
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
        const response = await fetch(apiUrl("/metric-categories/"));
        const data = await response.json();
        setCategories(Array.isArray(data?.Categories) ? data.Categories : []);
      } catch (error) {
        console.error("Error fetching metric categories:", error);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
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
    loadMetrics();
  }, []);

  const isRuleType = (t: string) => t === "bool" || t === "range";

  const getAvailableCategoriesForType = (type: string) => {
    if (!rulesData) return {};
    if (type === "bool") return rulesData.bool || {};
    if (type === "range") return rulesData.range || {};
    return {};
  };

  const createAvailableCats = useMemo(() => {
    return getAvailableCategoriesForType(newType);
  }, [rulesData, newType]);

  const startEdit = (m: Metric) => {
    setEditingId(m.metric_ID);
    setEditName(m.metric_name || "");
    setEditType(m.value_type || "float");
    setEditCategory(m.category || "");
    setEditDesc(m.description || "");
    setEditOptionCategory(m.option_category || "");
    setEditTemplate(m.rule || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditType("float");
    setEditCategory("");
    setEditDesc("");
    setEditOptionCategory("");
    setEditTemplate("");
  };

  const onEditTypeChange = (newVal: string) => {
    setEditType(newVal);
    setEditOptionCategory("");
    setEditTemplate("");
  };

  const addMetric = async () => {
    if (!newName.trim()) return;

    const payload: any = {
      metric_name: newName.trim(),
      value_type: newType,
      category: newCategory.trim() || null,
      description: newDesc.trim() || null,
    };

    if (isRuleType(newType)) {
      if (!selectedOptionCategory) return;
      if (!selectedTemplate) return;
      payload.option_category = selectedOptionCategory;
      payload.rule = selectedTemplate;
    } else {
      payload.option_category = null;
      payload.rule = null;
    }

    try {
      const res = await fetch(apiUrl("/metrics/create/"), {
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

      setNewName("");
      setNewType("float");
      setNewCategory("");
      setNewDesc("");
      setSelectedOptionCategory("");
      setSelectedTemplate("");
    } catch (err) {
      console.error(err);
    }
  };

  const saveEdit = async () => {
    if (!editingId) return;
    if (!editName.trim()) return;

    const payload: any = {
      metric_name: editName.trim(),
      value_type: editType,
      category: editCategory.trim() || null,
      description: editDesc.trim() || null,
    };

    if (isRuleType(editType)) {
      if (!editOptionCategory) return;
      if (!editTemplate) return;
      payload.option_category = editOptionCategory;
      payload.rule = editTemplate;
    } else {
      payload.option_category = null;
      payload.rule = null;
    }

    try {
      const res = await fetch(apiUrl(`/metrics/${editingId}/update/`), {
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

      cancelEdit();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteMetric = async (id: string) => {
    try {
      const res = await fetch(apiUrl(`/metrics/${id}/delete/`), {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        setMetrics((prev) => prev.filter((m) => m.metric_ID !== id));
        if (editingId === id) cancelEdit();
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
      const obj =
        rulesData?.bool?.[m.option_category || "yes_no"]?.templates?.[m.rule || "standard"];
      return obj ? JSON.stringify(obj) : "—";
    }
    if (m.value_type === "range") {
      const obj =
        rulesData?.range?.[m.option_category || "file_ranges"]?.templates?.[m.rule || "standard"];
      return obj ? JSON.stringify(obj) : "—";
    }
    return "—";
  };

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
          <h1 style={{ color: "var(--accent)" }}>Manage Metrics</h1>

          <div className="dx-card" style={{ padding: 20, marginBottom: 24 }}>
            <h3>Add New Metric</h3>

            <input
              className="dx-input"
              placeholder="Metric name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={100}
              style={{ marginBottom: 10 }}
            />

            <select
              className="dx-input"
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              style={{ marginBottom: 10 }}
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

            {(newType === "bool" || newType === "range") && (
              <>
                <select
                  className="dx-input"
                  value={selectedOptionCategory}
                  onChange={(e) => {
                    setSelectedOptionCategory(e.target.value);
                    setSelectedTemplate("");
                  }}
                  style={{ marginBottom: 10, borderColor: "var(--accent)" }}
                >
                  <option value="">-- Select Input Category --</option>
                  {Object.entries(createAvailableCats).map(([key, cat]: [string, any]) => (
                    <option key={key} value={key} style={{ color: "black" }}>
                      {cat.display_name || key}
                    </option>
                  ))}
                </select>

                {selectedOptionCategory && createAvailableCats[selectedOptionCategory] && (
                  <select
                    className="dx-input"
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    style={{
                      marginBottom: 10,
                      backgroundColor: "rgba(var(--accent-rgb), 0.1)",
                    }}
                  >
                    <option value="">-- Select Scoring Rule (Template) --</option>
                    {Object.keys(createAvailableCats[selectedOptionCategory].templates || {}).map(
                      (tKey) => (
                        <option key={tKey} value={tKey} style={{ color: "black" }}>
                          {tKey.replace(/_/g, " ")}
                        </option>
                      )
                    )}
                  </select>
                )}

                {selectedTemplate &&
                  selectedOptionCategory &&
                  createAvailableCats[selectedOptionCategory] && (
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--accent)",
                        marginBottom: 10,
                        padding: "5px",
                        border: "1px dashed var(--accent)",
                      }}
                    >
                      Rule Preview:{" "}
                      {JSON.stringify(
                        createAvailableCats[selectedOptionCategory].templates[selectedTemplate]
                      )}
                    </div>
                  )}
              </>
            )}

            <select
              className="dx-input"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              style={{ marginBottom: 10, borderColor: "var(--accent)" }}
            >
              <option value="">-- Select Category (Optional) --</option>
              {categories.map((catName) => (
                <option key={catName} value={catName} style={{ color: "black" }}>
                  {catName}
                </option>
              ))}
            </select>

            <input
              className="dx-input"
              placeholder="Description (optional)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              style={{ marginBottom: 10 }}
            />

            <button className="dx-btn" onClick={addMetric}>
              Add Metric
            </button>
          </div>

          <div
              className="dx-card"
              style={{
                padding: 20,
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >

            <h3>Existing Metrics</h3>

            <div className="dx-table-wrap dx-table-scroll" style={{ flex: 1, minHeight: 0 }}>
              <table className="dx-table">
                <thead>
                  <tr>
                    <th
                      ref={firstColRef}
                      className="dx-th-sticky dx-sticky-left"
                      style={{ left: 0 }}
                    >
                      Actions
                    </th>
                    <th
                      className="dx-th-sticky dx-sticky-left"
                      style={{ left: offset }}
                    >
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
                  {metrics.map((m) => {
                    const isEditing = editingId === m.metric_ID;
                    const editAvailableCats = getAvailableCategoriesForType(editType);

                    return (
                      <tr
                        key={m.metric_ID}
                        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
                      >

                        <td className="dx-sticky-left" style={{ left: 0 }}>
                          {isEditing ? (
                            <div style={{ display: "flex", gap: 6 }}>
                              <button className="dx-btn dx-btn-primary" onClick={saveEdit}>
                                Save
                              </button>
                              <button className="dx-btn dx-btn-outline" onClick={cancelEdit}>
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: "flex", gap: 6 }}>
                              <button
                                className="dx-btn dx-btn-outline"
                                onClick={() => startEdit(m)}
                              >
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
                          )}
                        </td>
                        <td className="dx-sticky-left" style={{ left: offset, minWidth: 100, maxWidth: 160, whiteSpace: "normal", wordBreak: "break-word" }}>
                          {isEditing ? (
                            <input
                              className="dx-input"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              maxLength={100}
                            />
                          ) : (
                            m.metric_name
                          )}
                        </td>

                        <td style={{ minWidth: 40, maxWidth: 80, whiteSpace: "normal", wordBreak: "break-word" } }>
                          {isEditing ? (
                            <select
                              className="dx-input"
                              value={editType}
                              onChange={(e) => onEditTypeChange(e.target.value)}
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
                          ) : (
                            m.value_type
                          )}
                        </td>

                        <td style={{ minWidth: 80, maxWidth: 200, whiteSpace: "normal", wordBreak: "break-word" }}>
                          {isEditing ? (
                            isRuleType(editType) ? (
                              <select
                                className="dx-input"
                                value={editOptionCategory}
                                onChange={(e) => {
                                  setEditOptionCategory(e.target.value);
                                  setEditTemplate("");
                                }}
                                style={{ borderColor: "var(--accent)" }}
                              >
                                <option value="">-- Select Input Category --</option>
                                {Object.entries(editAvailableCats).map(
                                  ([key, cat]: [string, any]) => (
                                    <option key={key} value={key} style={{ color: "black" }}>
                                      {cat.display_name || key}
                                    </option>
                                  )
                                )}
                              </select>
                            ) : (
                              "—"
                            )
                          ) : (
                            displayInputCategory(m)
                          )}
                        </td>

                        <td style={{ minWidth: 60, maxWidth: 200, whiteSpace: "normal", wordBreak: "break-word" }}>

                          {isEditing ? (
                            isRuleType(editType) ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                <select
                                  className="dx-input"
                                  value={editTemplate}
                                  onChange={(e) => setEditTemplate(e.target.value)}
                                  disabled={!editOptionCategory}
                                  style={{ backgroundColor: "rgba(var(--accent-rgb), 0.1)" }}
                                >
                                  <option value="">-- Select Scoring Rule (Template) --</option>
                                  {editOptionCategory &&
                                    editAvailableCats[editOptionCategory] &&
                                    Object.keys(
                                      editAvailableCats[editOptionCategory].templates || {}
                                    ).map((tKey) => (
                                      <option key={tKey} value={tKey} style={{ color: "black" }}>
                                        {tKey.replace(/_/g, " ")}
                                      </option>
                                    ))}
                                </select>

                                {editTemplate &&
                                  editOptionCategory &&
                                  editAvailableCats[editOptionCategory] && (
                                    <div
                                      style={{
                                        fontSize: "0.8rem",
                                        color: "var(--accent)",
                                        padding: "6px 8px",
                                        border: "1px dashed var(--accent)",
                                        borderRadius: 8,
                                        background: "rgba(255,255,255,0.03)",
                                        wordBreak: "break-word",
                                      }}
                                    >
                                      Rule Preview:{" "}
                                      {JSON.stringify(
                                        editAvailableCats[editOptionCategory].templates[
                                          editTemplate
                                        ]
                                      )}
                                    </div>
                                  )}
                              </div>
                            ) : (
                              "—"
                            )
                          ) : (
                            <code style={{ whiteSpace: "pre-wrap" }}>{displayRulePreview(m)}</code>
                          )}
                        </td>

                        <td style={{ minWidth: 60, maxWidth: 200, whiteSpace: "normal", wordBreak: "break-word" }}>
                          {isEditing ? (
                            <select
                              className="dx-input"
                              value={editCategory}
                              onChange={(e) => setEditCategory(e.target.value)}
                              style={{ borderColor: "var(--accent)" }}
                            >
                              <option value="">-- Select Category (Optional) --</option>
                              {categories.map((catName) => (
                                <option key={catName} value={catName} style={{ color: "black" }}>
                                  {catName}
                                </option>
                              ))}
                            </select>
                          ) : (
                            m.category || "—"
                          )}
                        </td>

                        <td style={{ minWidth: 60, maxWidth: 260, whiteSpace: "normal", wordBreak: "break-word" }}>
                          {isEditing ? (
                            <input
                              className="dx-input"
                              value={editDesc}
                              onChange={(e) => setEditDesc(e.target.value)}
                              placeholder="Description (optional)"
                            />
                          ) : (
                            m.description || "—"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {metrics.length === 0 && (
                <div style={{ padding: 20, opacity: 0.6 }}>No metrics yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricsPage;