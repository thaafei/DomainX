export type ModalMode = "create" | "edit" | null;

export interface Metric {
  metric_ID: string;
  metric_name: string;
  value_type: string;
  source_type?: string | null;
  metric_key?: string | null;
  option_category?: string | null;
  rule?: string | null;
  category?: string | null;
  description?: string | null;
  weight?: number;
  scoring_dict?: Record<string, number> | null;
}
export interface AutoMetricOption {
  key: string;
  label: string;
  description: string;
  value_type: string;
}

export interface AutoMetricOptionsResponse {
  github_api?: AutoMetricOption[];
  scc?: AutoMetricOption[];
  gitstats?: AutoMetricOption[];
}

export interface AddMetricModalProps {
  isOpen: boolean;
  modalMode: ModalMode;
  categories: string[];
  formError: string;
  modalSourceType: string;
  modalMetricKey: string;
  modalType: string;
  modalAutoOptions: AutoMetricOption[];
  modalAvailableCats: any;
  modalOptionCategory: string;
  modalPreview: any;
  newName: string;
  newType: string;
  newSourceType: string;
  newMetricKey: string;
  newCategory: string;
  newDesc: string;
  selectedOptionCategory: string;
  selectedTemplate: string;
  editName: string;
  editType: string;
  editSourceType: string;
  editMetricKey: string;
  editCategory: string;
  editDesc: string;
  editOptionCategory: string;
  editTemplate: string;
  closeModal: () => void;
  onSubmit: () => Promise<boolean>;
  setFormError: (value: string) => void;
  setNewName: (value: string) => void;
  setEditName: (value: string) => void;
  setNewType: (value: string) => void;
  setEditType: (value: string) => void;
  setNewSourceType: (value: string) => void;
  setEditSourceType: (value: string) => void;
  setNewMetricKey: (value: string) => void;
  setEditMetricKey: (value: string) => void;
  setNewCategory: (value: string) => void;
  setEditCategory: (value: string) => void;
  setNewDesc: (value: string) => void;
  setEditDesc: (value: string) => void;
  setSelectedOptionCategory: (value: string) => void;
  setSelectedTemplate: (value: string) => void;
  setEditOptionCategory: (value: string) => void;
  setEditTemplate: (value: string) => void;
  onEditTypeChange: (value: string) => void;
  isRuleType: (type: string) => boolean;
}

export interface ReorderMetricsModalProps {
  isOpen: boolean;
  formError: string;
  categoryOrder: string[];
  reorderCategory: string;
  categoryMetricOrder: Record<string, string[]>;
  metricsById: Map<string, Metric>;
  onCategoryChange: (category: string) => void;
  onMoveMetric: (metricId: string, direction: "up" | "down") => void;
  onClose: () => void;
  onSave: () => Promise<boolean>;
}
