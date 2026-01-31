import React, { useEffect, useState, useRef, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import { apiUrl } from "../config/api";

interface Metric {
  metric_ID: string;
  metric_name: string;
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

  const firstColRef = useRef<HTMLTableCellElement>(null);
  const [offset, setOffset] = useState(0);

  useLayoutEffect(() => {
    if (firstColRef.current) {
      const width = firstColRef.current.getBoundingClientRect().width;
      setOffset(width);
    }
  }, [rows]);

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
        setErrorMsg(e?.message || "Failed to load table.");
      } finally {
        setPageLoading(false);
      }
    })();
  }, [DOMAIN_ID]);

  const fetchComparisonRaw = async () => {
    const res = await fetch(apiUrl(`/library_metric_values/comparison/${DOMAIN_ID}/`), {
      credentials: "include",
    });

    const contentType = res.headers.get("content-type") || "";
    const text = await res.text();

    if (!res.ok) throw new Error(text);
    if (!contentType.includes("application/json")) {
      throw new Error(`Expected JSON, got ${contentType}. Body: ${text.slice(0, 100)}`);
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
    setRows((prev) => prev.map((r) => (r.library_ID === id ? { ...r, isEditing: true } : r)));
  };

  const cancelEdit = async () => {
    try {
      setPageLoading(true);
      setInfoMsg("Refreshing…");
      setErrorMsg(null);
      await loadData();
      setInfoMsg(null);
    } catch (e: any) {
      setErrorMsg(e?.message || "Failed to refresh.");
    } finally {
      setPageLoading(false);
    }
  };

  const updateField = (id: string, field: string, value: any) => {
    setRows((prev) => prev.map((r) => (r.library_ID === id ? { ...r, [field]: value } : r)));
  };

  const updateMetricValue = (libId: string, metric: string, value: any, isEvidence: boolean = false) => {
    const key = isEvidence ? `${metric}_evidence` : metric;
    setRows((prev) =>
      prev.map((r) => (r.library_ID === libId ? { ...r, metrics: { ...r.metrics, [key]: value } } : r))
    );
  };

  const saveRow = async (row: EditableRow) => {
    try {
      setPageLoading(true);
      setInfoMsg("Saving…");
      setErrorMsg(null);

      const res = await fetch(apiUrl(`/library_metric_values/libraries/${row.library_ID}/update-values/`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          library_name: row.library_name,
          url: row.url,
          programming_language: row.programming_language,
          metrics: row.metrics,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Save failed.");
      }

      await loadData();
      setInfoMsg("Saved.");
      setTimeout(() => setInfoMsg(null), 1500);
    } catch (e: any) {
      setErrorMsg(e?.message || "Save failed.");
    } finally {
      setPageLoading(false);
    }
  };

  const runAnalysisForLibrary = async (libraryId: string) => {
    try {
      setUpdatingLibId(libraryId);
      setErrorMsg(null);

      setInfoMsg("Analysis started (API+SCC + GitStats). You can keep editing. Reload the page later to see results.");

      const res = await fetch(apiUrl(`/library_metric_values/libraries/${libraryId}/analyze/`), {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Analyze request failed.");
      }

      setRows((prev) =>
        prev.map((r) =>
          r.library_ID === libraryId
            ? { ...r, analysis_status: "running", gitstats_status: "running" }
            : r
        )
      );
    } catch (e: any) {
      setErrorMsg(e?.message || "Failed to start analysis.");
    } finally {
      setUpdatingLibId(null);
    }
  };

  const runAnalysisForAll = async () => {
    try {
      setUpdatingAll(true);
      setErrorMsg(null);

      setInfoMsg("Analysis started for all libraries (API+SCC + GitStats). Keep editing. Reload later to see results.");

      const res = await fetch(apiUrl(`/library_metric_values/${DOMAIN_ID}/analyze-all/`), {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Analyze-all request failed.");
      }

      setRows((prev) => prev.map((r) => ({ ...r, analysis_status: "running", gitstats_status: "running" })));
    } catch (e: any) {
      setErrorMsg(e?.message || "Failed to start analysis for all.");
    } finally {
      setUpdatingAll(false);
    }
  };

  const countStatus = (key: "analysis_status" | "gitstats_status") => {
    const pending = rows.filter((r) => r[key] === "pending").length;
    const running = rows.filter((r) => r[key] === "running").length;
    const success = rows.filter((r) => r[key] === "success").length;
    const failed = rows.filter((r) => r[key] === "failed").length;
    return { pending, running, success, failed };
  };

  const apiScc = countStatus("analysis_status");
  const gitstats = countStatus("gitstats_status");

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
          onClick={() => navigate(`/comparison-tool/${domainId}`)}
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

        <h1 style={{ color: "var(--accent)", marginBottom: 20 }}>Edit Metric Values</h1>

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
              onClick={runAnalysisForAll}
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
                              onClick={() => runAnalysisForLibrary(row.library_ID)}
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

                        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85, lineHeight: 1.3 }}>
                          <div>
                              API+SCC: {row.analysis_status || "—"}
                              {(row.analysis_status === "pending" || row.analysis_status === "running") && "..."}
                            </div>
                          <div>
                            GitStats: {row.gitstats_status || "—"}
                            {(row.analysis_status === "pending" || row.analysis_status === "running") && "..."}
                            {row.gitstats_report_url && row.gitstats_status === "success" && (
                              <>
                                {" "}
                                <a
                                  href={row.gitstats_report_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ color: "var(--accent)" }}
                                >
                                  View report
                                </a>
                              </>
                            )}
                          </div>
                          {(row.analysis_error || row.gitstats_error) && (
                            <div style={{ color: "#ff8f8f" }}>
                              {row.analysis_error ? `API+SCC error: ${row.analysis_error}` : ""}
                              {row.gitstats_error ? ` GitStats error: ${row.gitstats_error}` : ""}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="dx-sticky-left" style={{ left: offset }}>
                        {row.isEditing ? (
                          <input
                            className="dx-input"
                            value={row.library_name}
                            onChange={(e) => updateField(row.library_ID, "library_name", e.target.value)}
                            disabled={pageLoading}
                          />
                        ) : (
                          row.library_name
                        )}
                      </td>

                      <td>
                        {row.isEditing ? (
                          <input
                            className="dx-input"
                            value={row.url || ""}
                            onChange={(e) => updateField(row.library_ID, "url", e.target.value)}
                            disabled={pageLoading}
                          />
                        ) : (
                          row.url || "—"
                        )}
                      </td>

                      <td>
                        {row.isEditing ? (
                          <input
                            className="dx-input"
                            value={row.programming_language || ""}
                            onChange={(e) => updateField(row.library_ID, "programming_language", e.target.value)}
                            disabled={pageLoading}
                          />
                        ) : (
                          row.programming_language || "—"
                        )}
                      </td>

                      {metricList.map((m) => (
                        <td key={m.metric_ID}>
                          {row.isEditing ? (
                            <input
                              className="dx-input"
                              value={row.metrics[m.metric_name] ?? ""}
                              onChange={(e) => updateMetricValue(row.library_ID, m.metric_name, e.target.value)}
                              disabled={pageLoading}
                            />
                          ) : (
                            row.metrics[m.metric_name] ?? "—"
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ marginBottom: 10, fontSize: 13, opacity: 0.85 }}>
          <div>
              API+SCC: running {apiScc.running}, pending {apiScc.pending}, success {apiScc.success}, failed {apiScc.failed}
            </div>
            <div>
              GitStats: running {gitstats.running}, pending {gitstats.pending}, success {gitstats.success}, failed {gitstats.failed}
            </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default EditValuesPage;
