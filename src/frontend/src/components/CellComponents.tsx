import { AnalysisStatus } from "../pages/Edit.types";
import { Metric } from "../pages/Edit.types";

export const clamp2Style: React.CSSProperties = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

export const cellBaseStyle: React.CSSProperties = {
  padding: "7px 8px",
  verticalAlign: "top",
  fontSize: 13,
  lineHeight: 1.32,
  overflowWrap: "anywhere",
};

export const metricCellStyle: React.CSSProperties = {
  ...cellBaseStyle,
  color: "rgba(255,255,255,0.9)",
};

export const headerCellStyle: React.CSSProperties = {
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


export const compactButtonStyle: React.CSSProperties = {
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

export const overlayCardStyle: React.CSSProperties = {
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


export const clamp3Style: React.CSSProperties = {
  display: "-webkit-box",
  WebkitLineClamp: 3,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

export const normalizeStatus = (
  s?: AnalysisStatus
): "pending" | "running" | "success" | "failed" | "unknown" => {
  const v = String(s || "").toLowerCase().trim();
  if (v === "pending") return "pending";
  if (v === "running") return "running";
  if (v === "success") return "success";
  if (v === "failed") return "failed";
  return "unknown";
};

export const statusLabel = (s?: AnalysisStatus) => {
  const v = normalizeStatus(s);
  if (v === "unknown") return "—";
  return v;
};

export const statusColor = (s?: AnalysisStatus) => {
  const v = normalizeStatus(s);
  if (v === "failed") return "rgba(255, 143, 143, 0.95)";
  if (v === "success") return "rgba(130, 255, 170, 0.92)";
  if (v === "running") return "rgba(255, 220, 120, 0.92)";
  return "rgba(255,255,255,0.65)";
};

export const isAffectedMetric = (m: Metric) =>
  String(m.source_type || "").toLowerCase().trim() !== "manual";
