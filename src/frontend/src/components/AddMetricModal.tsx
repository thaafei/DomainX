import { AddMetricModalProps } from "../pages/MetricPageTypes";

export const AddMetricModal: React.FC<AddMetricModalProps> = ({
  isOpen,
  modalMode,
  categories,
  formError,
  modalSourceType,
  modalMetricKey,
  modalType,
  modalAutoOptions,
  modalAvailableCats,
  modalOptionCategory,
  modalPreview,
  newName,
  newType,
  newSourceType,
  newMetricKey,
  newCategory,
  newDesc,
  selectedOptionCategory,
  selectedTemplate,
  editName,
  editType,
  editSourceType,
  editMetricKey,
  editCategory,
  editDesc,
  editOptionCategory,
  editTemplate,
  closeModal,
  onSubmit,
  setFormError,
  setNewName,
  setEditName,
  setNewType,
  setEditType,
  setNewSourceType,
  setEditSourceType,
  setNewMetricKey,
  setEditMetricKey,
  setNewCategory,
  setEditCategory,
  setNewDesc,
  setEditDesc,
  setSelectedOptionCategory,
  setSelectedTemplate,
  setEditOptionCategory,
  setEditTemplate,
  onEditTypeChange,
  isRuleType,
}) => {
  if (!isOpen) return null;

  const isCreate = modalMode === "create";
  const title = isCreate ? "Add New Metric" : "Edit Metric";
  const nameValue = isCreate ? newName : editName;
  const typeValue = isCreate ? newType : editType;
  const sourceTypeValue = isCreate ? newSourceType : editSourceType;
  const metricKeyValue = isCreate ? newMetricKey : editMetricKey;
  const categoryValue = isCreate ? newCategory : editCategory;
  const descValue = isCreate ? newDesc : editDesc;
  const optionCategoryValue = isCreate ? selectedOptionCategory : editOptionCategory;
  const templateValue = isCreate ? selectedTemplate : editTemplate;

  const changeSourceType = (value: string) => {
    setFormError("");
    if (isCreate) {
      setNewSourceType(value);
      setNewMetricKey("");
      setSelectedOptionCategory("");
      setSelectedTemplate("");
      if (value === "manual") {
        setNewType("float");
        setNewDesc("");
      }
    } else {
      setEditSourceType(value);
      setEditMetricKey("");
      setEditOptionCategory("");
      setEditTemplate("");
      if (value === "manual") {
        setEditType("float");
        setEditDesc("");
      }
    }
  };

  const changeMetricKey = (selectedKey: string) => {
    const selectedOption = modalAutoOptions.find((x) => x.key === selectedKey);
    setFormError("");

    if (isCreate) {
      setNewMetricKey(selectedKey);
      setSelectedOptionCategory("");
      setSelectedTemplate("");
      if (selectedOption) {
        setNewType(selectedOption.value_type);
        setNewDesc(selectedOption.description || "");
      }
    } else {
      setEditMetricKey(selectedKey);
      setEditOptionCategory("");
      setEditTemplate("");
      if (selectedOption) {
        setEditType(selectedOption.value_type);
        setEditDesc(selectedOption.description || "");
      }
    }
  };

  const handleSubmit = async () => {
    const ok = await onSubmit();
    if (ok) closeModal();
  };

  return (
    <div
      className="dx-backdrop"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        zIndex: 9999,
      }}
    >
      <div
        className="dx-card"
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: "min(900px, 92vw)",
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
            {title}
          </div>

          <button
            className="dx-btn dx-btn-outline"
            onClick={closeModal}
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

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ opacity: 0.85 }}>Metric Name</label>
            <input
              className="dx-input"
              value={nameValue}
              onChange={(e) => {
                setFormError("");
                isCreate ? setNewName(e.target.value) : setEditName(e.target.value);
              }}
              maxLength={100}
              placeholder="e.g. Commits (Last 5 Years)"
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ opacity: 0.85 }}>Source Type</label>
            <select
              className="dx-input"
              value={sourceTypeValue}
              onChange={(e) => changeSourceType(e.target.value)}
            >
              <option value="manual" className="dx-input-select">
                Manual
              </option>
              <option value="github_api" className="dx-input-select">
                GitHub API
              </option>
              <option value="scc" className="dx-input-select">
                SCC
              </option>
              <option value="gitstats" className="dx-input-select">
                GitStats
              </option>
            </select>
          </div>

          {modalSourceType !== "manual" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ opacity: 0.85 }}>System Metric</label>
              <select
                className="dx-input"
                value={metricKeyValue}
                onChange={(e) => changeMetricKey(e.target.value)}
              >
                <option value="">-- Select System Metric --</option>
                {modalAutoOptions.map((opt) => (
                  <option key={opt.key} value={opt.key} className="dx-input-select">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ opacity: 0.85 }}>Type</label>
            <select
              className="dx-input"
              value={typeValue}
              onChange={(e) => {
                const val = e.target.value;
                setFormError("");
                if (modalSourceType !== "manual") return;
                if (isCreate) setNewType(val);
                else onEditTypeChange(val);
              }}
              disabled={modalSourceType !== "manual"}
            >
              <option value="float" className="dx-input-select">
                Float
              </option>
              <option value="int" className="dx-input-select">
                Integer
              </option>
              <option value="bool" className="dx-input-select">
                Boolean
              </option>
              <option value="range" className="dx-input-select">
                Range
              </option>
              <option value="text" className="dx-input-select">
                Text
              </option>
              <option value="date" className="dx-input-select">Date</option>
              <option value="time" className="dx-input-select">Time</option>
              <option value="datetime" className="dx-input-select">Date & Time</option>
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ opacity: 0.85 }}>Category (optional)</label>
            <select
              className="dx-input"
              value={categoryValue}
              onChange={(e) => {
                setFormError("");
                isCreate ? setNewCategory(e.target.value) : setEditCategory(e.target.value);
              }}
              style={{ borderColor: "var(--accent)" }}
            >
              <option className="dx-input-select" value="">
                -- Select Category --
              </option>
              {categories.map((catName) => (
                <option className="dx-input-select" key={catName} value={catName}>
                  {catName}
                </option>
              ))}
            </select>
          </div>

          <div />

          {modalSourceType === "manual" && isRuleType(modalType) && (
            <div
              style={{
                gridColumn: "1 / -1",
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ opacity: 0.85 }}>Input Category</label>
                <select
                  className="dx-input"
                  value={optionCategoryValue}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFormError("");
                    if (isCreate) {
                      setSelectedOptionCategory(v);
                      setSelectedTemplate("");
                    } else {
                      setEditOptionCategory(v);
                      setEditTemplate("");
                    }
                  }}
                  style={{ borderColor: "var(--accent)" }}
                >
                  <option value="">-- Select Input Category --</option>
                  {Object.entries(modalAvailableCats).map(([key, cat]: [string, any]) => (
                    <option key={key} value={key} style={{ color: "black" }}>
                      {cat.display_name || key}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ opacity: 0.85 }}>Scoring Rule (template)</label>
                <select
                  className="dx-input"
                  value={templateValue}
                  onChange={(e) => {
                    setFormError("");
                    isCreate ? setSelectedTemplate(e.target.value) : setEditTemplate(e.target.value);
                  }}
                  disabled={!modalOptionCategory}
                  style={{ backgroundColor: "rgba(var(--accent-rgb), 0.1)" }}
                >
                  <option value="">-- Select Template --</option>
                  {(modalOptionCategory
                    ? Object.keys(modalAvailableCats?.[modalOptionCategory]?.templates || {})
                    : []
                  ).map((tKey) => (
                    <option key={tKey} value={tKey} style={{ color: "black" }}>
                      {tKey.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>

              {modalPreview && (
                <div
                  style={{
                    gridColumn: "1 / -1",
                    padding: "10px 12px",
                    border: "1px dashed var(--accent)",
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.03)",
                    color: "var(--accent)",
                    overflowWrap: "anywhere",
                  }}
                >
                  <div style={{ fontSize: "0.85rem", marginBottom: 6, opacity: 0.9 }}>
                    Rule Preview
                  </div>
                  <code style={{ display: "block", whiteSpace: "pre-wrap", color: "inherit" }}>
                    {JSON.stringify(modalPreview, null, 2)}
                  </code>
                </div>
              )}
            </div>
          )}

          <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ opacity: 0.85 }}>Description (optional)</label>
            <textarea
              className="dx-input"
              value={descValue}
              onChange={(e) => {
                setFormError("");
                isCreate ? setNewDesc(e.target.value) : setEditDesc(e.target.value);
              }}
              placeholder="Description…"
              rows={4}
              style={{
                resize: "vertical",
                minHeight: 110,
                paddingTop: 10,
                lineHeight: 1.35,
                borderColor: "rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.03)",
              }}
            />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
          <button className="dx-btn dx-btn-outline" onClick={closeModal}>
            Cancel
          </button>
          <button className="dx-btn dx-btn-primary" onClick={handleSubmit}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
