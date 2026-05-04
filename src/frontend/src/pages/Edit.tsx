import React, { useEffect, useState, useRef, useLayoutEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiUrl } from "../config/api";
import SuccessNotification from "../components/SuccessNotification";
import { ArrowLeft } from "lucide-react";
import ConfirmModal from "../components/ConfirmModal"
import ErrorNotification from "../components/ErrorNotification";
import { EditableRow, Metric } from "../pages/Edit.types"
import { headerCellStyle, clamp2Style, metricCellStyle, isAffectedMetric, normalizeStatus, statusColor, statusLabel} from "../components/CellComponents";
import ExpandableText from "../components/ExpandableText";
import EditMetricValuesModal from "../components/EditMetricValuesModal"

type ConfirmState =
  | null
  | {
      type: "library";
      library_ID: string;
      library_name: string;
    }
  | {
      type: "all";
    };

const EditValuesPage: React.FC = () => {
  const { domainId } = useParams<{ domainId: string }>();
  const DOMAIN_ID = domainId;
  const navigate = useNavigate();

  const [metricList, setMetricList] = useState<Metric[]>([]);
  const [rows, setRows] = useState<EditableRow[]>([]);

  const [pageLoading, setPageLoading] = useState(false);

  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [updatingAll, setUpdatingAll] = useState(false);
  const [updatingLibId, setUpdatingLibId] = useState<string | null>(null);

  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [fail, setFail] = useState(false);
  const [failMessage, setFailMessage] = useState("");

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<EditableRow | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const firstColRef = useRef<HTMLTableCellElement>(null);
  const [offset, setOffset] = useState(0);

  const affectedMetrics = metricList.filter(isAffectedMetric);
  const groupedMetrics = React.useMemo(() => {
    const groups = new Map<string, Metric[]>();

    metricList.forEach((metric) => {
      const category = metric.category || "Other";
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(metric);
    });

    return Array.from(groups.entries()).map(([category, metrics]) => ({
      category,
      metrics,
    }));
  }, [metricList]);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 1700);
  };

  const showFail = (msg: string) => {
    setFailMessage(msg);
    setFail(true);
    setTimeout(() => setFail(false), 2800);
  };

  useLayoutEffect(() => {
    if (firstColRef.current) {
      const width = firstColRef.current.getBoundingClientRect().width;
      setOffset(width);
    }
  }, [rows]);

  useEffect(() => {
    document.title = "DomainX – Edit";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && confirm && !confirmBusy) setConfirm(null);
      if (e.key === "Escape" && editModalOpen && !pageLoading) {
        setEditModalOpen(false);
        setEditDraft(null);
        setFieldErrors({});
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirm, confirmBusy, editModalOpen, pageLoading]);

  useEffect(() => {
    (async () => {
      try {
        setPageLoading(true);
        setInfoMsg("Loading table…");
        setErrorMsg(null);
        if (!DOMAIN_ID) return;
        await loadData();
        setInfoMsg(null);
      } catch (e: any) {
        const msg = e?.message || "Failed to load table.";
        setErrorMsg(msg);
        showFail(msg);
      } finally {
        setPageLoading(false);
      }
    })();
  }, [DOMAIN_ID]);

  const fetchComparisonRaw = async () => {
    const res = await fetch(
      apiUrl(`/library_metric_values/comparison/${DOMAIN_ID}/`),
      {
        credentials: "include",
      }
    );

    const contentType = res.headers.get("content-type") || "";
    const text = await res.text();

    if (!res.ok) throw new Error(text);
    if (!contentType.includes("application/json")) {
      throw new Error(
        `Expected JSON, got ${contentType}. Body: ${text.slice(0, 100)}`
      );
    }

    return JSON.parse(text);
  };

  const loadData = async () => {
    const data = await fetchComparisonRaw();

    const editableRows: EditableRow[] = data.libraries.map((lib: any) => ({
      ...lib,
      isEditing: false,
    }));

    setMetricList(data.metrics);
    setRows(editableRows);
  };

  const validateMetricValue = (metric: Metric, value: any): string => {
      const raw = value == null ? "" : String(value).trim();

      if (raw === "") return "";

      if (metric.metric_key === "gitstats_report") {
        return "";
      }

      if (metric.scoring_dict && Object.keys(metric.scoring_dict).length > 0) {
        return "";
      }

      if (metric.value_type === "int") {
          if (metric.option_category === "score_0_2") {
            if (!["0", "1", "2"].includes(raw)) {
              return "Please select 0, 1, or 2.";
            }
            return "";
          }

          if (!/^-?\d+$/.test(raw)) {
            return "Please enter a whole number.";
          }

          return "";
        }

      if (metric.value_type === "float") {
        return /^-?\d+(\.\d+)?$/.test(raw) ? "" : "Please enter a valid number.";
      }

      if (metric.value_type === "text") {
        return "";
      }

      if (metric.value_type === "date") {
        return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? "" : "Please enter a valid date.";
      }

      if (metric.value_type === "time") {
        return /^\d{2}:\d{2}(:\d{2})?$/.test(raw) ? "" : "Please enter a valid time.";
      }

      if (metric.value_type === "datetime") {
        return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)
          ? ""
          : "Please enter a valid date and time.";
      }

      return "";
    };

  const validateDraft = (draft: EditableRow | null, metrics: Metric[]) => {
    if (!draft) return {};

    const errors: Record<string, string> = {};

    metrics.forEach((metric) => {
      const value = draft.metrics[metric.metric_name];
      const error = validateMetricValue(metric, value);
      if (error) {
        errors[metric.metric_name] = error;
      }
    });

    return errors;
  };

  const startEdit = (id: string) => {
    const row = rows.find((r) => r.library_ID === id);
    if (!row) return;

    const draft = {
      ...row,
      metrics: { ...row.metrics },
      isEditing: true,
    };

    setEditDraft(draft);
    setFieldErrors(validateDraft(draft, metricList));
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    if (pageLoading) return;
    setEditModalOpen(false);
    setEditDraft(null);
    setFieldErrors({});
  };

  const cancelEdit = async () => {
    try {
      setPageLoading(true);
      setInfoMsg("Refreshing…");
      setErrorMsg(null);
      await loadData();
      setInfoMsg(null);
      setEditModalOpen(false);
      setEditDraft(null);
      setFieldErrors({});
    } catch (e: any) {
      const msg = e?.message || "Failed to refresh.";
      setErrorMsg(msg);
      showFail(msg);
    } finally {
      setPageLoading(false);
    }
  };

  const updateEditDraftValue = (
    metric: string,
    value: any,
    isEvidence: boolean = false
  ) => {
    const key = isEvidence ? `${metric}_evidence` : metric;

    setEditDraft((prev) =>
      prev
        ? {
            ...prev,
            metrics: {
              ...prev.metrics,
              [key]: value,
            },
          }
        : prev
    );

    const isDescription = metric.endsWith("_description");
    const metricObj = metricList.find((m) => m.metric_name === metric);

    if (metricObj && !isDescription && !isEvidence) {
      const error = validateMetricValue(metricObj, value);
      setFieldErrors((prev) => {
        const next = { ...prev };
        if (error) next[metric] = error;
        else delete next[metric];
        return next;
      });
    }
  };

  const saveRow = async (row: EditableRow) => {
    const validationErrors = validateDraft(row, metricList);
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      showFail("Please fix the invalid values before saving.");
      return;
    }

    try {
      setPageLoading(true);
      setInfoMsg("Saving…");
      setErrorMsg(null);

      const res = await fetch(
        apiUrl(`/library_metric_values/libraries/${row.library_ID}/update-values/`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            metrics: row.metrics,
          }),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Save failed.");
      }

      await loadData();
      setInfoMsg("Saved.");
      showSuccess("Metric values saved successfully!");
      setTimeout(() => setInfoMsg(null), 1500);
      setEditModalOpen(false);
      setEditDraft(null);
      setFieldErrors({});
    } catch (e: any) {
      const msg = e?.message || "Save failed.";
      setErrorMsg(msg);
      showFail(msg);
    } finally {
      setPageLoading(false);
    }
  };

  const runAnalysisForLibrary = async (libraryId: string) => {
    try {
      setUpdatingLibId(libraryId);
      setErrorMsg(null);

      setInfoMsg("Starting analysis (API+SCC + GitStats)…");

      const res = await fetch(
        apiUrl(`/library_metric_values/libraries/${libraryId}/analyze/`),
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Analyze request failed.");
      }

      showSuccess("Analysis started successfully! Reload later to see results.");
      setInfoMsg("Analysis started. Reload later to see results.");

      setRows((prev) =>
        prev.map((r) =>
          r.library_ID === libraryId
            ? { ...r, analysis_status: "running", gitstats_status: "running" }
            : r
        )
      );

      setEditDraft((prev) =>
        prev && prev.library_ID === libraryId
          ? { ...prev, analysis_status: "running", gitstats_status: "running" }
          : prev
      );
    } catch (e: any) {
      const msg = e?.message || "Failed to start analysis.";
      setErrorMsg(msg);
      showFail(msg);
    } finally {
      setUpdatingLibId(null);
    }
  };

  const runAnalysisForAll = async () => {
    try {
      setUpdatingAll(true);
      setErrorMsg(null);

      setInfoMsg("Starting analysis for all libraries (API+SCC + GitStats)…");

      const res = await fetch(
        apiUrl(`/library_metric_values/${DOMAIN_ID}/analyze-all/`),
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Analyze-all request failed.");
      }

      showSuccess("Analysis started for all libraries! Reload later to see results.");
      setInfoMsg("Analysis started for all libraries. Reload later to see results.");

      setRows((prev) =>
        prev.map((r) => ({
          ...r,
          analysis_status: "running",
          gitstats_status: "running",
        }))
      );
    } catch (e: any) {
      const msg = e?.message || "Failed to start analysis for all.";
      setErrorMsg(msg);
      showFail(msg);
    } finally {
      setUpdatingAll(false);
    }
  };

  const openConfirmLibrary = (row: EditableRow) => {
    setConfirm({
      type: "library",
      library_ID: row.library_ID,
      library_name: row.library_name,
    });
  };

  const openConfirmAll = () => {
    setConfirm({ type: "all" });
  };

  const confirmRun = async () => {
    if (!confirm) return;
    try {
      setConfirmBusy(true);
      if (confirm.type === "library") {
        await runAnalysisForLibrary(confirm.library_ID);
      } else {
        await runAnalysisForAll();
      }
      setConfirm(null);
    } finally {
      setConfirmBusy(false);
    }
  };

  const countStatus = (key: "analysis_status" | "gitstats_status") => {
    const pending = rows.filter(
      (r) => normalizeStatus(r[key]) === "pending"
    ).length;
    const running = rows.filter(
      (r) => normalizeStatus(r[key]) === "running"
    ).length;
    const success = rows.filter(
      (r) => normalizeStatus(r[key]) === "success"
    ).length;
    const failed = rows.filter(
      (r) => normalizeStatus(r[key]) === "failed"
    ).length;
    return { pending, running, success, failed };
  };

  const apiScc = countStatus("analysis_status");
  const gitstats = countStatus("gitstats_status");

  return (
    <div className="dx-bg" style={{ display: "flex", height: "100vh" }}>
      <ConfirmModal
        open={!!confirm}
        title={
          confirm?.type === "library"
            ? `Library: ${confirm.library_name}`
            : "GitHub metric values will be affected for all libraries in this domain."
        }
        message={
          confirm?.type === "library" ? (
            <div>
              <div style={{ marginBottom: 10 }}>
                This will run <b>GitHub API</b>, <b>SCC</b>, and <b>GitStats</b> for:
              </div>

              <div
                style={{
                  marginBottom: 12,
                  padding: "10px 12px",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 10,
                }}
              >
                <b>{confirm.library_name}</b>
              </div>

              <div style={{ marginBottom: 8 }}>
                The following columns will be affected:
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                {affectedMetrics.length > 0 ? (
                  affectedMetrics.map((m) => (
                    <span
                      key={m.metric_ID}
                      style={{
                        padding: "5px 9px",
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.10)",
                        fontSize: 12.5,
                        color: "rgba(235,238,245,0.92)",
                      }}
                    >
                      {m.metric_name}
                    </span>
                  ))
                ) : (
                  <span style={{ opacity: 0.75 }}>No non-manual metrics found.</span>
                )}
              </div>
            </div>
          ) : confirm?.type === "all" ? (
            <div>
              <div style={{ marginBottom: 10 }}>
                This will run <b>GitHub API</b>, <b>SCC</b>, and <b>GitStats</b> for{" "}
                <b>all libraries</b> in this domain.
              </div>

              <div style={{ marginBottom: 8 }}>
                The following columns will be affected:
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                {affectedMetrics.length > 0 ? (
                  affectedMetrics.map((m) => (
                    <span
                      key={m.metric_ID}
                      style={{
                        padding: "5px 9px",
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.10)",
                        fontSize: 12.5,
                        color: "rgba(235,238,245,0.92)",
                      }}
                    >
                      {m.metric_name}
                    </span>
                  ))
                ) : (
                  <span style={{ opacity: 0.75 }}>No non-manual metrics found.</span>
                )}
              </div>
            </div>
          ) : null
        }
        confirmText="Run"
        cancelText="Cancel"
        busy={confirmBusy}
        onCancel={() => {
          if (!confirmBusy) setConfirm(null);
        }}
        onConfirm={confirmRun}
      />

      <EditMetricValuesModal
        open={editModalOpen}
        row={editDraft}
        metricList={metricList}
        pageLoading={pageLoading}
        fieldErrors={fieldErrors}
        onClose={closeEditModal}
        onChangeValue={updateEditDraftValue}
        onSave={() => {
          if (editDraft) saveRow(editDraft);
        }}
      />

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

        <h1 style={{ color: "var(--accent)", marginBottom: 20 }}>
          Edit Metric Values
        </h1>

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
            <button
              className="dx-btn dx-btn-outline dx-btn-inline"
              onClick={openConfirmAll}
              disabled={pageLoading || updatingAll}
              style={{ opacity: pageLoading || updatingAll ? 0.7 : 1 }}
            >
              {updatingAll ? "Updating..." : "Update All"}
            </button>

            <button
              className="dx-btn dx-btn-outline dx-btn-inline"
              onClick={cancelEdit}
              disabled={pageLoading}
              style={{ opacity: pageLoading ? 0.7 : 1 }}
              title="Reload table from server"
            >
              Reload
            </button>
          </div>

          {infoMsg && (
            <div style={{ marginBottom: 10, opacity: 0.9, fontSize: 14 }}>
              {infoMsg}
            </div>
          )}
          {errorMsg && (
            <div style={{ marginBottom: 10, color: "#ff8f8f", fontSize: 14 }}>
              {errorMsg}
            </div>
          )}

          <div style={{ marginBottom: 10, fontSize: 13, opacity: 0.85 }}>
            <div style={{ marginTop: 6, opacity: 0.8 }}>
              Auto-reload is disabled for comfortable editing. When you want
              updated results, click <b>Reload</b> (or refresh the page).
            </div>
          </div>

          <div className="dx-table-wrap dx-table-scroll" style={{ flex: 1, minHeight: 0 }}>
            <table
              className="dx-table"
              style={{
                tableLayout: "fixed",
                width: "max-content",
                minWidth: "100%",
              }}
            >
              <thead>
                <tr>
                  <th
                    className="dx-th-sticky dx-sticky-left"
                    colSpan={2}
                    style={{
                      ...headerCellStyle,
                      textAlign: "center",
                      background: "rgba(20, 24, 38, 1)",
                      borderBottom: "1px solid rgba(255,255,255,0.08)",
                      minHeight: 20,
                    }}
                  >
                  Categories
                  </th>
                  <th
                    className="dx-th-sticky"
                    rowSpan={2}
                    style={{
                      ...headerCellStyle,
                      width: 190,
                      height: 40,
                      textAlign: "center",
                      background: "rgba(20, 24, 38, 1)",
                      borderBottom: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    GitHub URL
                  </th>
                  <th
                    className="dx-th-sticky"
                    rowSpan={2}
                    style={{
                      ...headerCellStyle,
                      width: 190,
                      textAlign: "center",
                      background: "rgba(20, 24, 38, 1)",
                      borderBottom: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    URL
                  </th>
                  <th
                    className="dx-th-sticky"
                    rowSpan={2}
                    style={{
                      ...headerCellStyle,
                      width: 190,
                      textAlign: "center",
                      background: "rgba(20, 24, 38, 1)",
                      borderBottom: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    Language
                  </th>

                  {groupedMetrics.map((group) => (
                    <th
                      key={group.category}
                      colSpan={group.metrics.length}
                      className="dx-th-sticky"
                      style={{
                        ...headerCellStyle,
                        textAlign: "center",
                        top: 0,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        height: 40,
                        minHeight: 20,
                      }}
                      title={group.category}
                    >
                      {group.category}
                    </th>
                  ))}
                </tr>
                <tr>
                  <th
                    ref={firstColRef}
                    className="dx-th-sticky dx-sticky-left"
                    style={{
                      ...headerCellStyle,
                      background: "rgba(20, 24, 38, 1)",
                      left: 0,
                      top: 57,
                      width: 190,
                    }}
                  >
                    Actions
                  </th>
                  <th
                    className="dx-th-sticky dx-sticky-left"
                    style={{
                      ...headerCellStyle,
                      background: "rgba(20, 24, 38, 1)",
                      left: offset,
                      top: 57,
                      width: 190,
                    }}
                  >
                    Name
                  </th>
                  {metricList.map((m) => (
                    <th
                      key={m.metric_ID}
                      className="dx-th-sticky"
                      style={{
                        ...headerCellStyle,
                        width: 170,
                        top: 57,
                      }}
                    >
                      <div style={{ ...clamp2Style, paddingRight: "18px"}}>
                        {m.metric_name}
                      </div>

                      {m.description && (
                        <span
                          title={m.description}
                          style={{
                            position: "absolute",
                            top: "8px",
                            right: "6px",
                            cursor: "help",
                            fontSize: "10px",
                            background: "rgba(255, 255, 255, 0.1)",
                            color: "var(--accent)",
                            width: "14px",
                            height: "14px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: "50%",
                            border: "1px solid rgba(255, 255, 255, 0.2)",
                            opacity: 0.6,
                            transition: "opacity 0.2s",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                          onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.6")}
                        >
                          ?
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rows.map((row, rowIndex) => {
                  const rowUpdating = updatingLibId === row.library_ID;

                  const apiStatus = normalizeStatus(row.analysis_status);
                  const gsStatus = normalizeStatus(row.gitstats_status);

                  const apiDots = apiStatus === "running" ? "..." : "";
                  const gsDots = gsStatus === "running" ? "..." : "";

                  return (
                    <tr
                      key={row.library_ID}
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                        background:
                          rowIndex % 2 === 0
                            ? "rgba(255,255,255,0.01)"
                            : "rgba(255,255,255,0.025)",
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
                              className="dx-btn dx-btn-outline dx-btn-inline"
                              onClick={() => openConfirmLibrary(row)}
                              disabled={pageLoading || rowUpdating}
                              style={{
                                opacity: pageLoading || rowUpdating ? 0.7 : 1,
                                padding: "5px 8px",
                                fontSize: 14,
                                lineHeight: 1.4,
                              }}
                            >
                            {rowUpdating ? "Updating..." : "Update"}
                          </button>

                          <button
                              className="dx-btn dx-btn-outline"
                              onClick={() => startEdit(row.library_ID)}
                              disabled={pageLoading}
                              style={{
                                opacity: pageLoading ? 0.7 : 1,
                                padding: "5px 8px",
                                fontSize: 14,
                                lineHeight: 1.4,
                              }}
                            >
                            Edit
                          </button>
                        </div>

                        <div style={{ marginTop: 5, fontSize: 11.5, lineHeight: 1.22 }}>
                          <div style={{ color: statusColor(row.analysis_status), ...clamp2Style }}>
                            API+SCC: {statusLabel(row.analysis_status)}
                            {apiDots}
                          </div>

                          <div style={{ color: statusColor(row.gitstats_status), ...clamp2Style }}>
                            GitStats: {statusLabel(row.gitstats_status)}
                            {gsDots}
                          </div>
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
                          title={row.library_name}
                        >
                        <ExpandableText
                          text={row.library_name || ""}
                          lines={2}
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
                        }}
                        title={row.github_url || "—"}
                      >
                        <ExpandableText
                          text={row.github_url || ""}
                          lines={3}
                          emptyText="—"
                        />
                      </td>

                      <td
                        style={{
                          ...metricCellStyle,
                          whiteSpace: "normal",
                          wordBreak: "break-word",
                        }}
                        title={row.url || "—"}
                      >
                        <ExpandableText
                          text={row.url || ""}
                          lines={3}
                          emptyText="—"
                        />
                      </td>

                      <td
                        style={{
                          ...metricCellStyle,
                          whiteSpace: "normal",
                          wordBreak: "break-word",
                        }}
                        title={row.programming_language || "—"}
                      >
                        <ExpandableText
                          text={row.programming_language || ""}
                          lines={2}
                          emptyText="—"
                        />
                      </td>

                      {metricList.map((m) => {
                        const cellVal = row.metrics[m.metric_name];
                        const cellDesc = row.metrics[`${m.metric_name}_description`];
                        if (m.metric_key === "gitstats_report") {
                          const url = cellVal ? String(cellVal) : null;
                          return (
                            <td
                              key={m.metric_ID}
                              style={{
                                ...metricCellStyle,
                                whiteSpace: "normal",
                                wordBreak: "break-word",
                              }}
                              title={url || "—"}
                            >
                              <div style={clamp2Style}>
                                {url ? (
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                      color: "var(--accent)",
                                      textDecoration: "none",
                                    }}
                                  >
                                    View report
                                  </a>
                                ) : (
                                  "—"
                                )}
                              </div>
                            </td>
                          );
                        }

                        return (
    <td
      key={m.metric_ID}
      style={{
        ...metricCellStyle,
        position: "relative",
        paddingRight: cellDesc ? "24px" : "8px",
      }}
      title={cellVal != null ? String(cellVal) : "—"}
    >
      <ExpandableText
        text={cellVal != null ? String(cellVal) : ""}
        lines={3}
        emptyText="—"
      />

      {cellDesc && (
        <span
          title={`${cellDesc}`}
          style={{
            position: "absolute",
            top: "6px",
            right: "6px",
            cursor: "help",
            fontSize: "10px",
            fontWeight: "bold",
            color: "var(--accent)",
            background: "rgba(0, 255, 136, 0.12)",
            border: "1px solid rgba(0, 255, 136, 0.25)",
            width: "15px",
            height: "15px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "4px",
            opacity: 0.8,
          }}
        >
          i
        </span>
      )}
    </td>
  );
})}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ marginBottom: 10, marginTop: 10, fontSize: 13, opacity: 0.85 }}>
            <div>
              API+SCC: running {apiScc.running}, success {apiScc.success}, failed{" "}
              {apiScc.failed}
            </div>
            <div>
              GitStats: running {gitstats.running}, success {gitstats.success}, failed{" "}
              {gitstats.failed}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditValuesPage;
