import React, { useEffect, useState, useRef, useLayoutEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiUrl } from "../config/api";
import SuccessNotification from "../components/SuccessNotification";
import { ArrowLeft } from "lucide-react";

interface Metric {
  metric_ID: string;
  metric_name: string;
  description?: string | null;
  value_type: string;
  source_type?: string;
  metric_key?: string | null;
  scoring_dict?: Record<string, number> | null;
}

type AnalysisStatus = "pending" | "running" | "success" | "failed" | string;

interface EditableRow {
  library_ID: string;
  library_name: string;
  github_url: string | null;
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
  maxWidth: 520,
  maxHeight: 260,
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

const normalizeStatus = (
  s?: AnalysisStatus
): "pending" | "running" | "success" | "failed" | "unknown" => {
  const v = String(s || "").toLowerCase().trim();
  if (v === "pending") return "pending";
  if (v === "running") return "running";
  if (v === "success") return "success";
  if (v === "failed") return "failed";
  return "unknown";
};

const statusLabel = (s?: AnalysisStatus) => {
  const v = normalizeStatus(s);
  if (v === "unknown") return "—";
  return v;
};

const statusColor = (s?: AnalysisStatus) => {
  const v = normalizeStatus(s);
  if (v === "failed") return "rgba(255, 143, 143, 0.95)";
  if (v === "success") return "rgba(130, 255, 170, 0.92)";
  if (v === "running") return "rgba(255, 220, 120, 0.92)";
  return "rgba(255,255,255,0.65)";
};

const isAffectedMetric = (m: Metric) =>
  String(m.source_type || "").toLowerCase().trim() !== "manual";

type ConfirmState =
  | null
  | {
      type: "library";
      library_ID: string;
      library_name: string;
    }
  | {
      type: "all";
    };

const ExpandableText: React.FC<{
  text: string;
  lines?: 2 | 3;
  emptyText?: string;
  textStyle?: React.CSSProperties;
}> = ({ text, lines = 2, emptyText = "—", textStyle }) => {
  const [open, setOpen] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
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

  useEffect(() => {
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

const ConfirmModal: React.FC<{
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}> = ({
  open,
  title,
  message,
  confirmText = "Run",
  cancelText = "Cancel",
  busy,
  onCancel,
  onConfirm,
}) => {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 18,
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: "min(700px, 100%)",
          borderRadius: 18,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(18, 20, 28, 0.92)",
          boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
        }}
      >
        <div
          style={{
            padding: "14px 16px",
            background:
              "linear-gradient(90deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
            borderBottom: "1px solid rgba(255,255,255,0.10)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div
              style={{
                fontSize: 12,
                letterSpacing: 0.6,
                opacity: 0.75,
                color: "rgba(220,230,255,0.85)",
              }}
            >
              CONFIRMATION
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 750,
                color: "rgba(235,238,245,0.92)",
              }}
            >
              Are you sure you want to run analysis?
            </div>
          </div>

          <div
            style={{
              width: 10,
              height: 46,
              borderRadius: 10,
              background: "var(--accent)",
              opacity: 0.9,
              boxShadow: "0 0 18px rgba(255,255,255,0.08)",
            }}
          />
        </div>

        <div style={{ padding: 16 }}>
          <div
            style={{
              fontSize: 14,
              color: "rgba(210,216,228,0.86)",
              marginBottom: 10,
            }}
          >
            {title}
          </div>

          <div
            style={{
              fontSize: 14,
              lineHeight: 1.55,
              color: "rgba(210,216,228,0.86)",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 14,
              padding: "12px 12px",
            }}
          >
            {message}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              marginTop: 14,
            }}
          >
            <button
              className="dx-btn dx-btn-outline"
              onClick={onCancel}
              disabled={!!busy}
              style={{
                opacity: busy ? 0.7 : 1,
                borderColor: "rgba(255,255,255,0.16)",
              }}
            >
              {cancelText}
            </button>

            <button
              className="dx-btn dx-btn-primary"
              onClick={onConfirm}
              disabled={!!busy}
              style={{
                opacity: busy ? 0.7 : 1,
                filter: "saturate(1.05)",
              }}
            >
              {busy ? "Starting..." : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ErrorNotification: React.FC<{ show: boolean; message: string }> = ({
  show,
  message,
}) => {
  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 18,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10001,
        background: "rgba(255, 77, 79, 0.92)",
        border: "1px solid rgba(255,255,255,0.18)",
        color: "white",
        padding: "12px 16px",
        borderRadius: 12,
        boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
        maxWidth: "min(720px, calc(100vw - 32px))",
        fontWeight: 700,
        letterSpacing: 0.2,
      }}
    >
      {message}
    </div>
  );
};

const EditMetricValuesModal: React.FC<{
  open: boolean;
  row: EditableRow | null;
  metricList: Metric[];
  pageLoading: boolean;
  fieldErrors: Record<string, string>;
  onClose: () => void;
  onChangeValue: (metricName: string, value: any) => void;
  onSave: () => void;
}> = ({
  open,
  row,
  metricList,
  pageLoading,
  fieldErrors,
  onClose,
  onChangeValue,
  onSave,
}) => {
  if (!open || !row) return null;

  const hasValidationErrors = Object.keys(fieldErrors).length > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !pageLoading) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 18,
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="dx-card"
        style={{
          width: "min(980px, 96vw)",
          maxHeight: "88vh",
          overflow: "auto",
          padding: 18,
          position: "relative",
          background: "rgba(18, 20, 28, 0.96)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
            gap: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontSize: "1.15rem",
                fontWeight: 700,
                color: "var(--accent)",
              }}
            >
              Edit Metric Values
            </div>
            <div
              style={{
                color: "rgba(255,255,255,0.82)",
                fontSize: 14,
                ...clamp2Style,
              }}
              title={row.library_name}
            >
              {row.library_name}
            </div>
          </div>

          <button
            className="dx-btn dx-btn-outline"
            onClick={onClose}
            disabled={pageLoading}
            aria-label="Close"
            style={{ padding: "6px 10px", opacity: pageLoading ? 0.7 : 1 }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 10,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "white",
              minWidth: 0,
            }}
          >
            <div
              style={{
                opacity: 0.75,
                fontSize: 13,
                marginBottom: 4,
                color: "rgba(255,255,255,0.72)",
              }}
            >
              GitHub URL
            </div>
            <ExpandableText
              text={row.github_url || ""}
              lines={3}
              emptyText="—"
              textStyle={{ color: "rgba(255,255,255,0.92)" }}
            />
          </div>

          <div
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "white",
              minWidth: 0,
            }}
          >
            <div
              style={{
                opacity: 0.75,
                fontSize: 13,
                marginBottom: 4,
                color: "rgba(255,255,255,0.72)",
              }}
            >
              URL
            </div>
            <ExpandableText
              text={row.url || ""}
              lines={3}
              emptyText="—"
              textStyle={{ color: "rgba(255,255,255,0.92)" }}
            />
          </div>

          <div
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "white",
            }}
          >
            <div
              style={{
                opacity: 0.75,
                fontSize: 13,
                marginBottom: 4,
                color: "rgba(255,255,255,0.72)",
              }}
            >
              Language
            </div>
            <div style={{ color: "rgba(255,255,255,0.92)" }}>
              {row.programming_language || "—"}
            </div>
          </div>

          <div
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "white",
            }}
          >
            <div
              style={{
                opacity: 0.75,
                fontSize: 13,
                marginBottom: 4,
                color: "rgba(255,255,255,0.72)",
              }}
            >
              API+SCC Status
            </div>
            <div style={{ color: statusColor(row.analysis_status) }}>
              {statusLabel(row.analysis_status)}
            </div>
          </div>

          <div
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "white",
            }}
          >
            <div
              style={{
                opacity: 0.75,
                fontSize: 13,
                marginBottom: 4,
                color: "rgba(255,255,255,0.72)",
              }}
            >
              GitStats Status
            </div>
            <div style={{ color: statusColor(row.gitstats_status) }}>
              {statusLabel(row.gitstats_status)}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          {metricList.map((m) => {
            const cellVal = row.metrics[m.metric_name];
            const descVal = row.metrics[m.metric_name + "_description"] || ""; 
            const fieldError = fieldErrors[m.metric_name];
            const staticDesc = (m.description || "").trim();

            return (
              <div
                key={m.metric_ID}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  padding: "8px 10px",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    minHeight: 42,
                  }}
                >
                  <label
                    style={{
                      color: "rgba(255,255,255,0.88)",
                      fontSize: 13,
                      fontWeight: 600,
                      overflowWrap: "anywhere",
                      ...clamp2Style,
                    }}
                    title={m.metric_name}
                  >
                    {m.metric_name}
                  </label>

                  <div
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.45)",
                      lineHeight: 1.25,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {staticDesc ? `(${staticDesc})` : <span>&nbsp;</span>}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {m.metric_key === "gitstats_report" ? (
                    cellVal ? (
                      <a href={String(cellVal)} target="_blank" rel="noreferrer" style={{ color: "var(--accent)", fontSize: 13 }}>
                        View report
                      </a>
                    ) : (
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>—</div>
                    )
                  ) : m.scoring_dict && Object.keys(m.scoring_dict).length > 0 ? (
                    <select
                      className="dx-input"
                      value={cellVal ?? ""}
                      onChange={(e) => onChangeValue(m.metric_name, e.target.value)}
                      disabled={pageLoading}
                      style={{ borderColor: fieldError ? "rgba(255, 99, 99, 0.75)" : undefined }}
                    >
                      <option value="">-- Select --</option>
                      {Object.keys(m.scoring_dict).map((key) => (
                        <option key={key} value={key}>{key}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="dx-input"
                      placeholder="Enter value..."
                      value={cellVal ?? ""}
                      onChange={(e) => onChangeValue(m.metric_name, e.target.value)}
                      disabled={pageLoading}
                      style={{ borderColor: fieldError ? "rgba(255, 99, 99, 0.75)" : undefined }}
                    />
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>
                    Notes / Comments
                  </div>
                  <textarea
                    className="dx-input"
                    placeholder="Add description..."
                    rows={2}
                    value={row.metrics[`${m.metric_name}_description`] || ""}
                    onChange={(e) => onChangeValue(m.metric_name + "_description", e.target.value)}
                    disabled={pageLoading}
                    style={{
                      fontSize: 12,
                      resize: "none",
                      minHeight: 50,
                      background: "rgba(0,0,0,0.2)",
                    }}
                  />
                </div>

                {fieldError && (
                  <div style={{ color: "#ff9b9b", fontSize: 11, marginTop: 2 }}>
                    {fieldError}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 18,
          }}
        >
          <button
            className="dx-btn dx-btn-outline"
            onClick={onClose}
            disabled={pageLoading}
            style={{ opacity: pageLoading ? 0.7 : 1 }}
          >
            Cancel
          </button>
          <button
            className="dx-btn dx-btn-primary"
            onClick={onSave}
            disabled={pageLoading || hasValidationErrors}
            style={{ opacity: pageLoading || hasValidationErrors ? 0.7 : 1 }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

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

  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [fail, setFail] = useState(false);
  const [failMessage, setFailMessage] = useState("");

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<EditableRow | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const firstColRef = useRef<HTMLTableCellElement>(null);
  const [offset, setOffset] = useState(0);

  const affectedMetrics = metricList.filter(isAffectedMetric);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 1700);
  };

  const showFail = (msg: string) => {
    setFailMessage(msg);
    setFail(true);
    setTimeout(() => setFail(false), 2800);
  };

  useLayoutEffect(() => {
    if (firstColRef.current) {
      const width = firstColRef.current.getBoundingClientRect().width;
      setOffset(width);
    }
  }, [rows]);

  useEffect(() => {
    document.title = "DomainX – Edit";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && confirm && !confirmBusy) setConfirm(null);
      if (e.key === "Escape" && editModalOpen && !pageLoading) {
        setEditModalOpen(false);
        setEditDraft(null);
        setFieldErrors({});
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirm, confirmBusy, editModalOpen, pageLoading]);

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
        const msg = e?.message || "Failed to load table.";
        setErrorMsg(msg);
        showFail(msg);
      } finally {
        setPageLoading(false);
      }
    })();
  }, [DOMAIN_ID]);

  const fetchComparisonRaw = async () => {
    const res = await fetch(
      apiUrl(`/library_metric_values/comparison/${DOMAIN_ID}/`),
      {
        credentials: "include",
      }
    );

    const contentType = res.headers.get("content-type") || "";
    const text = await res.text();

    if (!res.ok) throw new Error(text);
    if (!contentType.includes("application/json")) {
      throw new Error(
        `Expected JSON, got ${contentType}. Body: ${text.slice(0, 100)}`
      );
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

  const validateMetricValue = (metric: Metric, value: any): string => {
    const raw = value == null ? "" : String(value).trim();

    if (raw === "") return "";

    if (metric.scoring_dict && Object.keys(metric.scoring_dict).length > 0) {
      return "";
    }

    if (metric.metric_key === "gitstats_report") {
      return "";
    }

    if (metric.value_type === "int") {
      return /^-?\d+$/.test(raw) ? "" : "Please enter a whole number.";
    }

    if (metric.value_type === "float") {
      return /^-?\d+(\.\d+)?$/.test(raw) ? "" : "Please enter a valid number.";
    }

    if (metric.value_type === "text") {
      return "";
    }

    return "";
  };

  const validateDraft = (draft: EditableRow | null, metrics: Metric[]) => {
    if (!draft) return {};

    const errors: Record<string, string> = {};

    metrics.forEach((metric) => {
      const value = draft.metrics[metric.metric_name];
      const error = validateMetricValue(metric, value);
      if (error) {
        errors[metric.metric_name] = error;
      }
    });

    return errors;
  };

  const startEdit = (id: string) => {
    const row = rows.find((r) => r.library_ID === id);
    if (!row) return;

    const draft = {
      ...row,
      metrics: { ...row.metrics },
      isEditing: true,
    };

    setEditDraft(draft);
    setFieldErrors(validateDraft(draft, metricList));
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    if (pageLoading) return;
    setEditModalOpen(false);
    setEditDraft(null);
    setFieldErrors({});
  };

  const cancelEdit = async () => {
    try {
      setPageLoading(true);
      setInfoMsg("Refreshing…");
      setErrorMsg(null);
      await loadData();
      setInfoMsg(null);
      setEditModalOpen(false);
      setEditDraft(null);
      setFieldErrors({});
    } catch (e: any) {
      const msg = e?.message || "Failed to refresh.";
      setErrorMsg(msg);
      showFail(msg);
    } finally {
      setPageLoading(false);
    }
  };

  const updateEditDraftValue = (
    metric: string,
    value: any,
    isEvidence: boolean = false
  ) => {
    const key = isEvidence ? `${metric}_evidence` : metric;

    setEditDraft((prev) =>
      prev
        ? {
            ...prev,
            metrics: {
              ...prev.metrics,
              [key]: value,
            },
          }
        : prev
    );

    const isDescription = metric.endsWith("_description");
    const metricObj = metricList.find((m) => m.metric_name === metric);
    
    if (metricObj && !isDescription && !isEvidence) {
      const error = validateMetricValue(metricObj, value);
      setFieldErrors((prev) => {
        const next = { ...prev };
        if (error) next[metric] = error;
        else delete next[metric];
        return next;
      });
    }
  };

  const saveRow = async (row: EditableRow) => {
    const validationErrors = validateDraft(row, metricList);
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      showFail("Please fix the invalid values before saving.");
      return;
    }

    try {
      setPageLoading(true);
      setInfoMsg("Saving…");
      setErrorMsg(null);

      const res = await fetch(
        apiUrl(`/library_metric_values/libraries/${row.library_ID}/update-values/`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            metrics: row.metrics, 
          }),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Save failed.");
      }

      await loadData();
      setInfoMsg("Saved.");
      showSuccess("Metric values saved successfully!");
      setTimeout(() => setInfoMsg(null), 1500);
      setEditModalOpen(false);
      setEditDraft(null);
      setFieldErrors({});
    } catch (e: any) {
      const msg = e?.message || "Save failed.";
      setErrorMsg(msg);
      showFail(msg);
    } finally {
      setPageLoading(false);
    }
  };

  const runAnalysisForLibrary = async (libraryId: string) => {
    try {
      setUpdatingLibId(libraryId);
      setErrorMsg(null);

      setInfoMsg("Starting analysis (API+SCC + GitStats)…");

      const res = await fetch(
        apiUrl(`/library_metric_values/libraries/${libraryId}/analyze/`),
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Analyze request failed.");
      }

      showSuccess("Analysis started successfully! Reload later to see results.");
      setInfoMsg("Analysis started. Reload later to see results.");

      setRows((prev) =>
        prev.map((r) =>
          r.library_ID === libraryId
            ? { ...r, analysis_status: "running", gitstats_status: "running" }
            : r
        )
      );

      setEditDraft((prev) =>
        prev && prev.library_ID === libraryId
          ? { ...prev, analysis_status: "running", gitstats_status: "running" }
          : prev
      );
    } catch (e: any) {
      const msg = e?.message || "Failed to start analysis.";
      setErrorMsg(msg);
      showFail(msg);
    } finally {
      setUpdatingLibId(null);
    }
  };

  const runAnalysisForAll = async () => {
    try {
      setUpdatingAll(true);
      setErrorMsg(null);

      setInfoMsg("Starting analysis for all libraries (API+SCC + GitStats)…");

      const res = await fetch(
        apiUrl(`/library_metric_values/${DOMAIN_ID}/analyze-all/`),
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Analyze-all request failed.");
      }

      showSuccess("Analysis started for all libraries! Reload later to see results.");
      setInfoMsg("Analysis started for all libraries. Reload later to see results.");

      setRows((prev) =>
        prev.map((r) => ({
          ...r,
          analysis_status: "running",
          gitstats_status: "running",
        }))
      );
    } catch (e: any) {
      const msg = e?.message || "Failed to start analysis for all.";
      setErrorMsg(msg);
      showFail(msg);
    } finally {
      setUpdatingAll(false);
    }
  };

  const openConfirmLibrary = (row: EditableRow) => {
    setConfirm({
      type: "library",
      library_ID: row.library_ID,
      library_name: row.library_name,
    });
  };

  const openConfirmAll = () => {
    setConfirm({ type: "all" });
  };

  const confirmRun = async () => {
    if (!confirm) return;
    try {
      setConfirmBusy(true);
      if (confirm.type === "library") {
        await runAnalysisForLibrary(confirm.library_ID);
      } else {
        await runAnalysisForAll();
      }
      setConfirm(null);
    } finally {
      setConfirmBusy(false);
    }
  };

  const countStatus = (key: "analysis_status" | "gitstats_status") => {
    const pending = rows.filter(
      (r) => normalizeStatus(r[key]) === "pending"
    ).length;
    const running = rows.filter(
      (r) => normalizeStatus(r[key]) === "running"
    ).length;
    const success = rows.filter(
      (r) => normalizeStatus(r[key]) === "success"
    ).length;
    const failed = rows.filter(
      (r) => normalizeStatus(r[key]) === "failed"
    ).length;
    return { pending, running, success, failed };
  };

  const apiScc = countStatus("analysis_status");
  const gitstats = countStatus("gitstats_status");

  return (
    <div className="dx-bg" style={{ display: "flex", height: "100vh" }}>
      <ConfirmModal
        open={!!confirm}
        title={
          confirm?.type === "library"
            ? `Library: ${confirm.library_name}`
            : "GitHub metric values will be affected for all libraries in this domain."
        }
        message={
          confirm?.type === "library" ? (
            <div>
              <div style={{ marginBottom: 10 }}>
                This will run <b>GitHub API</b>, <b>SCC</b>, and <b>GitStats</b> for:
              </div>

              <div
                style={{
                  marginBottom: 12,
                  padding: "10px 12px",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 10,
                }}
              >
                <b>{confirm.library_name}</b>
              </div>

              <div style={{ marginBottom: 8 }}>
                The following columns will be affected:
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                {affectedMetrics.length > 0 ? (
                  affectedMetrics.map((m) => (
                    <span
                      key={m.metric_ID}
                      style={{
                        padding: "5px 9px",
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.10)",
                        fontSize: 12.5,
                        color: "rgba(235,238,245,0.92)",
                      }}
                    >
                      {m.metric_name}
                    </span>
                  ))
                ) : (
                  <span style={{ opacity: 0.75 }}>No non-manual metrics found.</span>
                )}
              </div>
            </div>
          ) : confirm?.type === "all" ? (
            <div>
              <div style={{ marginBottom: 10 }}>
                This will run <b>GitHub API</b>, <b>SCC</b>, and <b>GitStats</b> for{" "}
                <b>all libraries</b> in this domain.
              </div>

              <div style={{ marginBottom: 8 }}>
                The following columns will be affected:
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                {affectedMetrics.length > 0 ? (
                  affectedMetrics.map((m) => (
                    <span
                      key={m.metric_ID}
                      style={{
                        padding: "5px 9px",
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.10)",
                        fontSize: 12.5,
                        color: "rgba(235,238,245,0.92)",
                      }}
                    >
                      {m.metric_name}
                    </span>
                  ))
                ) : (
                  <span style={{ opacity: 0.75 }}>No non-manual metrics found.</span>
                )}
              </div>
            </div>
          ) : null
        }
        confirmText="Run"
        cancelText="Cancel"
        busy={confirmBusy}
        onCancel={() => {
          if (!confirmBusy) setConfirm(null);
        }}
        onConfirm={confirmRun}
      />

      <EditMetricValuesModal
        open={editModalOpen}
        row={editDraft}
        metricList={metricList}
        pageLoading={pageLoading}
        fieldErrors={fieldErrors}
        onClose={closeEditModal}
        onChangeValue={updateEditDraftValue}
        onSave={() => {
          if (editDraft) saveRow(editDraft);
        }}
      />

      <SuccessNotification show={success} message={successMessage} />
      <ErrorNotification show={fail} message={failMessage} />

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
          <ArrowLeft size={18} /> Back
        </button>
      </div>

      <div
        style={{
          flex: 1,
          padding: "28px 32px",
          color: "white",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          position: "relative",
        }}
      >
        <div className="stars"></div>

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
              className="dx-btn dx-btn-outline dx-btn-inline"
              onClick={openConfirmAll}
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
              Auto-reload is disabled for comfortable editing. When you want
              updated results, click <b>Reload</b> (or refresh the page).
            </div>
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
                    ref={firstColRef}
                    className="dx-th-sticky dx-sticky-left"
                    style={{
                      ...headerCellStyle,
                      left: 0,
                      width: 190,
                    }}
                  >
                    Actions
                  </th>
                  <th
                    className="dx-th-sticky dx-sticky-left"
                    style={{
                      ...headerCellStyle,
                      left: offset,
                      width: 190,
                    }}
                  >
                    Name
                  </th>
                  <th
                    className="dx-th-sticky"
                    style={{
                      ...headerCellStyle,
                      width: 220,
                    }}
                  >
                    GitHub URL
                  </th>
                  <th
                    className="dx-th-sticky"
                    style={{
                      ...headerCellStyle,
                      width: 220,
                    }}
                  >
                    URL
                  </th>
                  <th
                    className="dx-th-sticky"
                    style={{
                      ...headerCellStyle,
                      width: 120,
                    }}
                  >
                    Language
                  </th>
                  {metricList.map((m) => (
                    <th
                      key={m.metric_ID}
                      className="dx-th-sticky"
                      style={{
                        ...headerCellStyle,
                        width: 170,
                        position: "relative",
                      }}
                    >
                      <div style={{ ...clamp2Style, paddingRight: "18px" }}>
                        {m.metric_name}
                      </div>

                      {m.description && (
                        <span
                          title={m.description}
                          style={{
                            position: "absolute",
                            top: "8px",
                            right: "6px",
                            cursor: "help",
                            fontSize: "10px",
                            background: "rgba(255, 255, 255, 0.1)",
                            color: "var(--accent)",
                            width: "14px",
                            height: "14px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: "50%",
                            border: "1px solid rgba(255, 255, 255, 0.2)",
                            opacity: 0.6,
                            transition: "opacity 0.2s",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                          onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.6")}
                        >
                          ?
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rows.map((row, rowIndex) => {
                  const rowUpdating = updatingLibId === row.library_ID;

                  const apiStatus = normalizeStatus(row.analysis_status);
                  const gsStatus = normalizeStatus(row.gitstats_status);

                  const apiDots = apiStatus === "running" ? "..." : "";
                  const gsDots = gsStatus === "running" ? "..." : "";

                  return (
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
                            padding: "8px 8px",
                            verticalAlign: "top",
                            left: 0,
                            whiteSpace: "normal",
                            wordBreak: "break-word",
                            fontSize: 12.5,
                          }}
                        >
                        <div
                          style={{
                            display: "flex",
                            gap: 6,
                            alignItems: "center",
                            flexWrap: "wrap",
                          }}
                        >
                          <button
                              className="dx-btn dx-btn-outline dx-btn-inline"
                              onClick={() => openConfirmLibrary(row)}
                              disabled={pageLoading || rowUpdating}
                              style={{
                                opacity: pageLoading || rowUpdating ? 0.7 : 1,
                                padding: "5px 8px",
                                fontSize: 14,
                                lineHeight: 1.4,
                              }}
                            >
                            {rowUpdating ? "Updating..." : "Update"}
                          </button>

                          <button
                              className="dx-btn dx-btn-outline"
                              onClick={() => startEdit(row.library_ID)}
                              disabled={pageLoading}
                              style={{
                                opacity: pageLoading ? 0.7 : 1,
                                padding: "5px 8px",
                                fontSize: 14,
                                lineHeight: 1.4,
                              }}
                            >
                            Edit
                          </button>
                        </div>

                        <div style={{ marginTop: 5, fontSize: 11.5, lineHeight: 1.22 }}>
                          <div style={{ color: statusColor(row.analysis_status), ...clamp2Style }}>
                            API+SCC: {statusLabel(row.analysis_status)}
                            {apiDots}
                          </div>

                          <div style={{ color: statusColor(row.gitstats_status), ...clamp2Style }}>
                            GitStats: {statusLabel(row.gitstats_status)}
                            {gsDots}
                          </div>
                        </div>
                      </td>

                     <td
                          className="dx-sticky-left"
                          style={{
                            padding: "8px 8px",
                            verticalAlign: "top",
                            left: offset,
                            fontWeight: 600,
                            whiteSpace: "normal",
                            wordBreak: "break-word",
                            fontSize: 14,
                            lineHeight: 1.4,
                          }}
                          title={row.library_name}
                        >
                        <ExpandableText
                          text={row.library_name || ""}
                          lines={2}
                          textStyle={{
                            fontWeight: 600,
                            fontSize: 12.75,
                            lineHeight: 1.28,
                          }}
                        />
                      </td>

                      <td
                        style={{
                          ...metricCellStyle,
                          whiteSpace: "normal",
                          wordBreak: "break-word",
                        }}
                        title={row.github_url || "—"}
                      >
                        <ExpandableText
                          text={row.github_url || ""}
                          lines={3}
                          emptyText="—"
                        />
                      </td>

                      <td
                        style={{
                          ...metricCellStyle,
                          whiteSpace: "normal",
                          wordBreak: "break-word",
                        }}
                        title={row.url || "—"}
                      >
                        <ExpandableText
                          text={row.url || ""}
                          lines={3}
                          emptyText="—"
                        />
                      </td>

                      <td
                        style={{
                          ...metricCellStyle,
                          whiteSpace: "normal",
                          wordBreak: "break-word",
                        }}
                        title={row.programming_language || "—"}
                      >
                        <ExpandableText
                          text={row.programming_language || ""}
                          lines={2}
                          emptyText="—"
                        />
                      </td>

                      {metricList.map((m) => {
                        const cellVal = row.metrics[m.metric_name];
                        const cellDesc = row.metrics[`${m.metric_name}_description`];
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
                                    style={{
                                      color: "var(--accent)",
                                      textDecoration: "none",
                                    }}
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
        position: "relative",
        paddingRight: cellDesc ? "24px" : "8px",
      }}
      title={cellVal != null ? String(cellVal) : "—"}
    >
      <ExpandableText
        text={cellVal != null ? String(cellVal) : ""}
        lines={3}
        emptyText="—"
      />

      {cellDesc && (
        <span
          title={`${cellDesc}`}
          style={{
            position: "absolute",
            top: "6px",
            right: "6px",
            cursor: "help",
            fontSize: "10px",
            fontWeight: "bold",
            color: "var(--accent)",
            background: "rgba(0, 255, 136, 0.12)",
            border: "1px solid rgba(0, 255, 136, 0.25)",
            width: "15px",
            height: "15px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "4px",
            opacity: 0.8,
          }}
        >
          i
        </span>
      )}
    </td>
  );
})}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ marginBottom: 10, marginTop: 10, fontSize: 13, opacity: 0.85 }}>
            <div>
              API+SCC: running {apiScc.running}, success {apiScc.success}, failed{" "}
              {apiScc.failed}
            </div>
            <div>
              GitStats: running {gitstats.running}, success {gitstats.success}, failed{" "}
              {gitstats.failed}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditValuesPage;