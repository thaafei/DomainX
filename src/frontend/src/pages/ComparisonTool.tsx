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
            <table className="dx-table" style={{ tableLayout: "fixed", width: "100%" }}>
              <thead>
                <tr>
                  <th
                    className="dx-th-sticky dx-sticky-left"
                    style={{ textAlign: "left", width: 320, left: 0 }}
                  >
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
                    <td
                      className="dx-sticky-left"
                      style={{
                        padding: 10,
                        fontWeight: 600,
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                        verticalAlign: "top",
                        left: 0,
                      }}
                      title={row.library_name}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div>
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
                            gap: 12,
                            flexWrap: "wrap",
                            alignItems: "center",
                            fontWeight: 400,
                            fontSize: 12.5,
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
                                gap: 5,
                                color: "rgba(255,255,255,0.78)",
                                textDecoration: "none",
                              }}
                            >
                              <Globe size={14} />
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
                                gap: 5,
                                color: "rgba(255,255,255,0.78)",
                                textDecoration: "none",
                              }}
                            >
                              <Github size={14} />
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
                            style={{
                              padding: 10,
                              whiteSpace: "normal",
                              wordBreak: "break-word",
                              verticalAlign: "top",
                            }}
                            title={url || "—"}
                          >
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
                        <td
                          key={m.metric_ID}
                          style={{
                            padding: 10,
                            whiteSpace: "normal",
                            wordBreak: "break-word",
                            verticalAlign: "top",
                          }}
                          title={cellVal != null ? String(cellVal) : "—"}
                        >
                          {cellVal ?? "—"}
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