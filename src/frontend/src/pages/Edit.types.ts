export interface Metric {
  metric_ID: string;
  metric_name: string;
  description?: string | null;
  value_type: string;
  source_type?: string;
  metric_key?: string | null;
  scoring_dict?: Record<string, number> | null;
  category: string | null;
  option_category?: string | null;
  rule?: string | null;
}

export type AnalysisStatus = "pending" | "running" | "success" | "failed" | string;

export interface EditableRow {
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