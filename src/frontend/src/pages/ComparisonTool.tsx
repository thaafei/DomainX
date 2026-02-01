import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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

const ComparisonToolPage: React.FC = () => {
  const { domainId } = useParams<{ domainId: string }>();
  const navigate = useNavigate();
  const DOMAIN_ID = domainId;

  const [domainName, setDomainName] = useState("");
  const [metricList, setMetricList] = useState<Metric[]>([]);
  const [tableRows, setTableRows] = useState<LibraryMetricRow[]>([]);

  useEffect(() => {
      if (!DOMAIN_ID) return;
      loadPageData();
    }, [DOMAIN_ID]);


  const getDomainSpecification = async () => {
    try {
      const response = await fetch(apiUrl(`/domain/${DOMAIN_ID}/`), {
        credentials: "include",
      });

      if (!response.ok) throw new Error("Failed to fetch domain specifications");

      const data = await response.json();
      setDomainName(data.domain_name || "");
      return data;
    } catch (error) {
      console.error("Error:", error);
      return null;
    }
  };

  const loadPageData = async () => {
    try {
      await getDomainSpecification();

      const res = await fetch(apiUrl(`/library_metric_values/comparison/${DOMAIN_ID}/`), {
        credentials: "include",
      });

      const contentType = res.headers.get("content-type") || "";
      const text = await res.text();

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);

      if (!contentType.includes("application/json")) {
        throw new Error(
          `Expected JSON, got ${contentType}. Body starts with: ${text.slice(0, 80)}`
        );
      }

      const data = JSON.parse(text);
      setMetricList(Array.isArray(data.metrics) ? data.metrics : []);
      setTableRows(Array.isArray(data.libraries) ? data.libraries : []);
    } catch (err) {
      console.error("Error loading comparison data:", err);
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
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          minHeight: 0,
        }}
      >
        <div className="stars"></div>

        <h1 style={{ color: "var(--accent)", marginBottom: 20 }}>
          {domainName} – Comparison Tool
        </h1>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            width: "100%",
            marginBottom: 20,
            gap: 14,
          }}
        >
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

          <div style={{ flexGrow: 1 }} />

          <button
            className="dx-btn dx-btn-primary"
            onClick={() => navigate(`/visualize/${domainId}`)}
          >
            Visualize →
          </button>
        </div>

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
          <div className="dx-table-wrap dx-table-scroll" style={{ flex: 1, minHeight: 0 }}>
            <table className="dx-table" style={{ tableLayout: "fixed", width: "100%" }}>
              <thead>
                <tr>
                  <th className="dx-th-sticky dx-sticky-left"  style={{ textAlign: "left", width: 200, left: 0  }}>
                    Library
                  </th>

                  {metricList.map((m) => (
                    <th
                      key={m.metric_ID}
                      className="dx-th-sticky"
                      style={{
                        textAlign: "left",
                        width: 160,
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                      }}
                      title={m.metric_name}
                    >
                      {m.metric_name}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {tableRows.map((row) => (
                  <tr
                    key={row.library_ID}
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <td className="dx-sticky-left"
                      style={{
                        padding: 10,
                        fontWeight: 600,
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                        verticalAlign: "top",
                        left: 0
                      }}
                      title={row.library_name}
                    >
                      {row.library_name}
                    </td>

                    {metricList.map((m) => (
                      <td
                        key={m.metric_ID}
                        style={{
                          padding: 10,
                          whiteSpace: "normal",
                          wordBreak: "break-word",
                          verticalAlign: "top",
                        }}
                        title={
                          row.metrics[m.metric_name] != null
                            ? String(row.metrics[m.metric_name])
                            : "—"
                        }
                      >
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
    </div>
  );
};

export default ComparisonToolPage;
