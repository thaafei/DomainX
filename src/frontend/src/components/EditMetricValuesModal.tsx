import { EditableRow, Metric } from "../pages/Edit.types"
import { clamp2Style, statusColor, statusLabel} from "./CellComponents";
import ExpandableText from "./ExpandableText";

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
                     ) : m.value_type === "date" ? (
                              <input
                                type="date"
                                className="dx-input"
                                value={cellVal ?? ""}
                                onChange={(e) => onChangeValue(m.metric_name, e.target.value)}
                                disabled={pageLoading}
                                style={{ borderColor: fieldError ? "rgba(255, 99, 99, 0.75)" : undefined }}
                              />
                            ) : m.value_type === "time" ? (
                              <input
                                type="time"
                                className="dx-input"
                                value={cellVal ?? ""}
                                onChange={(e) => onChangeValue(m.metric_name, e.target.value)}
                                disabled={pageLoading}
                                style={{ borderColor: fieldError ? "rgba(255, 99, 99, 0.75)" : undefined }}
                              />
                            ) : m.value_type === "datetime" ? (
                              <input
                                type="datetime-local"
                                className="dx-input"
                                value={cellVal ?? ""}
                                onChange={(e) => onChangeValue(m.metric_name, e.target.value)}
                                disabled={pageLoading}
                                style={{ borderColor: fieldError ? "rgba(255, 99, 99, 0.75)" : undefined }}
                              />
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

export default EditMetricValuesModal