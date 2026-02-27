import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BarChart3 } from "lucide-react";

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
  activeTab: "Metrics" | "Libraries";
  setActiveTab: (tab: "Metrics" | "Libraries") => void;
  metricList: Metric[];
  categories: string[];
  libraries: LibraryRow[];
  selectedMetrics: string[];
  setSelectedMetrics: React.Dispatch<React.SetStateAction<string[]>>;
  selectedLibraries: string[];
  setSelectedLibraries: React.Dispatch<React.SetStateAction<string[]>>;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setChartData: React.Dispatch<React.SetStateAction<{ metric: string; rows: { label: string; value: number }[] }[] | null>>;
  handleVisualize: () => void;
  handleDownloadAll: () => void;
  handleClear: () => void;
  chartData: { metric: string; rows: { label: string; value: number }[] }[] | null;
  getCategoryMetricNames: (name: string) => string[];
  isCategoryFullySelected: (name: string) => boolean;
  toggleCategory: (name: string) => void;
  toggleMetric: (name: string) => void;
  toggleLibrary: (id: string) => void;
  toggleSelectAllMetrics: () => void;
  toggleSelectAllLibraries: () => void;
}

const VisualizeSidebar: React.FC<VisualizeSidebarProps> = ({
  domainId,
  activeTab,
  setActiveTab,
  metricList,
  categories,
  libraries,
  selectedMetrics,
  selectedLibraries,
  error,
  setError,
  setChartData,
  handleVisualize,
  handleDownloadAll,
  handleClear,
  chartData,
  isCategoryFullySelected,
  toggleCategory,
  toggleMetric,
  toggleLibrary,
  toggleSelectAllMetrics,
  toggleSelectAllLibraries,
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
        <ArrowLeft size={18} /> Back
      </button>

      {/* View Scope Selection */}
      <div style={{ marginBottom: 10 }}>
        <h4 className="dx-vis-title" style={{ paddingBottom: "5px", fontWeight: 600 }}>
          Data Selection
        </h4>
        
        
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
        {activeTab === "Metrics" && (
          <>
            <label className="dx-vis-title" style={{ fontWeight: 600 }}>
              Select Metrics
            </label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                className="dx-btn dx-btn-outline"
                style={{ padding: "5px 10px", fontSize: "0.85rem" }}
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
          <BarChart3 size={18} />
              Visualize
        </button>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            style={{flex: 1}}
            className="dx-btn dx-btn-outline"
            onClick={handleDownloadAll}
            disabled={!chartData || chartData.length === 0}
          >
            Download All
          </button>
          {<button
            style={{flex: 1}}
            className="dx-btn dx-btn-outline"
            onClick={handleClear}
            disabled={!chartData || chartData.length === 0}
          >
            Clear All
          </button>}
        </div>
      </div>
    </div>
  );
};

export default VisualizeSidebar;
