import React, { useEffect, useMemo, useRef, useLayoutEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../config/api";
import SuccessNotification from "../components/SuccessNotification";
import { ArrowLeft } from "lucide-react";
import { AutoMetricOptionsResponse, Metric, ModalMode } from "./MetricPageTypes";
import { headerCellStyle, metricCellStyle } from "../components/CellComponents";
import { AddMetricModal } from "../components/AddMetricModal";
import { ReorderMetricsModal } from "../components/ReorderMetricsModal";
import ExpandableText from "../components/ExpandableText";
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
  const [reorderModalOpen, setReorderModalOpen] = useState(false);
  const [reorderCategory, setReorderCategory] = useState("");
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [categoryMetricOrder, setCategoryMetricOrder] = useState<Record<string, string[]>>({});

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

        // Load stored category ordering
        try {
          const orderRes = await fetch(apiUrl("/metrics/reorder/"), { credentials: "include" });
          if (orderRes.ok) {
            const orderData = await orderRes.json();
            if (orderData.category_order) {
              setCategoryMetricOrder(orderData.category_order);
            }
          }
        } catch (orderErr) {
          console.error("Error fetching metric order:", orderErr);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadMetrics();
  }, []);

  const buildCategoryOrdering = (metricsList: Metric[], categoryList: string[], savedOrder?: Record<string, string[]>) => {
    const uniqueCategories = Array.from(
      new Set<string>([
        ...categoryList.filter(Boolean),
        ...metricsList.map((metric) => metric.category || "Uncategorized"),
      ])
    );

    const orderMap: Record<string, string[]> = {};
    uniqueCategories.forEach((category) => {
      orderMap[category] = savedOrder?.[category] || [];
    });

    const metricsInOrder = new Set<string>();

    // First, add metrics that are in the saved order
    if (savedOrder) {
      Object.entries(savedOrder).forEach(([category, metricIds]) => {
        const validIds = metricIds.filter((id) => metricsList.some((m) => m.metric_ID === id));
        orderMap[category] = validIds;
        validIds.forEach((id) => metricsInOrder.add(id));
      });
    }

    // Then, add any metrics that aren't in the saved order
    metricsList.forEach((metric) => {
      if (!metricsInOrder.has(metric.metric_ID)) {
        const category = metric.category || "Uncategorized";
        if (!orderMap[category]) {
          orderMap[category] = [];
        }
        orderMap[category].push(metric.metric_ID);
      }
    });

    return { uniqueCategories, orderMap };
  };

  useEffect(() => {
    const { uniqueCategories, orderMap } = buildCategoryOrdering(metrics, categories, categoryMetricOrder);
    setCategoryOrder(uniqueCategories);
    setCategoryMetricOrder(orderMap);

    if (!reorderCategory && uniqueCategories.length > 0) {
      setReorderCategory(uniqueCategories[0]);
    } else if (reorderCategory && !uniqueCategories.includes(reorderCategory)) {
      setReorderCategory(uniqueCategories[0] || "");
    }
  }, [metrics, categories]);

  const metricsById = useMemo(
    () => new Map(metrics.map((metric) => [metric.metric_ID, metric])),
    [metrics]
  );

  const openReorderModal = () => {
    if (categoryOrder.length > 0 && !reorderCategory) {
      setReorderCategory(categoryOrder[0]);
    }
    setReorderModalOpen(true);
  };

  const closeReorderModal = () => {
    setFormError("")
    setReorderModalOpen(false)
  };

  const moveMetricInCategory = (metricId: string, direction: "up" | "down") => {
    setCategoryMetricOrder((prev) => {
      const current = [...(prev[reorderCategory] || [])];
      const index = current.indexOf(metricId);
      if (index === -1) return prev;
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= current.length) return prev;
      [current[index], current[target]] = [current[target], current[index]];
      return { ...prev, [reorderCategory]: current };
    });
  };

  const saveReorder = async () => {
    try {
      const payload = {
        category_order: categoryMetricOrder,
      };

      const res = await fetch(apiUrl("/metrics/reorder/"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error("Failed to save metric order");
        setFormError("Error saving order. Please try again.");
        return false;
      }
      closeReorderModal();
      showSuccess("Metric display order updated.");
      return true;
    } catch (err) {
      console.error("Error saving reorder:", err);
      setFormError("Error saving order. Please try again.");
      return false;
    }
  };

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

              <button className="dx-btn dx-btn-primary" onClick={openReorderModal}>
                Reorder Metrics
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
                  {categoryOrder.map((category) => {
                    const ids = categoryMetricOrder[category] || [];
                    if (!ids.length) return null;

                    return (
                      <React.Fragment key={category}>
                        <tr
                          key={`group-${category}`}
                          style={{
                            background: "rgba(255,255,255,0.05)",
                            borderBottom: "1px solid rgba(255,255,255,0.12)",
                          }}
                        >
                          <td
                            colSpan={7}
                            style={{
                              ...headerCellStyle,
                              fontWeight: 700,
                              background: "rgba(255,255,255,0.04)",
                            }}
                          >
                            {category}
                          </td>
                        </tr>
                        {ids.map((metricId, index) => {
                          const m = metricsById.get(metricId);
                          if (!m) return null;
                          const isExpanded = expandedRowId === m.metric_ID;

                          return (
                            <tr
                              key={m.metric_ID}
                              style={{
                                borderBottom: "1px solid rgba(255,255,255,0.08)",
                                background:
                                  index % 2 === 0
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
                      </React.Fragment>
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

        <ReorderMetricsModal
          isOpen={reorderModalOpen}
          formError={formError}
          categoryOrder={categoryOrder}
          reorderCategory={reorderCategory}
          categoryMetricOrder={categoryMetricOrder}
          metricsById={metricsById}
          onCategoryChange={setReorderCategory}
          onMoveMetric={moveMetricInCategory}
          onClose={closeReorderModal}
          onSave={saveReorder}
        />

        <AddMetricModal
          isOpen={isModalOpen}
          modalMode={modalMode}
          categories={categories}
          formError={formError}
          modalSourceType={modalSourceType}
          modalMetricKey={modalMetricKey}
          modalType={modalType}
          modalAutoOptions={modalAutoOptions}
          modalAvailableCats={modalAvailableCats}
          modalOptionCategory={modalOptionCategory}
          modalPreview={modalPreview}
          newName={newName}
          newType={newType}
          newSourceType={newSourceType}
          newMetricKey={newMetricKey}
          newCategory={newCategory}
          newDesc={newDesc}
          selectedOptionCategory={selectedOptionCategory}
          selectedTemplate={selectedTemplate}
          editName={editName}
          editType={editType}
          editSourceType={editSourceType}
          editMetricKey={editMetricKey}
          editCategory={editCategory}
          editDesc={editDesc}
          editOptionCategory={editOptionCategory}
          editTemplate={editTemplate}
          closeModal={closeModal}
          onSubmit={modalMode === "create" ? addMetric : saveEdit}
          setFormError={setFormError}
          setNewName={setNewName}
          setEditName={setEditName}
          setNewType={setNewType}
          setEditType={setEditType}
          setNewSourceType={setNewSourceType}
          setEditSourceType={setEditSourceType}
          setNewMetricKey={setNewMetricKey}
          setEditMetricKey={setEditMetricKey}
          setNewCategory={setNewCategory}
          setEditCategory={setEditCategory}
          setNewDesc={setNewDesc}
          setEditDesc={setEditDesc}
          setSelectedOptionCategory={setSelectedOptionCategory}
          setSelectedTemplate={setSelectedTemplate}
          setEditOptionCategory={setEditOptionCategory}
          setEditTemplate={setEditTemplate}
          onEditTypeChange={onEditTypeChange}
          isRuleType={isRuleType}
        />
      </div>
    </div>
  );
};

export default MetricsPage;
