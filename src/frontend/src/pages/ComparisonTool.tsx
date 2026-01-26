import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useParams } from 'react-router-dom';
import { apiUrl } from "../config/api";

interface Metric {
  metric_ID: string;
  metric_name: string;
}

interface LibraryMetricRow {
  library_ID: string;
  library_name: string;
  metrics: { [metricName: string]: string | number | null };
}
const formatUUID = (id: string) => id.replace(/-/g, "");
const ComparisonToolPage: React.FC = () => {
  const { domainId } = useParams<{ domainId: string }>();
  const navigate = useNavigate();
  const DOMAIN_ID = domainId; 
  
  const [domainName, setDomainName] = useState("");
  const [metricList, setMetricList] = useState<Metric[]>([]);
  const [tableRows, setTableRows] = useState<LibraryMetricRow[]>([]);

  useEffect(() => {
    loadPageData();
  }, []);
  const getDomainSpecification = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/domain/${domainId}/`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch domain specifications");
      }

      const data = await response.json();
      setDomainName(data.domain_name)
      return data;
    } catch (error) {
      console.error("Error:", error);
      return null;
    }
  };
  const loadPageData = async () => {
    try {
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

      const formattedDomainId = DOMAIN_ID;
      getDomainSpecification()
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

      //const data = await res.json();
      setMetricList(data.metrics);
      setTableRows(data.libraries);
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

        <div
          style={{
            display: "flex",
            alignItems: "center",
            width: "100%",
            marginBottom: 20,
          }}
        >

          <div style={{ display: "flex", gap: 14 }}>
            <button
              className="dx-btn dx-btn-primary"
              onClick={() => navigate(`/libraries/${DOMAIN_ID}`)}
            >
              + Add Library
            </button>

            <button
              className="dx-btn dx-btn-outline"
              onClick={() => navigate(`/edit/${DOMAIN_ID}`)}
            >
              ✎ Edit Metric Values
            </button>
          </div>

          <div style={{ flexGrow: 1 }} />

          <button
            className="dx-btn dx-btn-primary"
            onClick={() => navigate(`/visualize/${domainId}`)}
          >
            Visualize →
          </button>
        </div>

        <div className="dx-card" style={{ padding: 20 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ padding: 8, textAlign: "left" }}>Library</th>
                {metricList.map((m) => (
                  <th key={m.metric_ID} style={{ padding: 8, textAlign: "left" }}>
                    {m.metric_name}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {tableRows.map((row) => (
                <tr
                  key={row.library_ID}
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <td style={{ padding: 8 }}>{row.library_name}</td>

                  {metricList.map((m) => (
                    <td key={m.metric_ID} style={{ padding: 8 }}>
                      {row.metrics[m.metric_name] ?? "—"}
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
      </div>
    </div>
  );
};

export default ComparisonToolPage;
