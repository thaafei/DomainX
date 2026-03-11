import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiUrl } from "../config/api";
import {
  BarChart3,
  Plus,
  Pencil,
  Download,
  ArrowLeft,
  Globe,
  Github,
} from "lucide-react";

interface Metric {
  metric_ID: string;
  metric_name: string;
  metric_key?: string | null;
}

interface LibraryMetricRow {
  library_ID: string;
  library_name: string;
  github_url?: string | null;
  url?: string | null;
  metrics: { [metricName: string]: string | number | null };
}

const clamp2Style: React.CSSProperties = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

const clamp3Style: React.CSSProperties = {
  display: "-webkit-box",
  WebkitLineClamp: 3,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

const cellBaseStyle: React.CSSProperties = {
  padding: "9px 10px",
  verticalAlign: "top",
  fontSize: 13.5,
  lineHeight: 1.4,
  overflowWrap: "anywhere",
};

const metricCellStyle: React.CSSProperties = {
  ...cellBaseStyle,
  color: "rgba(255,255,255,0.9)",
};

const headerCellStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 10px",
  fontSize: 13,
  lineHeight: 1.3,
  fontWeight: 700,
  color: "rgba(255,255,255,0.92)",
  background: "rgba(20, 24, 38, 0.96)",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  overflowWrap: "anywhere",
};

const ComparisonToolPage: React.FC = () => {
  const { domainId } = useParams<{ domainId: string }>();
  const navigate = useNavigate();
  const DOMAIN_ID = domainId;

  const [domainName, setDomainName] = useState("");
  const [metricList, setMetricList] = useState<Metric[]>([]);
  const [tableRows, setTableRows] = useState<LibraryMetricRow[]>([]);

  useEffect(() => {
    if (!DOMAIN_ID) return;
    document.title = "DomainX – Comparison";
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

      const res = await fetch(
        apiUrl(`/library_metric_values/comparison/${DOMAIN_ID}/`),
        {
          credentials: "include",
        }
      );

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

  const exportCSV = () => {
    const SITE_BASE = window.location.origin;

    const esc = (v: any) => {
      const s = v == null ? "" : String(v);
      const needsQuotes = /[",\n]/.test(s);
      const safe = s.replace(/"/g, '""');
      return needsQuotes ? `"${safe}"` : safe;
    };

    const headers = [
      "Library Name",
      "Library URL",
      "GitHub URL",
      ...metricList.map((m) =>
        m.metric_key === "gitstats_report" ? "GitStats Report URL" : m.metric_name
      ),
    ];

    const rows = tableRows.map((row) => {
      const cells = [
        row.library_name,
        row.url || "",
        row.github_url || "",
        ...metricList.map((m) => {
          const v = row.metrics[m.metric_name];

          if (m.metric_key === "gitstats_report") {
            const url = v ? String(v) : "";

            if (!url) return "";
            if (url.startsWith("http://") || url.startsWith("https://")) return url;
            if (url.startsWith("/")) return `${SITE_BASE}${url}`;

            return url;
          }

          return v ?? "";
        }),
      ];

      return cells.map(esc).join(",");
    });

    const csv = [headers.map(esc).join(","), ...rows].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const safeDomain = (domainName || "comparison").replace(/[^\w\-]+/g, "_");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeDomain}_comparison.csv`;

    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
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
          <ArrowLeft size={18} /> Back
        </button>
      </div>

      <div
        style={{
          flex: 1,
          padding: "28px 32px",
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
              className="dx-btn dx-btn-primary"
              onClick={() => navigate(`/libraries/${DOMAIN_ID}`)}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <Plus size={18} />
              Add Library
            </button>

            <button
              className="dx-btn dx-btn-outline"
              onClick={() => navigate(`/edit/${DOMAIN_ID}`)}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <Pencil size={18} />
              Edit Metric Values
            </button>

            <div style={{ flexGrow: 1 }} />

            <button
              className="dx-btn dx-btn-outline"
              onClick={exportCSV}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
              disabled={tableRows.length === 0 || metricList.length === 0}
              title="Download table as CSV"
            >
              <Download size={18} />
              Export CSV
            </button>

            <button
              className="dx-btn dx-btn-primary"
              onClick={() => navigate(`/visualize/${domainId}`)}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <BarChart3 size={18} />
              Visualize
            </button>
          </div>

          <div className="dx-table-wrap dx-table-scroll" style={{ flex: 1, minHeight: 0 }}>
            <table
              className="dx-table"
              style={{
                tableLayout: "fixed",
                width: "100%",
                borderCollapse: "separate",
                borderSpacing: 0,
              }}
            >
              <thead>
                <tr>
                  <th
                    className="dx-th-sticky dx-sticky-left"
                    style={{
                      ...headerCellStyle,
                      width: 300,
                      minWidth: 300,
                      maxWidth: 300,
                      left: 0,
                      zIndex: 3,
                    }}
                  >
                    Library
                  </th>

                  {metricList.map((m) => (
                    <th
                      key={m.metric_ID}
                      className="dx-th-sticky"
                      style={{
                        ...headerCellStyle,
                        width: 170,
                        minWidth: 170,
                        maxWidth: 170,
                      }}
                      title={m.metric_name}
                    >
                      <div style={clamp2Style}>{m.metric_name}</div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {tableRows.map((row, rowIndex) => (
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
                        ...cellBaseStyle,
                        fontWeight: 600,
                        left: 0,
                        background:
                          rowIndex % 2 === 0
                            ? "rgba(15,18,30,0.98)"
                            : "rgba(18,22,34,0.98)",
                        zIndex: 2,
                        width: 300,
                        minWidth: 300,
                        maxWidth: 300,
                      }}
                      title={row.library_name}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <div
                          style={{
                            ...clamp2Style,
                            fontWeight: 700,
                            fontSize: 14.5,
                            lineHeight: 1.35,
                          }}
                        >
                          {row.url ? (
                            <a
                              href={row.url}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                color: "var(--accent)",
                                textDecoration: "none",
                                fontWeight: 700,
                              }}
                              title={row.url}
                            >
                              {row.library_name}
                            </a>
                          ) : (
                            row.library_name
                          )}
                        </div>

                        <div
                          style={{
                            display: "flex",
                            gap: 10,
                            flexWrap: "wrap",
                            alignItems: "center",
                            fontWeight: 400,
                            fontSize: 12,
                            lineHeight: 1.2,
                          }}
                        >
                          {row.url && (
                            <a
                              href={row.url}
                              target="_blank"
                              rel="noreferrer"
                              title={row.url}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                color: "rgba(255,255,255,0.72)",
                                textDecoration: "none",
                              }}
                            >
                              <Globe size={13} />
                              Website
                            </a>
                          )}

                          {row.github_url && (
                            <a
                              href={row.github_url}
                              target="_blank"
                              rel="noreferrer"
                              title={row.github_url}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                color: "rgba(255,255,255,0.72)",
                                textDecoration: "none",
                              }}
                            >
                              <Github size={13} />
                              GitHub
                            </a>
                          )}
                        </div>
                      </div>
                    </td>

                    {metricList.map((m) => {
                      const cellVal = row.metrics[m.metric_name];

                      if (m.metric_key === "gitstats_report") {
                        const url = cellVal ? String(cellVal) : null;
                        return (
                          <td
                            key={m.metric_ID}
                            style={metricCellStyle}
                            title={url || "—"}
                          >
                            <div style={clamp2Style}>
                              {url ? (
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ color: "var(--accent)", textDecoration: "none" }}
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
                          style={metricCellStyle}
                          title={cellVal != null ? String(cellVal) : "—"}
                        >
                          <div style={clamp3Style}>{cellVal ?? "—"}</div>
                        </td>
                      );
                    })}
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