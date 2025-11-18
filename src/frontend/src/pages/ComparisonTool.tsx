import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface Metric {
  Metric_ID: string;
  Metric_Name: string;
}

interface LibraryMetricRow {
  Library_ID: string;
  Library_Name: string;
  metrics: { [metricName: string]: string | number | null };
}

const DOMAIN_ID = "dd8d1992-d085-41e1-8ed0-7d292d4c2f2f";

const ComparisonToolPage: React.FC = () => {
  const navigate = useNavigate();

  const [domainName, setDomainName] = useState("Domain X");
  const [metricList, setMetricList] = useState<Metric[]>([]);
  const [tableRows, setTableRows] = useState<LibraryMetricRow[]>([]);

  useEffect(() => {
    loadPageData();
  }, []);

  const loadPageData = async () => {
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/api/comparison/${DOMAIN_ID}/`,
        {
          credentials: "include",
        }
      );

      const data = await res.json();

      setMetricList(data.metrics);    //metrics from backend
      setTableRows(data.libraries);   //library rows with metric values
    } catch (err) {
      console.error("Error loading comparison data:", err);
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
          borderRight: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <button
          className="dx-btn dx-btn-outline"
          onClick={() => navigate("/main")}
        >
          ← Back
        </button>
      </div>

      <div
        style={{
          flex: 1,
          padding: "40px 60px",
          position: "relative",
          color: "white",
        }}
      >
        <h1 style={{ color: "var(--accent)", marginBottom: 20 }}>
          {domainName} – Comparison Tool
        </h1>

        <div style={{ display: "flex", gap: 14, marginBottom: 20 }}>
          <button
            className="dx-btn dx-btn-primary"
            onClick={() => navigate("/libraries")}
          >
            + Add Library
          </button>

          <button
            className="dx-btn dx-btn-outline"
            onClick={() => navigate("/edit")}
          >
            ✎ Edit Metric Values
          </button>
        </div>

        {/* TABLE */}
        <div className="dx-card" style={{ padding: 20 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ padding: 8, textAlign: "left" }}>Library</th>
                {metricList.map((m) => (
                  <th key={m.Metric_ID} style={{ padding: 8, textAlign: "left" }}>
                    {m.Metric_Name}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {tableRows.map((row) => (
                <tr
                  key={row.Library_ID}
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <td style={{ padding: 8 }}>{row.Library_Name}</td>

                  {metricList.map((m) => (
                    <td key={m.Metric_ID} style={{ padding: 8 }}>
                      {row.metrics[m.Metric_Name] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {tableRows.length === 0 && (
            <div style={{ padding: 20, opacity: 0.6 }}>
              No libraries found for this domain.
            </div>
          )}
        </div>

        <button
          className="dx-btn dx-btn-primary"
          style={{ marginTop: 30 }}
          onClick={() => navigate("/visualize")}
        >
          Visualize →
        </button>
      </div>
    </div>
  );
};

export default ComparisonToolPage;
