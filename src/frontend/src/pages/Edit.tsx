import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface Metric {
  Metric_ID: string;
  Metric_Name: string;
}

interface EditableRow {
  Library_ID: string;
  Library_Name: string;
  Repository_URL: string | null;
  Programming_Language: string;
  metrics: { [metricName: string]: string | number | null };

  isEditing: boolean;
}

const DOMAIN_ID = "dd8d1992-d085-41e1-8ed0-7d292d4c2f2f";

const EditValuesPage: React.FC = () => {
  const navigate = useNavigate();
  const [metricList, setMetricList] = useState<Metric[]>([]);
  const [rows, setRows] = useState<EditableRow[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const res = await fetch(
      `http://127.0.0.1:8000/api/comparison/${DOMAIN_ID}/`,
      { credentials: "include" }
    );

    const data = await res.json();

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
        r.Library_ID === id ? { ...r, isEditing: true } : r
      )
    );
  };

  const cancelEdit = (id: string) => {
    loadData();
  };

  const updateField = (id: string, field: string, value: any) => {
    setRows(prev =>
      prev.map(r =>
        r.Library_ID === id ? { ...r, [field]: value } : r
      )
    );
  };

  const updateMetricValue = (libId: string, metric: string, value: any) => {
    setRows(prev =>
      prev.map(r =>
        r.Library_ID === libId
          ? { ...r, metrics: { ...r.metrics, [metric]: value } }
          : r
      )
    );
  };

  const saveRow = async (row: EditableRow) => {
    const payload = {
      Library_Name: row.Library_Name,
      Repository_URL: row.Repository_URL,
      Programming_Language: row.Programming_Language,
      metrics: row.metrics,
    };

    const res = await fetch(
      `http://127.0.0.1:8000/api/libraries/${row.Library_ID}/update-values/`,
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
          onClick={() => navigate("/comparison-tool")}
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
                  <th key={m.Metric_ID} style={{ padding: 8 }}>
                    {m.Metric_Name}
                  </th>
                ))}

                <th style={{ width: 80 }} />
              </tr>
            </thead>

            <tbody>
              {rows.map(row => (
                <tr key={row.Library_ID}>

                  <td style={{ padding: 8 }}>
                    {row.isEditing ? (
                      <input
                        className="dx-input"
                        value={row.Library_Name}
                        onChange={e =>
                          updateField(row.Library_ID, "Library_Name", e.target.value)
                        }
                      />
                    ) : (
                      row.Library_Name
                    )}
                  </td>

                  <td style={{ padding: 8 }}>
                    {row.isEditing ? (
                      <input
                        className="dx-input"
                        value={row.Repository_URL || ""}
                        onChange={e =>
                          updateField(row.Library_ID, "Repository_URL", e.target.value)
                        }
                      />
                    ) : (
                      row.Repository_URL || "—"
                    )}
                  </td>
                  <td style={{ padding: 8 }}>
                    {row.isEditing ? (
                      <input
                        className="dx-input"
                        value={row.Programming_Language}
                        onChange={e =>
                          updateField(
                            row.Library_ID,
                            "Programming_Language",
                            e.target.value
                          )
                        }
                      />
                    ) : (
                      row.Programming_Language
                    )}
                  </td>
                  {metricList.map(m => (
                    <td key={m.Metric_ID} style={{ padding: 8 }}>
                      {row.isEditing ? (
                        <input
                          className="dx-input"
                          value={row.metrics[m.Metric_Name] || ""}
                          onChange={e =>
                            updateMetricValue(
                              row.Library_ID,
                              m.Metric_Name,
                              e.target.value
                            )
                          }
                        />
                      ) : (
                        row.metrics[m.Metric_Name] ?? "—"
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
                            onClick={() => cancelEdit(row.Library_ID)}
                          >
                            Cancel
                          </button>
                        </div>

                    ) : (
                      <button
                        className="dx-btn dx-btn-outline"
                        onClick={() => startEdit(row.Library_ID)}
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
