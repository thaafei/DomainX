import React, { useEffect, useMemo, useRef, useLayoutEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../config/api";
import SuccessNotification from "../components/SuccessNotification";
import { ArrowLeft } from "lucide-react";
interface Metric {
  metric_ID: string;
  metric_name: string;
  value_type: string;
  source_type?: string | null;
  metric_key?: string | null;
  option_category?: string | null;
  rule?: string | null;
  category?: string | null;
  description?: string | null;
  weight?: number;
  scoring_dict?: Record<string, number> | null;
}

interface AutoMetricOption {
  key: string;
  label: string;
  description: string;
  value_type: string;
}

interface AutoMetricOptionsResponse {
  github_api?: AutoMetricOption[];
  scc?: AutoMetricOption[];
  gitstats?: AutoMetricOption[];
}

type ModalMode = "create" | "edit" | null;

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

const clamp4Style: React.CSSProperties = {
  display: "-webkit-box",
  WebkitLineClamp: 4,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

const cellBaseStyle: React.CSSProperties = {
  padding: "7px 8px",
  verticalAlign: "top",
  fontSize: 13,
  lineHeight: 1.32,
  overflowWrap: "anywhere",
};

const metricCellStyle: React.CSSProperties = {
  ...cellBaseStyle,
  color: "rgba(255,255,255,0.9)",
};

const headerCellStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 8px",
  fontSize: 12.5,
  lineHeight: 1.25,
  fontWeight: 700,
  color: "rgba(255,255,255,0.92)",
  background: "rgba(20, 24, 38, 0.96)",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  overflowWrap: "anywhere",
};

const compactButtonStyle: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: "var(--accent)",
  cursor: "pointer",
  padding: 0,
  marginTop: 4,
  fontSize: 11.5,
  lineHeight: 1.2,
  alignSelf: "flex-start",
};

const overlayCardStyle: React.CSSProperties = {
  position: "absolute",
  top: "100%",
  left: 0,
  marginTop: 6,
  minWidth: 260,
  maxWidth: 560,
  maxHeight: 280,
  overflow: "auto",
  padding: "10px 12px",
  borderRadius: 12,
  background: "rgba(20, 24, 38, 0.98)",
  border: "1px solid rgba(255,255,255,0.12)",
  boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
  zIndex: 10020,
  color: "rgba(255,255,255,0.92)",
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
  userSelect: "text",
};
const ExpandableText: React.FC<{
  text: string;
  lines?: 2 | 3 | 4;
  emptyText?: string;
  textStyle?: React.CSSProperties;
  preserveWhitespace?: boolean;
  description?: string;
  onToggle?: (isOpen: boolean) => void;
}> = ({
  text,
  lines = 2,
  emptyText = "—",
  textStyle,
  preserveWhitespace = false,
  description,
  onToggle,
}) => {
  const [open, setOpen] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;

    const check = () => {
      setTruncated(
        el.scrollHeight > el.clientHeight + 1 ||
          el.scrollWidth > el.clientWidth + 1
      );
    };

    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [text, lines, description]);

  useEffect(() => {
    if (!open) return;

    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        onToggle?.(false);
      }
    };

    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        onToggle?.(false);
      }
    };

    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open, onToggle]);

  const showMoreButton = truncated || !!description;

  if (!text && !description) {
    return <div style={textStyle}>{emptyText}</div>;
  }

  const handleToggle = () => {
    const newState = !open;
    setOpen(newState);
    onToggle?.(newState);
  };
  const clampStyle = lines === 4 ? clamp4Style : lines === 3 ? clamp3Style : clamp2Style;
  return (
    <div
      ref={wrapRef}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        minWidth: 0,
        width: "100%",
      }}
    >
      <div
        ref={textRef}
        style={{
          ...clampStyle,
          ...textStyle,
          width: "100%",
          overflowWrap: "anywhere",
          whiteSpace: preserveWhitespace ? "pre-wrap" : undefined,
        }}
        title={open ? "" : text}
      >
        {text || emptyText}
      </div>

      {showMoreButton && (
        <button
          type="button"
          onClick={handleToggle}
          style={compactButtonStyle}
        >
          {open ? "less" : "more"}
        </button>
      )}

      {open && (
        <div
          style={{
            ...overlayCardStyle,
            whiteSpace: preserveWhitespace ? "pre-wrap" : "pre-wrap",
            fontFamily: preserveWhitespace
              ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
              : undefined,
            fontSize: preserveWhitespace ? 12.5 : undefined,
            lineHeight: preserveWhitespace ? 1.35 : undefined,
          }}
        >
          {description ? (
            <>
              <div style={{ fontWeight: 700, marginBottom: 4, color: "var(--accent)" }}>
                Value:
              </div>
              <div style={{ marginBottom: 12 }}>{text || emptyText}</div>
              <div style={{ fontWeight: 700, marginBottom: 4, color: "var(--accent)" }}>
                Description:
              </div>
              <div>{description}</div>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 8 }}>{text}</div>
              <button
                type="button"
                className="dx-btn dx-btn-outline"
                style={{ padding: "5px 8px", fontSize: 12 }}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(text);
                  } catch {}
                }}
              >
                Copy
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const MetricsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [rulesData, setRulesData] = useState<any>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [autoMetricOptions, setAutoMetricOptions] = useState<AutoMetricOptionsResponse>({});
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const isModalOpen = modalMode !== null;

  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("float");
  const [newSourceType, setNewSourceType] = useState("manual");
  const [newMetricKey, setNewMetricKey] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [selectedOptionCategory, setSelectedOptionCategory] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("float");
  const [editSourceType, setEditSourceType] = useState("manual");
  const [editMetricKey, setEditMetricKey] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editOptionCategory, setEditOptionCategory] = useState("");
  const [editTemplate, setEditTemplate] = useState("");

  const [formError, setFormError] = useState("");

  const firstColRef = useRef<HTMLTableCellElement>(null);
  const [offset, setOffset] = useState(0);

  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 1500);
  };

  useLayoutEffect(() => {
    if (firstColRef.current) {
      const width = firstColRef.current.getBoundingClientRect().width;
      setOffset(width);
    }
  }, [metrics]);

  useEffect(() => {
    document.title = "DomainX – Metrics";
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

  useEffect(() => {
    const fetchAutoMetricOptions = async () => {
      try {
        const response = await fetch(apiUrl("/metrics/auto-options/"), {
          credentials: "include",
        });
        const data = await response.json();
        setAutoMetricOptions(data || {});
      } catch (error) {
        console.error("Error fetching auto metric options:", error);
      }
    };
    fetchAutoMetricOptions();
  }, []);

  const loadMetrics = async () => {
      try {
        setLoading(true);
        const res = await fetch(apiUrl("/metrics/"), { credentials: "include" });
        const data = await res.json();

        const uniqueMetricsMap = new Map<string, Metric>();
        (Array.isArray(data) ? data : []).forEach((metric: Metric) => {
          uniqueMetricsMap.set(metric.metric_ID, metric);
        });
        setMetrics(Array.from(uniqueMetricsMap.values()));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadMetrics();
  }, []);

  const isRuleType = (t: string) => t === "bool" || t === "range" || t === "int";

  const getAvailableCategoriesForType = (type: string) => {
      if (!rulesData) return {};
      if (type === "bool") return rulesData.bool || {};
      if (type === "range") return rulesData.range || {};
      if (type === "int") return rulesData.int || {};
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
    setNewSourceType("manual");
    setNewMetricKey("");
    setNewCategory("");
    setNewDesc("");
    setSelectedOptionCategory("");
    setSelectedTemplate("");
    setFormError("");
  };

  const openEditModal = (m: Metric) => {
    setModalMode("edit");
    setEditingId(m.metric_ID);
    setEditName(m.metric_name || "");
    setEditType(m.value_type || "float");
    setEditSourceType(m.source_type || "manual");
    setEditMetricKey(m.metric_key || "");
    setEditCategory(m.category || "");
    setEditDesc(m.description || "");
    setEditOptionCategory(m.option_category || "");
    setEditTemplate(m.rule || "");
    setFormError("");
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingId(null);
    setFormError("");
  };

  const modalSourceType = modalMode === "create" ? newSourceType : editSourceType;
  const modalMetricKey = modalMode === "create" ? newMetricKey : editMetricKey;
  const modalAutoOptions = autoMetricOptions[modalSourceType as keyof AutoMetricOptionsResponse] || [];

  const getReadableErrorMessage = (err: unknown) => {
    const fallback = "Could not save metric. Please check the form and try again.";

    if (!(err instanceof Error) || !err.message) return fallback;

    const msg = err.message;
    const apiPrefix = "API Error";
    const apiIndex = msg.indexOf(": ");
    const raw = msg.startsWith(apiPrefix) && apiIndex !== -1 ? msg.slice(apiIndex + 2) : msg;

    try {
      const parsed = JSON.parse(raw);

      if (typeof parsed === "string") return parsed;

      if ((parsed as any).metric_name) {
        const metricNameError = Array.isArray((parsed as any).metric_name)
          ? (parsed as any).metric_name[0]
          : (parsed as any).metric_name;
        if (String(metricNameError).toLowerCase().includes("already exists")) {
          return "A metric with this name already exists. Please choose a different name.";
        }
        return `Metric name: ${metricNameError}`;
      }

      if ((parsed as any).metric_key) {
        const metricKeyError = Array.isArray((parsed as any).metric_key)
          ? (parsed as any).metric_key[0]
          : (parsed as any).metric_key;
        return `System metric: ${metricKeyError}`;
      }

      if ((parsed as any).non_field_errors) {
        return Array.isArray((parsed as any).non_field_errors)
          ? (parsed as any).non_field_errors[0]
          : (parsed as any).non_field_errors;
      }

      const firstValue = Object.values(parsed as Record<string, unknown>)[0];
      if (Array.isArray(firstValue) && firstValue.length > 0) return String(firstValue[0]);
      if (typeof firstValue === "string") return firstValue;

      return fallback;
    } catch {
      return raw || fallback;
    }
  };

  const modalType = modalMode === "create" ? newType : editType;
  const modalAvailableCats = getAvailableCategoriesForType(modalType);
  const modalOptionCategory = modalMode === "create" ? selectedOptionCategory : editOptionCategory;
  const modalTemplate = modalMode === "create" ? selectedTemplate : editTemplate;

  const modalPreview =
    modalOptionCategory && modalTemplate
      ? modalAvailableCats?.[modalOptionCategory]?.templates?.[modalTemplate] ?? null
      : null;
  const buildScoringDict = (type: string, preview: any) => {
      if (!preview) return null;
      if (type === "int") return null;
      return preview;
    };

  const addMetric = async (): Promise<boolean> => {
    if (!newName.trim()) {
      setFormError("Metric name is required.");
      return false;
    }

    if (newSourceType !== "manual" && !newMetricKey) {
      setFormError("Please select a system metric.");
      return false;
    }

    if (newSourceType === "manual" && isRuleType(newType)) {
      if (!selectedOptionCategory) {
        setFormError("Please select an input category.");
        return false;
      }
      if (!selectedTemplate) {
        setFormError("Please select a scoring rule.");
        return false;
      }
    }

    setFormError("");
    const scoringDict = buildScoringDict(newType, modalPreview);

    const payload: any = {
      metric_name: newName.trim(),
      value_type: newType,
      source_type: newSourceType,
      metric_key: newSourceType === "manual" ? null : newMetricKey || null,
      category: newCategory.trim() || null,
      description: newDesc.trim() || null,
      option_category: selectedOptionCategory || null,
      rule: selectedTemplate || null,
      scoring_dict: scoringDict || null,
    };

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

      showSuccess("Metric created successfully!");
      return true;
    } catch (err) {
      console.error(err);
      setFormError(getReadableErrorMessage(err));
      return false;
    }
  };

  const saveEdit = async (): Promise<boolean> => {
    if (!editingId) return false;

    if (!editName.trim()) {
      setFormError("Metric name is required.");
      return false;
    }

    if (editSourceType !== "manual" && !editMetricKey) {
      setFormError("Please select a system metric.");
      return false;
    }

    if (editSourceType === "manual" && isRuleType(editType)) {
      if (!editOptionCategory) {
        setFormError("Please select an input category.");
        return false;
      }
      if (!editTemplate) {
        setFormError("Please select a scoring rule.");
        return false;
      }
    }

    setFormError("");
    const payload: any = {
      metric_name: editName.trim(),
      value_type: editType,
      source_type: editSourceType,
      metric_key: editSourceType === "manual" ? null : editMetricKey || null,
      category: editCategory.trim() || null,
      description: editDesc.trim() || null,
    };

    if (editSourceType === "manual" && isRuleType(editType)) {
      payload.option_category = editOptionCategory;
      payload.rule = editTemplate;
      const scoringDict = buildScoringDict(editType, modalPreview);
      payload.scoring_dict = scoringDict;
    } else {
      payload.option_category = null;
      payload.rule = null;
      payload.scoring_dict = null;
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

      showSuccess("Metric updated successfully!");
      return true;
    } catch (err) {
      console.error(err);
      setFormError(getReadableErrorMessage(err));
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
        showSuccess("Metric deleted successfully!");
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
      if (m.value_type === "int") {
        return rulesData?.int?.[m.option_category || "other"]?.display_name ?? "—";
      }
      return "—";
    };

  const displayRulePreview = (m: Metric) => {
      if (!rulesData) return "—";
      if (m.value_type === "bool") {
        const obj = rulesData?.bool?.[m.option_category || "yes_no"]?.templates?.[m.rule || "standard"];
        return obj ? JSON.stringify(obj, null, 2) : "—";
      }
      if (m.value_type === "range") {
        const obj = rulesData?.range?.[m.option_category || "file_ranges"]?.templates?.[m.rule || "standard"];
        return obj ? JSON.stringify(obj, null, 2) : "—";
      }
      if (m.value_type === "int") {
        const obj = rulesData?.int?.[m.option_category || "other"]?.templates?.[m.rule || "free"];
        return obj ? JSON.stringify(obj, null, 2) : "—";
      }
      return "—";
    };

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
      <SuccessNotification show={success} message={successMessage} />

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
          onClick={() => navigate("/")}
        >
          <ArrowLeft size={18} /> Back
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
          position: "relative",
        }}
      >
        <div className="stars"></div>

        <div style={{ color: "white", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
          <h1 style={{ color: "var(--accent)", marginBottom: 14 }}>Manage Metrics</h1>

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
            <div
              style={{
                marginBottom: 12,
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <button className="dx-btn dx-btn-primary" onClick={openCreateModal}>
                + Add New Metric
              </button>
            </div>

            <div className="dx-table-wrap dx-table-scroll" style={{ flex: 1, minHeight: 0 }}>
              <table
                className="dx-table"
                style={{
                  tableLayout: "fixed",
                  width: "100%",
                }}
              >
                <thead>
                  <tr>
                    <th
                      ref={firstColRef}
                      className="dx-th-sticky dx-sticky-left"
                      style={{
                        ...headerCellStyle,
                        left: 0,
                        width: 190,
                      }}
                    >
                      Actions
                    </th>
                    <th
                      className="dx-th-sticky dx-sticky-left"
                      style={{
                        ...headerCellStyle,
                        left: offset,
                        width: 190,
                      }}
                    >
                      Name
                    </th>
                    <th
                      className="dx-th-sticky"
                      style={{
                        ...headerCellStyle,
                        width: 120,
                      }}
                    >
                      Type
                    </th>
                    <th
                      className="dx-th-sticky"
                      style={{
                        ...headerCellStyle,
                        width: 180,
                      }}
                    >
                      Input Category
                    </th>
                    <th
                      className="dx-th-sticky"
                      style={{
                        ...headerCellStyle,
                        width: 270,
                      }}
                    >
                      Scoring Rule
                    </th>
                    <th
                      className="dx-th-sticky"
                      style={{
                        ...headerCellStyle,
                        width: 180,
                      }}
                    >
                      Category
                    </th>
                    <th
                      className="dx-th-sticky"
                      style={{
                        ...headerCellStyle,
                        width: 240,
                      }}
                    >
                      Description
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {metrics.map((m, rowIndex) => {
                    const isExpanded = expandedRowId === m.metric_ID;

                    return (
                      <tr
                        key={m.metric_ID}
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.08)",
                          background:
                            rowIndex % 2 === 0
                              ? "rgba(255,255,255,0.01)"
                              : "rgba(255,255,255,0.025)",
                          position: "relative",
                          zIndex: isExpanded ? 100 : 1,
                        }}
                      >
                        <td
                          className="dx-sticky-left"
                          style={{
                            padding: "8px 8px",
                            verticalAlign: "top",
                            left: 0,
                            whiteSpace: "normal",
                            wordBreak: "break-word",
                            fontSize: 12.5,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              gap: 6,
                              alignItems: "center",
                              flexWrap: "wrap",
                            }}
                          >
                            <button
                              className="dx-btn dx-btn-outline"
                              onClick={() => openEditModal(m)}
                              style={{
                                padding: "5px 8px",
                                fontSize: 14,
                                lineHeight: 1.4,
                              }}
                            >
                              Edit
                            </button>

                            <button
                              className="dx-btn dx-btn-outline"
                              style={{
                                padding: "5px 8px",
                                fontSize: 14,
                                lineHeight: 1.4,
                                borderColor: "var(--danger)",
                                color: "var(--danger)",
                              }}
                              onClick={() => deleteMetric(m.metric_ID)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>

                        <td
                          className="dx-sticky-left"
                          style={{
                            padding: "8px 8px",
                            verticalAlign: "top",
                            left: offset,
                            fontWeight: 600,
                            whiteSpace: "normal",
                            wordBreak: "break-word",
                            fontSize: 14,
                            lineHeight: 1.4,
                          }}
                          title={m.metric_name}
                        >
                          <ExpandableText
                            text={m.metric_name || ""}
                            lines={2}
                            onToggle={(isOpen) => setExpandedRowId(isOpen ? m.metric_ID : null)}
                            textStyle={{
                              fontWeight: 600,
                              fontSize: 12.75,
                              lineHeight: 1.28,
                            }}
                          />
                        </td>

                        <td
                          style={{
                            ...metricCellStyle,
                            whiteSpace: "normal",
                            wordBreak: "break-word",
                            position: "relative",
                          }}
                          title={m.value_type}
                        >
                          <ExpandableText
                            text={m.value_type || ""}
                            lines={2}
                            emptyText="—"
                            onToggle={(isOpen) => setExpandedRowId(isOpen ? m.metric_ID : null)}
                          />
                        </td>

                        <td
                          style={{
                            ...metricCellStyle,
                            whiteSpace: "normal",
                            wordBreak: "break-word",
                            position: "relative",
                          }}
                          title={displayInputCategory(m)}
                        >
                          <ExpandableText
                            text={displayInputCategory(m)}
                            lines={3}
                            emptyText="—"
                            onToggle={(isOpen) => setExpandedRowId(isOpen ? m.metric_ID : null)}
                          />
                        </td>

                        <td
                          style={{
                            ...metricCellStyle,
                            whiteSpace: "normal",
                            wordBreak: "break-word",
                            position: "relative",
                          }}
                          title={displayRulePreview(m)}
                        >
                          <ExpandableText
                            text={displayRulePreview(m)}
                            lines={4}
                            emptyText="—"
                            preserveWhitespace
                            description={m.description ? String(m.description) : undefined}
                            onToggle={(isOpen) => setExpandedRowId(isOpen ? m.metric_ID : null)}
                            textStyle={{
                              fontFamily:
                                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                              fontSize: 12.5,
                              lineHeight: 1.35,
                              color: "inherit",
                            }}
                          />
                        </td>

                        <td
                          style={{
                            ...metricCellStyle,
                            whiteSpace: "normal",
                            wordBreak: "break-word",
                            position: "relative",
                          }}
                          title={m.category || "—"}
                        >
                          <ExpandableText
                            text={m.category || ""}
                            lines={3}
                            emptyText="—"
                            onToggle={(isOpen) => setExpandedRowId(isOpen ? m.metric_ID : null)}
                          />
                        </td>

                        <td
                          style={{
                            ...metricCellStyle,
                            whiteSpace: "normal",
                            wordBreak: "break-word",
                            position: "relative",
                          }}
                          title={m.description || "—"}
                        >
                          <ExpandableText
                            text={m.description || ""}
                            lines={3}
                            emptyText="—"
                            onToggle={(isOpen) => setExpandedRowId(isOpen ? m.metric_ID : null)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {loading ? (
                  <div
                        style={{
                          padding: 20,
                          opacity: 0.7,
                          color: "rgba(255,255,255,0.75)",
                        }}
                      >
                        Just a moment
                      </div>
                ) : metrics.length === 0 ? (
                  <div style={{ padding: 20, opacity: 0.6 }}>No metrics yet.</div>
                ) : null}
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
                  gap: 12,
                  minWidth: 0,
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

              {formError && (
                <div
                  style={{
                    marginBottom: 12,
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(255, 99, 99, 0.45)",
                    background: "rgba(255, 99, 99, 0.10)",
                    color: "#ffb3b3",
                    fontSize: "0.95rem",
                  }}
                >
                  {formError}
                </div>
              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ opacity: 0.85 }}>Metric Name</label>
                  <input
                    className="dx-input"
                    value={modalMode === "create" ? newName : editName}
                    onChange={(e) => {
                      setFormError("");
                      modalMode === "create" ? setNewName(e.target.value) : setEditName(e.target.value);
                    }}
                    maxLength={100}
                    placeholder="e.g. Commits (Last 5 Years)"
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ opacity: 0.85 }}>Source Type</label>
                  <select
                    className="dx-input"
                    value={modalMode === "create" ? newSourceType : editSourceType}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormError("");

                      if (modalMode === "create") {
                        setNewSourceType(val);
                        setNewMetricKey("");
                        setSelectedOptionCategory("");
                        setSelectedTemplate("");
                        if (val === "manual") {
                          setNewType("float");
                          setNewDesc("");
                        }
                      } else {
                        setEditSourceType(val);
                        setEditMetricKey("");
                        setEditOptionCategory("");
                        setEditTemplate("");
                        if (val === "manual") {
                          setEditType("float");
                          setEditDesc("");
                        }
                      }
                    }}
                  >
                    <option value="manual" className="dx-input-select">
                      Manual
                    </option>
                    <option value="github_api" className="dx-input-select">
                      GitHub API
                    </option>
                    <option value="scc" className="dx-input-select">
                      SCC
                    </option>
                    <option value="gitstats" className="dx-input-select">
                      GitStats
                    </option>
                  </select>
                </div>

                {modalSourceType !== "manual" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ opacity: 0.85 }}>System Metric</label>
                    <select
                      className="dx-input"
                      value={modalMetricKey}
                      onChange={(e) => {
                        const selectedKey = e.target.value;
                        const selectedOption = modalAutoOptions.find((x) => x.key === selectedKey);
                        setFormError("");

                        if (modalMode === "create") {
                          setNewMetricKey(selectedKey);
                          setSelectedOptionCategory("");
                          setSelectedTemplate("");
                          if (selectedOption) {
                            setNewType(selectedOption.value_type);
                            setNewDesc(selectedOption.description || "");
                          }
                        } else {
                          setEditMetricKey(selectedKey);
                          setEditOptionCategory("");
                          setEditTemplate("");
                          if (selectedOption) {
                            setEditType(selectedOption.value_type);
                            setEditDesc(selectedOption.description || "");
                          }
                        }
                      }}
                    >
                      <option value="">-- Select System Metric --</option>
                      {modalAutoOptions.map((opt) => (
                        <option key={opt.key} value={opt.key} className="dx-input-select">
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ opacity: 0.85 }}>Type</label>
                  <select
                    className="dx-input"
                    value={modalMode === "create" ? newType : editType}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormError("");
                      if (modalSourceType !== "manual") return;
                      if (modalMode === "create") setNewType(val);
                      else onEditTypeChange(val);
                    }}
                    disabled={modalSourceType !== "manual"}
                  >
                    <option value="float" className="dx-input-select">
                      Float
                    </option>
                    <option value="int" className="dx-input-select">
                      Integer
                    </option>
                    <option value="bool" className="dx-input-select">
                      Boolean
                    </option>
                    <option value="range" className="dx-input-select">
                      Range
                    </option>
                    <option value="text" className="dx-input-select">
                      Text
                    </option>
                    <option value="date" className="dx-input-select">Date</option>
                    <option value="time" className="dx-input-select">Time</option>
                    <option value="datetime" className="dx-input-select">Date & Time</option>
                  </select>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ opacity: 0.85 }}>Category (optional)</label>
                  <select
                    className="dx-input"
                    value={modalMode === "create" ? newCategory : editCategory}
                    onChange={(e) => {
                      setFormError("");
                      modalMode === "create" ? setNewCategory(e.target.value) : setEditCategory(e.target.value);
                    }}
                    style={{ borderColor: "var(--accent)" }}
                  >
                    <option className="dx-input-select" value="">
                      -- Select Category --
                    </option>
                    {categories.map((catName) => (
                      <option className="dx-input-select" key={catName} value={catName}>
                        {catName}
                      </option>
                    ))}
                  </select>
                </div>

                <div />

                {modalSourceType === "manual" && isRuleType(modalType) && (
                  <div
                    style={{
                      gridColumn: "1 / -1",
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: 10,
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <label style={{ opacity: 0.85 }}>Input Category</label>
                      <select
                        className="dx-input"
                        value={modalMode === "create" ? selectedOptionCategory : editOptionCategory}
                        onChange={(e) => {
                          const v = e.target.value;
                          setFormError("");
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
                        onChange={(e) => {
                          setFormError("");
                          modalMode === "create" ? setSelectedTemplate(e.target.value) : setEditTemplate(e.target.value);
                        }}
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
                        <div style={{ fontSize: "0.85rem", marginBottom: 6, opacity: 0.9 }}>
                          Rule Preview
                        </div>
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
                    onChange={(e) => {
                      setFormError("");
                      modalMode === "create" ? setNewDesc(e.target.value) : setEditDesc(e.target.value);
                    }}
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

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
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