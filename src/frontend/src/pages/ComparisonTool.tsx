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
  padding: "7px 8px",
  verticalAlign: "top",
  fontSize: 13,
  lineHeight: 1.32,
  overflowWrap: "anywhere",
};

const metricCellStyle: React.CSSProperties = {
  ...cellBaseStyle,
  color: "rgba(255,255,255,0.9)",
};

const headerCellStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 8px",
  fontSize: 12.5,
  lineHeight: 1.25,
  fontWeight: 700,
  color: "rgba(255,255,255,0.92)",
  background: "rgba(20, 24, 38, 0.96)",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  overflowWrap: "anywhere",
};

const compactButtonStyle: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: "var(--accent)",
  cursor: "pointer",
  padding: 0,
  marginTop: 4,
  fontSize: 11.5,
  lineHeight: 1.2,
  alignSelf: "flex-start",
};

const overlayCardStyle: React.CSSProperties = {
  position: "absolute",
  top: "100%",
  left: 0,
  marginTop: 6,
  minWidth: 260,
  maxWidth: 560,
  maxHeight: 280,
  overflow: "auto",
  padding: "10px 12px",
  borderRadius: 12,
  background: "rgba(20, 24, 38, 0.98)",
  border: "1px solid rgba(255,255,255,0.12)",
  boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
  zIndex: 10020,
  color: "rgba(255,255,255,0.92)",
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
  userSelect: "text",
};

const ExpandableText: React.FC<{
  text: string;
  lines?: 2 | 3;
  emptyText?: string;
  textStyle?: React.CSSProperties;
}> = ({ text, lines = 2, emptyText = "—", textStyle }) => {
  const [open, setOpen] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const textRef = React.useRef<HTMLDivElement>(null);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;

    const check = () => {
      setTruncated(
        el.scrollHeight > el.clientHeight + 1 ||
          el.scrollWidth > el.clientWidth + 1
      );
    };

    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [text, lines]);

  React.useEffect(() => {
    if (!open) return;

    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  if (!text) {
    return <div style={textStyle}>{emptyText}</div>;
  }

  const clampStyle = lines === 3 ? clamp3Style : clamp2Style;

  return (
    <div
      ref={wrapRef}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        minWidth: 0,
        width: "100%",
      }}
    >
      <div
        ref={textRef}
        style={{
          ...clampStyle,
          ...textStyle,
          width: "100%",
          overflowWrap: "anywhere",
        }}
        title={open ? "" : text}
      >
        {text}
      </div>

      {truncated && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={compactButtonStyle}
        >
          {open ? "less" : "more"}
        </button>
      )}

      {open && (
        <div style={overlayCardStyle}>
          <div style={{ marginBottom: 8 }}>{text}</div>

          <button
            type="button"
            className="dx-btn dx-btn-outline"
            style={{ padding: "5px 8px", fontSize: 12 }}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(text);
              } catch {}
            }}
          >
            Copy
          </button>
        </div>
      )}
    </div>
  );
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
              }}
            >
              <thead>
                <tr>
                  <th
                    className="dx-th-sticky dx-sticky-left"
                    style={{
                      ...headerCellStyle,
                      textAlign: "left",
                      width: 320,
                      left: 0,
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
                        textAlign: "left",
                        width: 170,
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
                        padding: "8px 10px",
                        fontWeight: 600,
                        verticalAlign: "top",
                        left: 0,
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                      }}
                      title={row.library_name}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: 14.5,
                            lineHeight: 1.35,
                            width: "100%",
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
                                display: "block",
                                width: "100%",
                              }}
                              title={row.url}
                            >
                              <ExpandableText
                                text={row.library_name || ""}
                                lines={2}
                                textStyle={{
                                  fontWeight: 700,
                                  fontSize: 14.5,
                                  lineHeight: 1.35,
                                  color: "var(--accent)",
                                }}
                              />
                            </a>
                          ) : (
                            <ExpandableText
                              text={row.library_name || ""}
                              lines={2}
                              textStyle={{
                                fontWeight: 700,
                                fontSize: 14.5,
                                lineHeight: 1.35,
                              }}
                            />
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
                            style={{
                              ...metricCellStyle,
                              whiteSpace: "normal",
                              wordBreak: "break-word",
                            }}
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
                          style={{
                            ...metricCellStyle,
                            whiteSpace: "normal",
                            wordBreak: "break-word",
                          }}
                          title={cellVal != null ? String(cellVal) : "—"}
                        >
                          <ExpandableText
                            text={cellVal != null ? String(cellVal) : ""}
                            lines={3}
                            emptyText="—"
                          />
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