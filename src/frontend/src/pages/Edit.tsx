import React, { useEffect, useState, useRef, useLayoutEffect} from "react";
import { useNavigate } from "react-router-dom";
import { useParams } from 'react-router-dom';
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
}

const EditValuesPage: React.FC = () => {
  const { domainId } = useParams<{ domainId: string }>();
  const DOMAIN_ID = domainId;
  const navigate = useNavigate();

  const [metricList, setMetricList] = useState<Metric[]>([]);
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [pageLoading, setPageLoading] = useState(false);
  const [loadingText, setLoadingText] = useState<string>("Loading...");
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
        setLoadingText("Loading table…");
        await loadData();
      } finally {
        setPageLoading(false);
      }
    })();
  }, []);


  const fetchComparisonRaw = async () => {

    const res = await fetch(apiUrl(`/comparison/${DOMAIN_ID}/`), {
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

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const isTerminal = (s?: AnalysisStatus) => s === "success" || s === "failed";
  const isActive = (s?: AnalysisStatus) => s === "pending" || s === "running";

  const waitForLibraryDone = async (libraryId: string) => {
    for (let i = 0; i < 80; i++) {
      await sleep(1500);
      const data = await fetchComparisonRaw();
      const lib = data.libraries.find((x: any) => x.library_ID === libraryId);
      if (isTerminal(lib?.analysis_status)) return;
    }
  };

  const waitForAllDone = async () => {
    for (let i = 0; i < 120; i++) {
      await sleep(1500);
      const data = await fetchComparisonRaw();
      const anyActive = data.libraries.some((l: any) => isActive(l.analysis_status));
      if (!anyActive) return;
    }
  };

  const startEdit = (id: string) => {
    setRows((prev) =>
      prev.map((r) => (r.library_ID === id ? { ...r, isEditing: true } : r))
    );
  };

  const cancelEdit = async () => {
    try {
      setPageLoading(true);
      setLoadingText("Refreshing…");
      await loadData();
    } finally {
      setPageLoading(false);
    }
  };

  const updateField = (id: string, field: string, value: any) => {
    setRows((prev) =>
      prev.map((r) => (r.library_ID === id ? { ...r, [field]: value } : r))
    );
  };

  const updateMetricValue = (libId: string, metric: string, value: any, isEvidence: boolean = false) => {
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
    const res = await fetch(apiUrl(`/libraries/${row.library_ID}/update-values/`), {
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

    if (res.ok) {
      try {
        setPageLoading(true);
        setLoadingText("Saving…");
        await loadData();
      } finally {
        setPageLoading(false);
      }
    } else {
      const text = await res.text();
      console.error("Save failed:", res.status, text);
    }
  };

  const runAnalysisForLibrary = async (libraryId: string) => {
    try {
      setUpdatingLibId(libraryId);
      setPageLoading(true);
      setLoadingText("Updating repository metrics…");

      const res = await fetch(apiUrl(`/libraries/${libraryId}/analyze/`), {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Update failed:", res.status, text);
        return;
      }

      setLoadingText("Running analysis…");
      await waitForLibraryDone(libraryId);

      setLoadingText("Refreshing table…");
      await loadData();
    } finally {
      setUpdatingLibId(null);
      setPageLoading(false);
    }
  };

  const runAnalysisForAll = async () => {
    try {
      setUpdatingAll(true);
      setPageLoading(true);
      setLoadingText("Updating all repositories…");


      const res = await fetch(apiUrl(`/domains/${DOMAIN_ID}/analyze-all/`), {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Update all failed:", res.status, text);
        return;
      }

      setLoadingText("Running analyses…");
      await waitForAllDone();

      setLoadingText("Refreshing table…");
      await loadData();
    } finally {
      setUpdatingAll(false);
      setPageLoading(false);
    }
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
        {pageLoading && (
          <div className="dx-backdrop" aria-live="polite" aria-busy="true">
            <div className="dx-backdrop-card">
              <span className="dx-spinner" />
              <span>{loadingText}</span>
            </div>
          </div>
        )}

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
          <div style={{ marginBottom: 2 }}>
            <button
              className="dx-btn dx-btn-outline dx-btn-inline"
              onClick={runAnalysisForAll}
              disabled={pageLoading || updatingAll}
              style={{ opacity: pageLoading || updatingAll ? 0.7 : 1 }}
            >
              {(pageLoading && updatingAll) && <span className="dx-spinner" />}
              {updatingAll ? "Updating..." : "Update All"}
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
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              className="dx-btn dx-btn-outline dx-btn-inline"
                              onClick={() => runAnalysisForLibrary(row.library_ID)}
                              disabled={pageLoading || rowUpdating}
                              style={{ opacity: pageLoading || rowUpdating ? 0.7 : 1 }}
                            >
                              {rowUpdating && <span className="dx-spinner" />}
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
                      </td>

                      <td className="dx-sticky-left" style={{ left: offset }}>
                        {row.isEditing ? (
                          <input
                            className="dx-input"
                            value={row.library_name}
                            onChange={(e) =>
                              updateField(row.library_ID, "library_name", e.target.value)
                            }
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
                            onChange={(e) =>
                              updateField(row.library_ID, "programming_language", e.target.value)
                            }
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
                              onChange={(e) =>
                                updateMetricValue(row.library_ID, m.metric_name, e.target.value)
                              }
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
        </div>
      </div>
    </div>
  );
};

export default EditValuesPage;