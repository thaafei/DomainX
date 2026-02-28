import React, { useEffect, useState, useRef, useLayoutEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiUrl } from "../config/api";
import SuccessNotification from "../components/SuccessNotification";
import {ArrowLeft } from "lucide-react";

interface Metric {
  metric_ID: string;
  metric_name: string;
  value_type: string;
  scoring_dict?: Record<string, number> | null;
}

type AnalysisStatus = "pending" | "running" | "success" | "failed" | string;

interface EditableRow {
  library_ID: string;
  library_name: string;
  url: string | null;
  programming_language: string;
  metrics: { [metricName: string]: string | number | null };
  isEditing: boolean;

  analysis_status?: AnalysisStatus;
  analysis_error?: string | null;

  gitstats_status?: AnalysisStatus;
  gitstats_error?: string | null;
  gitstats_report_url?: string | null;
}

const normalizeStatus = (
  s?: AnalysisStatus
): "pending" | "running" | "success" | "failed" | "unknown" => {
  const v = String(s || "").toLowerCase().trim();
  if (v === "pending") return "pending";
  if (v === "running") return "running";
  if (v === "success") return "success";
  if (v === "failed") return "failed";
  return "unknown";
};

const statusLabel = (s?: AnalysisStatus) => {
  const v = normalizeStatus(s);
  if (v === "unknown") return "—";
  return v;
};

const statusColor = (s?: AnalysisStatus) => {
  const v = normalizeStatus(s);
  if (v === "failed") return "rgba(255, 143, 143, 0.95)";
  return "rgba(255,255,255,0.65)";
};

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

const ConfirmModal: React.FC<{
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}> = ({
  open,
  title,
  message,
  confirmText = "Run",
  cancelText = "Cancel",
  busy,
  onCancel,
  onConfirm,
}) => {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 18,
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: "min(620px, 100%)",
          borderRadius: 18,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(18, 20, 28, 0.92)",
          boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
        }}
      >
        <div
          style={{
            padding: "14px 16px",
            background:
              "linear-gradient(90deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
            borderBottom: "1px solid rgba(255,255,255,0.10)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div
              style={{
                fontSize: 12,
                letterSpacing: 0.6,
                opacity: 0.75,
                color: "rgba(220,230,255,0.85)",
              }}
            >
              CONFIRMATION
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 750,
                color: "rgba(235,238,245,0.92)",
              }}
            >
              Are you sure you want to run analysis?
            </div>
          </div>

          <div
            style={{
              width: 10,
              height: 46,
              borderRadius: 10,
              background: "var(--accent)",
              opacity: 0.9,
              boxShadow: "0 0 18px rgba(255,255,255,0.08)",
            }}
          />
        </div>

        <div style={{ padding: 16 }}>
          <div
            style={{
              fontSize: 14,
              color: "rgba(210,216,228,0.86)",
              marginBottom: 10,
            }}
          >
            {title}
          </div>

          <div
            style={{
              fontSize: 14,
              lineHeight: 1.55,
              color: "rgba(210,216,228,0.86)",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 14,
              padding: "12px 12px",
            }}
          >
            {message}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              marginTop: 14,
            }}
          >
            <button
              className="dx-btn dx-btn-outline"
              onClick={onCancel}
              disabled={!!busy}
              style={{
                opacity: busy ? 0.7 : 1,
                borderColor: "rgba(255,255,255,0.16)",
              }}
            >
              {cancelText}
            </button>

            <button
              className="dx-btn dx-btn-primary"
              onClick={onConfirm}
              disabled={!!busy}
              style={{
                opacity: busy ? 0.7 : 1,
                filter: "saturate(1.05)",
              }}
            >
              {busy ? "Starting..." : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
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

  const firstColRef = useRef<HTMLTableCellElement>(null);
  const [offset, setOffset] = useState(0);

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
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirm, confirmBusy]);



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

  const startEdit = (id: string) => {
    setRows((prev) =>
      prev.map((r) => (r.library_ID === id ? { ...r, isEditing: true } : r))
    );
  };

  const cancelEdit = async () => {
    try {
      setPageLoading(true);
      setInfoMsg("Refreshing…");
      setErrorMsg(null);
      await loadData();
      setInfoMsg(null);
    } catch (e: any) {
      const msg = e?.message || "Failed to refresh.";
      setErrorMsg(msg);
      showFail(msg);
    } finally {
      setPageLoading(false);
    }
  };

  const updateMetricValue = (
    libId: string,
    metric: string,
    value: any,
    isEvidence: boolean = false
  ) => {
    const key = isEvidence ? `${metric}_evidence` : metric;
    setRows((prev) =>
      prev.map((r) =>
        r.library_ID === libId
          ? { ...r, metrics: { ...r.metrics, [key]: value } }
          : r
      )
    );
  };

  const saveRow = async (row: EditableRow) => {
    try {
      setPageLoading(true);
      setInfoMsg("Saving…");
      setErrorMsg(null);

      const res = await fetch(
        apiUrl(
          `/library_metric_values/libraries/${row.library_ID}/update-values/`
        ),
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
    const pending = rows.filter((r) => normalizeStatus(r[key]) === "pending").length;
    const running = rows.filter((r) => normalizeStatus(r[key]) === "running").length;
    const success = rows.filter((r) => normalizeStatus(r[key]) === "success").length;
    const failed = rows.filter((r) => normalizeStatus(r[key]) === "failed").length;
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
              This will run <b>GitHub API</b>, <b>SCC</b>, and <b>GitStats</b> for:
              <div
                style={{
                  marginTop: 10,
                  padding: "10px 12px",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 10,
                }}
              >
                <b>{confirm.library_name}</b>
              </div>
            </div>
          ) : confirm?.type === "all" ? (
            <div>
              This will run <b>GitHub API</b>, <b>SCC</b>, and <b>GitStats</b> for{" "}
              <b>all libraries</b> in this domain.
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
          <div style={{ marginBottom: 8, display: "flex", gap: 10, alignItems: "center" }}>
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

          {infoMsg && <div style={{ marginBottom: 10, opacity: 0.9, fontSize: 14 }}>{infoMsg}</div>}
          {errorMsg && <div style={{ marginBottom: 10, color: "#ff8f8f", fontSize: 14 }}>{errorMsg}</div>}

          <div style={{ marginBottom: 10, fontSize: 13, opacity: 0.85 }}>
            <div style={{ marginTop: 6, opacity: 0.8 }}>
              Auto-reload is disabled for comfortable editing. When you want updated results, click <b>Reload</b> (or refresh the page).
            </div>
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
                  <th className="dx-th-sticky">URL</th>
                  <th className="dx-th-sticky">Language</th>
                  {metricList.map((m) => (
                    <th key={m.metric_ID} className="dx-th-sticky">
                      {m.metric_name}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => {
                  const rowUpdating = updatingLibId === row.library_ID;

                  const apiStatus = normalizeStatus(row.analysis_status);
                  const gsStatus = normalizeStatus(row.gitstats_status);

                  const apiDots = apiStatus === "running" ? "..." : "";
                  const gsDots = gsStatus === "running" ? "..." : "";

                  return (
                    <tr key={row.library_ID}>
                      <td className="dx-sticky-left" style={{ left: 0 }}>
                        {row.isEditing ? (
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              className="dx-btn dx-btn-primary"
                              onClick={() => saveRow(row)}
                              disabled={pageLoading}
                              style={{ opacity: pageLoading ? 0.7 : 1 }}
                            >
                              Save
                            </button>
                            <button
                              className="dx-btn dx-btn-outline"
                              onClick={cancelEdit}
                              disabled={pageLoading}
                              style={{ opacity: pageLoading ? 0.7 : 1 }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <button
                              className="dx-btn dx-btn-outline dx-btn-inline"
                              onClick={() => openConfirmLibrary(row)}
                              disabled={pageLoading || rowUpdating}
                              style={{ opacity: pageLoading || rowUpdating ? 0.7 : 1 }}
                            >
                              {rowUpdating ? "Updating..." : "Update"}
                            </button>

                            <button
                              className="dx-btn dx-btn-outline"
                              onClick={() => startEdit(row.library_ID)}
                              disabled={pageLoading}
                              style={{ opacity: pageLoading ? 0.7 : 1 }}
                            >
                              Edit
                            </button>
                          </div>
                        )}

                        <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.3 }}>
                          <div style={{ color: statusColor(row.analysis_status) }}>
                            API+SCC: {statusLabel(row.analysis_status)}
                            {apiDots}
                          </div>

                          <div style={{ color: statusColor(row.gitstats_status) }}>
                            GitStats: {statusLabel(row.gitstats_status)}
                            {gsDots}
                          </div>
                        </div>
                      </td>

                      <td className="dx-sticky-left" style={{ left: offset }}>
                        <div style={{ opacity: row.isEditing ? 0.75 : 1 }}>
                          {row.library_name}
                        </div>
                      </td>

                      <td>
                        <div style={{ opacity: row.isEditing ? 0.75 : 1 }}>
                          {row.url || "—"}
                        </div>
                      </td>

                      <td>
                        <div style={{ opacity: row.isEditing ? 0.75 : 1 }}>
                          {row.programming_language || "—"}
                        </div>
                      </td>

                      {metricList.map((m) => {
                        const cellVal = row.metrics[m.metric_name];
                        if (!row.isEditing && m.metric_name === "GitStats Report") {
                          const url = cellVal ? String(cellVal) : null;
                          return (
                            <td key={m.metric_ID}>
                              {url ? (
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ color: "var(--accent)" }}
                                >
                                  View report
                                </a>
                              ) : (
                                "—"
                              )}
                            </td>
                          );
                        }

                        return (
                          <td key={m.metric_ID}>
                            {row.isEditing ? (
                              m.scoring_dict && Object.keys(m.scoring_dict).length > 0 ? (
                                <select
                                  className="dx-input"
                                  value={cellVal ?? ""}
                                  onChange={(e) =>
                                    updateMetricValue(row.library_ID, m.metric_name, e.target.value)
                                  }
                                  disabled={pageLoading}
                                >
                                  <option value="" className="dx-input-select">-- Select --</option>
                                  {Object.keys(m.scoring_dict).map((key) => (
                                    <option key={key} value={key} className="dx-input-select">
                                      {key}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  className="dx-input"
                                  value={cellVal ?? ""}
                                  onChange={(e) =>
                                    updateMetricValue(row.library_ID, m.metric_name, e.target.value)
                                  }
                                  disabled={pageLoading}
                                />
                              )
                            ) : (
                              cellVal ?? "—"
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

          <div style={{ marginBottom: 10, fontSize: 13, opacity: 0.85 }}>
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
