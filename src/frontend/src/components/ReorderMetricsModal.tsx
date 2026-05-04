import React from "react";
import { ReorderMetricsModalProps } from "../pages/MetricPageTypes";

export const ReorderMetricsModal: React.FC<ReorderMetricsModalProps> = ({
  isOpen,
  formError,
  categoryOrder,
  reorderCategory,
  categoryMetricOrder,
  metricsById,
  onCategoryChange,
  onMoveMetric,
  onClose,
  onSave,
}) => {
  if (!isOpen) return null;
  const handleReorder = async () => {
    const ok = await onSave();
    if (ok) onClose();
  };

  return (
    <div
      className="dx-backdrop"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        zIndex: 9998,
      }}
    >
      <div
        className="dx-card"
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: "min(760px, 92vw)",
          maxHeight: "85vh",
          overflow: "auto",
          padding: 18,
          position: "relative",
          background: "rgba(18, 18, 26, 0.98)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          boxShadow: "0px 10px 25px rgba(0, 0, 0, 0.2)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
            gap: 12,
            minWidth: 0,
          }}
        >
          <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--accent)" }}>
            Reorder Metrics by Category
          </div>

          <button
            className="dx-btn dx-btn-outline"
            onClick={onClose}
            aria-label="Close"
            style={{ padding: "6px 10px" }}
          >
            ✕
          </button>
        </div>
        {formError && (
          <div
            style={{
              marginBottom: 12,
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(255, 99, 99, 0.45)",
              background: "rgba(255, 99, 99, 0.10)",
              color: "#ffb3b3",
              fontSize: "0.95rem",
            }}
          >
            {formError}
          </div>
        )}
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ opacity: 0.85 }}>Category</label>
            <select
              className="dx-input"
              value={reorderCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
            >
              {categoryOrder.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div
            style={{
              maxHeight: "52vh",
              overflow: "auto",
              padding: 12,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
            }}
          >
            {(categoryMetricOrder[reorderCategory] || []).length > 0 ? (
              (categoryMetricOrder[reorderCategory] || []).map((metricId, index) => {
                const metric = metricsById.get(metricId);
                if (!metric) return null;
                const categoryIds = categoryMetricOrder[reorderCategory] || [];
                return (
                  <div
                    key={metricId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      padding: "10px 0",
                      borderBottom:
                        index < categoryIds.length - 1
                          ? "1px solid rgba(255,255,255,0.08)"
                          : undefined,
                    }}
                  >
                    <div
                      style={{
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        color: "rgba(255,255,255,0.9)",
                      }}
                      title={metric.metric_name}
                    >
                      {metric.metric_name}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        type="button"
                        className="dx-btn dx-btn-outline"
                        disabled={index === 0}
                        onClick={() => onMoveMetric(metricId, "up")}
                        style={{ padding: "5px 8px", fontSize: 12 }}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="dx-btn dx-btn-outline"
                        disabled={index === categoryIds.length - 1}
                        onClick={() => onMoveMetric(metricId, "down")}
                        style={{ padding: "5px 8px", fontSize: 12 }}
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ opacity: 0.7, padding: 12 }}>No metrics found for this category.</div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button className="dx-btn dx-btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button className="dx-btn dx-btn-primary" onClick={handleReorder}>
              Save Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
