import React from "react";
import { useNavigate } from "react-router-dom";

interface Metric {
  metric_ID: string;
  metric_name: string;
  category?: string | null;
  value_type?: string;
}

interface LibraryRow {
  library_ID: string;
  library_name: string;
  metrics: { [metricName: string]: string | number | null };
}

interface VisualizeSidebarProps {
  domainId: string | undefined;
  graphMode: "AHP" | "Metrics";
  setGraphMode: (mode: "AHP" | "Metrics") => void;
  ahpMode: "Overall" | "Individual";
  setAhpMode: (mode: "Overall" | "Individual") => void;
  activeTab: "AHP" | "Metrics" | "Libraries";
  setActiveTab: (tab: "AHP" | "Metrics" | "Libraries") => void;
  metricList: Metric[];
  categories: string[];
  libraries: LibraryRow[];
  selectedMetrics: string[];
  setSelectedMetrics: React.Dispatch<React.SetStateAction<string[]>>;
  selectedLibraries: string[];
  setSelectedLibraries: React.Dispatch<React.SetStateAction<string[]>>;
  selectedIndividualAhpCategories: string[];
  setSelectedIndividualAhpCategories: React.Dispatch<React.SetStateAction<string[]>>;
  categoryWeights: Record<string, number>;
  updateCategoryWeight: (category: string, value: number) => void;
  normalizeWeights: boolean;
  setNormalizeWeights: React.Dispatch<React.SetStateAction<boolean>>;
  normalizeCategoryWeights: () => void;
  resetCategoryWeights: () => void;
  categoryListForAhp: string[];
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setChartData: React.Dispatch<React.SetStateAction<{ metric: string; rows: { label: string; value: number }[] }[] | null>>;
  handleVisualize: () => void;
  handleDownloadAll: () => void;
  chartData: { metric: string; rows: { label: string; value: number }[] }[] | null;
  getCategoryMetricNames: (name: string) => string[];
  isCategoryFullySelected: (name: string) => boolean;
  toggleCategory: (name: string) => void;
  toggleMetric: (name: string) => void;
  toggleLibrary: (id: string) => void;
  toggleIndividualAhpCategory: (category: string) => void;
  toggleSelectAllMetrics: () => void;
  toggleSelectAllLibraries: () => void;
  toggleSelectAllIndividualAhpCategories: () => void;
}

const VisualizeSidebar: React.FC<VisualizeSidebarProps> = ({
  domainId,
  graphMode,
  setGraphMode,
  ahpMode,
  setAhpMode,
  activeTab,
  setActiveTab,
  metricList,
  categories,
  libraries,
  selectedMetrics,
  selectedLibraries,
  selectedIndividualAhpCategories,
  categoryWeights,
  updateCategoryWeight,
  normalizeWeights,
  setNormalizeWeights,
  normalizeCategoryWeights,
  resetCategoryWeights,
  categoryListForAhp,
  error,
  setError,
  setChartData,
  handleVisualize,
  handleDownloadAll,
  chartData,
  isCategoryFullySelected,
  toggleCategory,
  toggleMetric,
  toggleLibrary,
  toggleIndividualAhpCategory,
  toggleSelectAllMetrics,
  toggleSelectAllLibraries,
  toggleSelectAllIndividualAhpCategories,
}) => {
  const navigate = useNavigate();

  return (
    <div
      className="dx-card"
      style={{
        width: 300,
        padding: "22px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        height: "100vh",
        boxSizing: "border-box",
        borderRight: "1px solid rgba(255,255,255,0.08)"
      }}
    >
      <button
        className="dx-btn dx-btn-outline"
        style={{ 
          width: "100%", 
          fontSize: "0.85rem", 
          textAlign: "center",
          padding: "6px 12px",
          opacity: 0.7,
          transition: "opacity 0.2s ease"
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
        onMouseLeave={(e) => e.currentTarget.style.opacity = "0.7"}
        onClick={() => navigate(`/comparison-tool/${domainId}`)}
      >
        ← Back
      </button>

      {/* Primary Section: Graph Mode */}
      <div style={{ marginTop: 6, marginBottom: 10 }}>
        <h3 style={{ 
          margin: 0,
          marginBottom: 6,
          fontSize: "0.85rem", 
          fontWeight: 700,
          color: "rgba(255,255,255,0.85)",
          letterSpacing: "0.5px",
          textTransform: "uppercase"
        }}>
          Graph Mode
        </h3>
        
        {/* Graph Type Selection */}
        <div style={{
          display: "flex",
          gap: 6,
          padding: 3,
          background: "rgba(15,20,35,0.6)",
          borderRadius: "10px",
          border: "1px solid rgba(100,120,200,0.2)",
          marginBottom: 4
        }}>
          <button
            style={{
              flex: 1,
              padding: "6px 10px",
              fontSize: "0.8rem",
              fontWeight: 600,
              borderRadius: "8px",
              border: graphMode === "AHP" ? "2px solid rgba(102,126,234,0.8)" : "2px solid transparent",
              background: graphMode === "AHP" 
                ? "linear-gradient(135deg, rgba(102,126,234,0.25), rgba(118,75,162,0.25))"
                : "transparent",
              color: graphMode === "AHP" ? "#fff" : "rgba(255,255,255,0.6)",
              cursor: "pointer",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              boxShadow: graphMode === "AHP" ? "0 0 20px rgba(102,126,234,0.3), inset 0 1px 0 rgba(255,255,255,0.1)" : "none",
              transform: graphMode === "AHP" ? "translateY(-1px)" : "none"
            }}
            onMouseEnter={(e) => {
              if (graphMode !== "AHP") {
                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                e.currentTarget.style.color = "rgba(255,255,255,0.85)";
              }
            }}
            onMouseLeave={(e) => {
              if (graphMode !== "AHP") {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "rgba(255,255,255,0.6)";
              }
            }}
            onClick={() => {
              setGraphMode("AHP");
              setActiveTab("AHP");
              setChartData(null);
              setError(null);
            }}
          >
            AHP
          </button>
          <button
            style={{
              flex: 1,
              padding: "6px 10px",
              fontSize: "0.8rem",
              fontWeight: 600,
              borderRadius: "8px",
              border: graphMode === "Metrics" ? "2px solid rgba(67,233,123,0.8)" : "2px solid transparent",
              background: graphMode === "Metrics"
                ? "linear-gradient(135deg, rgba(67,233,123,0.25), rgba(56,178,172,0.25))"
                : "transparent",
              color: graphMode === "Metrics" ? "#fff" : "rgba(255,255,255,0.6)",
              cursor: "pointer",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              boxShadow: graphMode === "Metrics" ? "0 0 20px rgba(67,233,123,0.3), inset 0 1px 0 rgba(255,255,255,0.1)" : "none",
              transform: graphMode === "Metrics" ? "translateY(-1px)" : "none"
            }}
            onMouseEnter={(e) => {
              if (graphMode !== "Metrics") {
                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                e.currentTarget.style.color = "rgba(255,255,255,0.85)";
              }
            }}
            onMouseLeave={(e) => {
              if (graphMode !== "Metrics") {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "rgba(255,255,255,0.6)";
              }
            }}
            onClick={() => {
              setGraphMode("Metrics");
              setActiveTab("Metrics");
              setChartData(null);
              setError(null);
            }}
          >
            Metrics
          </button>
        </div>
        
        <p style={{
          margin: 0,
          fontSize: "0.7rem",
          color: "rgba(255,255,255,0.5)",
          lineHeight: 1.3,
          paddingLeft: 2
        }}>
          Choose how results are visualized.
        </p>
      </div>

      {/* View Scope Selection */}
      <div style={{ marginBottom: 10 }}>
        <h4 style={{
          margin: 0,
          marginBottom: 6,
          fontSize: "0.75rem",
          fontWeight: 600,
          color: "rgba(255,255,255,0.75)",
          textTransform: "uppercase",
          letterSpacing: "0.5px"
        }}>
          {graphMode === "AHP" ? "View Scope" : "Data Selection"}
        </h4>
        
        {graphMode === "AHP" ? (
          <>
            <div style={{
              display: "flex",
              gap: 6,
              padding: 3,
              background: "rgba(15,20,35,0.6)",
              borderRadius: "10px",
              border: "1px solid rgba(102,126,234,0.15)",
              marginBottom: 4
            }}>
              <button
                style={{
                  flex: 1,
                  padding: "6px 8px",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  borderRadius: "8px",
                  border: ahpMode === "Overall" ? "2px solid rgba(102,126,234,0.6)" : "2px solid transparent",
                  background: ahpMode === "Overall"
                    ? "rgba(102,126,234,0.2)"
                    : "transparent",
                  color: ahpMode === "Overall" ? "#fff" : "rgba(255,255,255,0.55)",
                  cursor: "pointer",
                  transition: "all 0.25s ease",
                  boxShadow: ahpMode === "Overall" ? "0 0 15px rgba(102,126,234,0.25)" : "none"
                }}
                onMouseEnter={(e) => {
                  if (ahpMode !== "Overall") {
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                    e.currentTarget.style.color = "rgba(255,255,255,0.75)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (ahpMode !== "Overall") {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "rgba(255,255,255,0.55)";
                  }
                }}
                onClick={() => setAhpMode("Overall")}
              >
                Overall
              </button>
              <button
                style={{
                  flex: 1,
                  padding: "6px 8px",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  borderRadius: "8px",
                  border: ahpMode === "Individual" ? "2px solid rgba(102,126,234,0.6)" : "2px solid transparent",
                  background: ahpMode === "Individual"
                    ? "rgba(102,126,234,0.2)"
                    : "transparent",
                  color: ahpMode === "Individual" ? "#fff" : "rgba(255,255,255,0.55)",
                  cursor: "pointer",
                  transition: "all 0.25s ease",
                  boxShadow: ahpMode === "Individual" ? "0 0 15px rgba(102,126,234,0.25)" : "none"
                }}
                onMouseEnter={(e) => {
                  if (ahpMode !== "Individual") {
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                    e.currentTarget.style.color = "rgba(255,255,255,0.75)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (ahpMode !== "Individual") {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "rgba(255,255,255,0.55)";
                  }
                }}
                onClick={() => setAhpMode("Individual")}
              >
                Individual
              </button>
            </div>
          </>
        ) : (
          <div style={{
            display: "flex",
            gap: 6,
            padding: 3,
            background: "rgba(15,20,35,0.6)",
            borderRadius: "10px",
            border: "1px solid rgba(67,233,123,0.15)"
          }}>
            <button
              style={{
                flex: 1,
                padding: "6px 8px",
                fontSize: "0.8rem",
                fontWeight: 600,
                borderRadius: "8px",
                border: activeTab === "Metrics" ? "2px solid rgba(67,233,123,0.6)" : "2px solid transparent",
                background: activeTab === "Metrics"
                  ? "rgba(67,233,123,0.2)"
                  : "transparent",
                color: activeTab === "Metrics" ? "#fff" : "rgba(255,255,255,0.55)",
                cursor: "pointer",
                transition: "all 0.25s ease",
                boxShadow: activeTab === "Metrics" ? "0 0 15px rgba(67,233,123,0.25)" : "none"
              }}
              onMouseEnter={(e) => {
                if (activeTab !== "Metrics") {
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  e.currentTarget.style.color = "rgba(255,255,255,0.75)";
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== "Metrics") {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "rgba(255,255,255,0.55)";
                }
              }}
              onClick={() => setActiveTab("Metrics")}
            >
              Metrics
            </button>
            <button
              style={{
                flex: 1,
                padding: "6px 8px",
                fontSize: "0.8rem",
                fontWeight: 600,
                borderRadius: "8px",
                border: activeTab === "Libraries" ? "2px solid rgba(67,233,123,0.6)" : "2px solid transparent",
                background: activeTab === "Libraries"
                  ? "rgba(67,233,123,0.2)"
                  : "transparent",
                color: activeTab === "Libraries" ? "#fff" : "rgba(255,255,255,0.55)",
                cursor: "pointer",
                transition: "all 0.25s ease",
                boxShadow: activeTab === "Libraries" ? "0 0 15px rgba(67,233,123,0.25)" : "none"
              }}
              onMouseEnter={(e) => {
                if (activeTab !== "Libraries") {
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  e.currentTarget.style.color = "rgba(255,255,255,0.75)";
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== "Libraries") {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "rgba(255,255,255,0.55)";
                }
              }}
              onClick={() => setActiveTab("Libraries")}
            >
              Libraries
            </button>
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          color: "white",
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          transition: "all 0.3s ease"
        }}
      >
        {graphMode === "AHP" && activeTab !== "Libraries" && (
          <>
            {ahpMode === "Overall" && (
              <>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <label className="dx-vis-title" style={{ fontWeight: 600 }}>
                    Overall AHP Settings
                  </label>
                </div>
                <div style={{ fontSize: "0.8rem", opacity: 0.7, lineHeight: 1.5 }}>
                  Adjust category weights to combine into an overall AHP score.
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: 8}}>
                    <button
                    className="dx-btn dx-btn-outline"
                    style={{ padding: "6px 10px", fontSize: "0.8rem" }}
                    onClick={resetCategoryWeights}
                  >
                    Reset Weights
                  </button>
                  <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={normalizeWeights}
                      onChange={() => {
                        setNormalizeWeights(prev => !prev);
                        if (!normalizeWeights) {
                          normalizeCategoryWeights();
                        }
                      }}
                    />
                    Normalize weights
                  </label>
                </div>

                <div
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    minHeight: 0,
                    paddingRight: 6,
                    marginTop: 12
                  }}
                >
                  {categoryListForAhp.length === 0 && (
                    <div style={{ opacity: 0.8 }}>No categories available.</div>
                  )}
                  {categoryListForAhp.map(cat => (
                    <div key={cat} style={{ marginBottom: 10 }}>
                      <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
                        {cat}
                      </label>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          value={categoryWeights[cat] ?? 0}
                          onChange={e => updateCategoryWeight(cat, Number(e.target.value))}
                          style={{ flex: 1 }}
                        />
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={Number((categoryWeights[cat] ?? 0).toFixed(2))}
                          onChange={e => updateCategoryWeight(cat, Number(e.target.value))}
                          style={{ width: 60, fontSize: "0.85rem" }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {ahpMode === "Individual" && (
              <>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <label className="dx-vis-title" style={{ fontWeight: 600 }}>
                    Individual Category AHP
                  </label>
                </div>
                <div style={{ fontSize: "0.8rem", opacity: 0.7 }}>
                  Run AHP separately on each selected category.
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    className="dx-btn dx-btn-outline"
                    style={{ padding: "6px 10px", fontSize: "0.8rem" }}
                    onClick={toggleSelectAllIndividualAhpCategories}
                    disabled={categoryListForAhp.length === 0}
                  >
                    {selectedIndividualAhpCategories.length === categoryListForAhp.length && categoryListForAhp.length > 0
                      ? "Clear All"
                      : "Select All"}
                  </button>
                  <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>
                    {selectedIndividualAhpCategories.length} selected
                  </span>
                </div>
                <div
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    minHeight: 0,
                    paddingRight: 6,
                    marginTop: 12
                  }}
                >
                  {categoryListForAhp.length === 0 && (
                    <div style={{ opacity: 0.8 }}>No categories available.</div>
                  )}
                  {categoryListForAhp.map(cat => (
                    <label key={cat} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <input
                        type="checkbox"
                        checked={selectedIndividualAhpCategories.includes(cat)}
                        onChange={() => toggleIndividualAhpCategory(cat)}
                      />
                      {cat}
                    </label>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {activeTab === "Metrics" && (
          <>
            <label className="dx-vis-title" style={{ fontWeight: 600 }}>
              Select Metrics
            </label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                className="dx-btn dx-btn-outline"
                style={{ padding: "6px 10px", fontSize: "0.85rem" }}
                onClick={toggleSelectAllMetrics}
                disabled={metricList.length === 0}
              >
                {selectedMetrics.length === metricList.length && metricList.length > 0
                  ? "Clear All"
                  : "Select All"}
              </button>
              <span style={{ fontSize: "0.85rem", opacity: 0.8 }}>
                {selectedMetrics.length} selected
              </span>
            </div>
            <div style={{ fontSize: "0.85rem", opacity: 0.8 }}>
              Pick metrics or whole categories.
            </div>

            <div
              style={{
                flex: 1,
                overflowY: "auto",
                minHeight: 0,
                paddingRight: 6
              }}
            >
              {(categories.length
                ? categories
                : Array.from(
                    new Set((metricList || []).map(m => m.category).filter(Boolean) as string[])
                  )
              )
                .filter(cat => metricList.some(m => m.category === cat))
                .map(cat => (
                <div key={cat} style={{ marginBottom: 10 }}>
                  <label style={{ display: "block", fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={isCategoryFullySelected(cat)}
                      onChange={() => toggleCategory(cat)}
                      style={{ marginRight: 6 }}
                    />
                    {cat}
                  </label>
                  <div style={{ paddingLeft: 18, marginTop: 6 }}>
                    {metricList
                      .filter(m => m.category === cat)
                      .map(m => (
                        <label key={m.metric_ID} style={{ display: "block", marginBottom: 6 }}>
                          <input
                            type="checkbox"
                            checked={selectedMetrics.includes(m.metric_name)}
                            onChange={() => toggleMetric(m.metric_name)}
                            style={{ marginRight: 6 }}
                          />
                          {m.metric_name}
                        </label>
                      ))}
                  </div>
                </div>
              ))}

              {metricList.filter(m => !m.category).length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: "block", fontWeight: 600, color: "white" }}>
                    <input
                      type="checkbox"
                      checked={isCategoryFullySelected("Uncategorized")}
                      onChange={() => toggleCategory("Uncategorized")}
                      style={{ marginRight: 6 }}
                    />
                    Uncategorized
                  </label>
                  <div style={{ paddingLeft: 18, marginTop: 6 }}>
                    {metricList
                      .filter(m => !m.category)
                      .map(m => (
                        <label key={m.metric_ID} style={{ display: "block", marginBottom: 6 }}>
                          <input
                            type="checkbox"
                            checked={selectedMetrics.includes(m.metric_name)}
                            onChange={() => toggleMetric(m.metric_name)}
                            style={{ marginRight: 6, color: "white" }}
                          />
                          {m.metric_name}
                        </label>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === "Libraries" && (
          <>
            <label className="dx-vis-title" style={{ fontWeight: 600 }}>
              Select Libraries
            </label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                className="dx-btn dx-btn-outline"
                style={{ padding: "6px 10px", fontSize: "0.85rem" }}
                onClick={toggleSelectAllLibraries}
                disabled={libraries.length === 0}
              >
                {selectedLibraries.length === libraries.length && libraries.length > 0
                  ? "Clear All"
                  : "Select All"}
              </button>
              <span style={{ fontSize: "0.85rem", opacity: 0.8 }}>
                {selectedLibraries.length} selected
              </span>
            </div>
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                minHeight: 0,
                paddingRight: 6
              }}
            >
              {libraries.map(lib => (
                <label key={lib.library_ID} style={{ display: "block", marginBottom: 6 }}>
                  <input
                    type="checkbox"
                    checked={selectedLibraries.includes(lib.library_ID)}
                    onChange={() => toggleLibrary(lib.library_ID)}
                    style={{ marginRight: 6 }}
                  />
                  {lib.library_name}
                </label>
              ))}
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="dx-error" style={{ marginTop: 6 }}>
          {error}
        </div>
      )}

      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
        <button
          className="dx-btn dx-btn-primary"
          onClick={handleVisualize}
        >
          Visualize →
        </button>
        <button
          className="dx-btn dx-btn-outline"
          onClick={handleDownloadAll}
          disabled={!chartData || chartData.length === 0}
        >
          Download All
        </button>
      </div>
    </div>
  );
};

export default VisualizeSidebar;
