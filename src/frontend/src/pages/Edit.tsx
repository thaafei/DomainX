import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useParams } from 'react-router-dom';

import { apiUrl } from "../config/api";
interface Metric {
  metric_ID: string;
  metric_name: string;
}

interface EditableRow {
  library_ID: string;
  library_name: string;
  url: string | null;
  programming_language: string;
  metrics: { [metricName: string]: string | number | null };

  isEditing: boolean;
}

const EditValuesPage: React.FC = () => {
  const { domainId } = useParams<{ domainId: string }>();
  const DOMAIN_ID = domainId; 
  const navigate = useNavigate();
  const [metricList, setMetricList] = useState<Metric[]>([]);
  const [rows, setRows] = useState<EditableRow[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
       const formatUUID = (rawId: string) => {
            if (rawId && rawId.length === 32 && !rawId.includes('-')) {
              return rawId.substring(0, 8) + '-' +
                     rawId.substring(8, 12) + '-' +
                     rawId.substring(12, 16) + '-' +
                     rawId.substring(16, 20) + '-' +
                     rawId.substring(20, 32);
            }
            return rawId;
          };

      if (!DOMAIN_ID) return;
      const formattedDomainId = formatUUID(DOMAIN_ID);

      const res = await fetch(
          apiUrl(`/api/comparison/${formattedDomainId}/`),
          { credentials: "include" }
        );
      const contentType = res.headers.get("content-type") || "";
      const text = await res.text();

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0,200)}`);

      if (!contentType.includes("application/json")) {
        throw new Error(`Expected JSON, got ${contentType}. Body starts with: ${text.slice(0,80)}`);
      }

      const data = JSON.parse(text);
    const editableRows = data.libraries.map((lib: any) => ({
      ...lib,
      isEditing: false,
    }));

    setMetricList(data.metrics);
    setRows(editableRows);
  };

  const startEdit = (id: string) => {
    setRows(prev =>
      prev.map(r =>
        r.library_ID === id ? { ...r, isEditing: true } : r
      )
    );
  };

  const cancelEdit = (id: string) => {
    loadData();
  };

  const updateField = (id: string, field: string, value: any) => {
    setRows(prev =>
      prev.map(r =>
        r.library_ID === id ? { ...r, [field]: value } : r
      )
    );
  };

  const updateMetricValue = (libId: string, metric: string, value: any) => {
    setRows(prev =>
      prev.map(r =>
        r.library_ID === libId
          ? { ...r, metrics: { ...r.metrics, [metric]: value } }
          : r
      )
    );
  };

  const saveRow = async (row: EditableRow) => {
    const payload = {
      library_name: row.library_name,
      url: row.url,
      programming_language: row.programming_language,
      metrics: row.metrics,
    };

    const res = await fetch(apiUrl(
      `/api/libraries/${row.library_ID}/update-values/`),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      }
    );

    if (res.ok) {
      loadData();
    }
  };

  return (
    <div className="dx-bg" style={{ display: "flex", height: "100vh" }}>

      <div
        className="dx-card"
        style={{
          width: 160,
          padding: "22px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <button
          className="dx-btn dx-btn-outline"
          onClick={() => navigate(`/comparison-tool/${domainId}`)}
        >
          ← Exit
        </button>
      </div>

      <div style={{ flex: 1, padding: "40px 60px", color: "white" }}>
        <h1 style={{ color: "var(--accent)", marginBottom: 20 }}>
          Edit Metric Values
        </h1>

        <div className="dx-card" style={{ padding: 20 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ padding: 8 }}>Name</th>
                <th style={{ padding: 8 }}>URL</th>
                <th style={{ padding: 8 }}>Language</th>

                {metricList.map(m => (
                  <th key={m.metric_ID} style={{ padding: 8 }}>
                    {m.metric_name}
                  </th>
                ))}

                <th style={{ width: 80 }} />
              </tr>
            </thead>

            <tbody>
              {rows.map(row => (
                <tr key={row.library_ID}>

                  <td style={{ padding: 8 }}>
                    {row.isEditing ? (
                      <input
                        className="dx-input"
                        value={row.library_name}
                        onChange={e =>
                          updateField(row.library_ID, "library_name", e.target.value)
                        }
                      />
                    ) : (
                      row.library_name
                    )}
                  </td>

                  <td style={{ padding: 8 }}>
                    {row.isEditing ? (
                      <input
                        className="dx-input"
                        value={row.url || ""}
                        onChange={e =>
                          updateField(row.library_ID, "url", e.target.value)
                        }
                      />
                    ) : (
                      row.url || "—"
                    )}
                  </td>
                  <td style={{ padding: 8 }}>
                    {row.isEditing ? (
                      <input
                        className="dx-input"
                        value={row.programming_language}
                        onChange={e =>
                          updateField(
                            row.library_ID,
                            "programming_language",
                            e.target.value
                          )
                        }
                      />
                    ) : (
                      row.programming_language
                    )}
                  </td>
                  {metricList.map(m => (
                    <td key={m.metric_ID} style={{ padding: 8 }}>
                      {row.isEditing ? (
                        <input
                          className="dx-input"
                          value={row.metrics[m.metric_name] || ""}
                          onChange={e =>
                            updateMetricValue(
                              row.library_ID,
                              m.metric_name,
                              e.target.value
                            )
                          }
                        />
                      ) : (
                        row.metrics[m.metric_name] ?? "—"
                      )}
                    </td>
                  ))}
                  <td style={{ padding: 8 }}>
                    {row.isEditing ? (
                      <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            className="dx-btn dx-btn-primary"
                            style={{ padding: "4px 8px" }}
                            onClick={() => saveRow(row)}
                          >
                            Save
                          </button>

                          <button
                            className="dx-btn dx-btn-outline"
                            style={{ padding: "4px 8px" }}
                            onClick={() => cancelEdit(row.library_ID)}
                          >
                            Cancel
                          </button>
                        </div>

                    ) : (
                      <button
                        className="dx-btn dx-btn-outline"
                        onClick={() => startEdit(row.library_ID)}
                      >
                        Edit
                      </button>
                    )}
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EditValuesPage;
