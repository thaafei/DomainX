import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiUrl } from "../config/api";
import { ArrowLeft } from "lucide-react";

const EditCategoryWeights: React.FC = () => {
  const { domainId } = useParams<{ domainId: string }>();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<string[]>([]);
  const [localWeights, setLocalWeights] = useState<Record<string, number>>({});
  const [initialWeights, setInitialWeights] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
      document.title = "DomainX – Weights";
    if (saveStatus) {
      const timer = setTimeout(() => {
        setSaveStatus(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  useEffect(() => {
    const fetchData = async () => {
      if (!domainId) return;
      try {
        const catRes = await fetch(apiUrl("/metrics/categories/"), { credentials: "include" });
        const catData = await catRes.json();
        const cats = catData?.Categories || [];
        setCategories(cats);

        const weightRes = await fetch(apiUrl(`/domain/${domainId}/category-weights/`), { credentials: "include" });
        let weights: Record<string, number> = {};
        if (weightRes.ok) {
          weights = await weightRes.json();
        }
        
        const balancedWeights = cats.reduce((acc: any, cat: string) => {
          acc[cat] = weights[cat] !== undefined ? weights[cat] : (1 / cats.length);
          return acc;
        }, {});

        setLocalWeights(balancedWeights);
        setInitialWeights(balancedWeights);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [domainId]);

  const totalSum = useMemo(() => 
    categories.reduce((sum, cat) => sum + (localWeights[cat] ?? 0), 0), 
  [localWeights, categories]);

  const isTotalValid = Math.abs(totalSum - 1.0) < 0.001;

  const handleWeightUpdate = (cat: string, decimalVal: number) => {
    setLocalWeights(prev => ({ ...prev, [cat]: Math.max(0, Math.min(1, decimalVal)) }));
    if (saveStatus) setSaveStatus(null);
  };
  const handleSave = async () => {
    if (!isTotalValid || !domainId) return;

    try {
      const response = await fetch(apiUrl(`/domain/${domainId}/category-weights/`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: localWeights }), 
        credentials: "include",
      });

      if (response.ok) {
        setSaveStatus("Weights updated successfully!");
        setTimeout(() => navigate("/main"), 1000); 
      } else {
        setSaveStatus("Error saving weights.");
      }
    } catch (err) {
      console.error(err);
      setSaveStatus("Failed to reach server.");
    }
  };
  const handleNormalize = () => {
    const equalValue = 1 / categories.length;
    setLocalWeights(categories.reduce((acc: any, cat) => ({ ...acc, [cat]: equalValue }), {}));
  };

  const sortedPreview = [...categories].sort((a, b) => (localWeights[b] ?? 0) - (localWeights[a] ?? 0));

  if (loading) return <div className="dx-bg" style={{ color: "white", padding: "20px" }}>Loading...</div>;

  return (
    <div className="dx-bg" style={{ minHeight: "100vh", padding: "30px", color: "#e0e0e0" }}>
      <button
            className="dx-btn dx-btn-outline"
            style={{ width: "fit-content", fontSize: "1rem", marginBottom: 20 }}
            onClick={() => navigate("/main")}
          >
            <ArrowLeft size={18} /> Back
      </button>
      {saveStatus && (
        <div style={{
          position: "fixed",
          top: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          backgroundColor: saveStatus.includes("Error") || saveStatus.includes("Failed") ? "#ff4d4f" : "#52c41a",
          color: "white",
          padding: "12px 24px",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          zIndex: 1000,
          fontWeight: "bold",
          animation: "fadeInOut 0.3s ease"
        }}>
          {saveStatus === "Weights updated successfully!" ? "✓ " : "⚠ "}
          {saveStatus}
        </div>
      )}
      {/* Top Navigation Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: "1300px", margin: "0 auto 30px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ color: isTotalValid ? "#52c41a" : "#ff4d4f", fontWeight: "bold", fontSize: "1.1rem" }}>
            Total = {(totalSum * 100).toFixed(0)}% {isTotalValid ? "✓" : "⚠️"}
          </span>
        </div>
        
        <div style={{ display: "flex", gap: "12px" }}>
          <button className="dx-btn dx-btn-outline" onClick={() => setLocalWeights(initialWeights)}>Reset Equal</button>
          <button className="dx-btn dx-btn-outline" onClick={handleNormalize}>Normalize</button>
          <button 
            className="dx-btn dx-btn-outline"
            onClick={handleSave}
            disabled={!isTotalValid}
            style={{ 
              opacity: isTotalValid ? 1 : 0.5, 
              cursor: isTotalValid ? "pointer" : "not-allowed",
              backgroundColor: isTotalValid ? "" : "#2a2d3e",
              transition: "all 0.3s ease"
            }}
          >
            Save
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: "50px", maxWidth: "1300px", margin: "0 auto" }}>
        
        {/* Left Section: Weights */}
        <div style={{ flex: 1.2 }}>
          <h4 style={{ color: "#888", marginBottom: "20px", textTransform: "uppercase", fontSize: "0.8rem", letterSpacing: "1px" }}>Weights</h4>
          {categories.map(cat => (
            <div key={cat} style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "18px" }}>
              <span style={{ width: "200px", fontSize: "0.9rem", color: "#ccc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {cat}
              </span>

              <input 
                type="range"
                min="0"
                max="1"
                step="0.001"
                value={localWeights[cat] ?? 0}
                onChange={(e) => handleWeightUpdate(cat, parseFloat(e.target.value))}
                style={{ flex: 1, accentColor: "#4a9eff", cursor: "pointer" }}
              />

              <div style={{ display: "flex", alignItems: "center", background: "#1e212b", border: "1px solid #333", borderRadius: "4px", padding: "2px 8px" }}>
                <input 
                  type="text"
                  value={((localWeights[cat] ?? 0) * 100).toFixed(1)}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) handleWeightUpdate(cat, val / 100);
                  }}
                  style={{ background: "transparent", border: "none", color: "white", width: "40px", textAlign: "right", outline: "none", fontSize: "0.85rem" }}
                />
                <span style={{ color: "#666", fontSize: "0.85rem", marginLeft: "4px" }}>%</span>
              </div>
            </div>
          ))}
        </div>

        {/* Right Section: Priority Preview */}
        <div style={{ flex: 1 }}>
          <h4 style={{ color: "#888", marginBottom: "20px", textTransform: "uppercase", fontSize: "0.8rem", letterSpacing: "1px" }}>Preview</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {sortedPreview.map(cat => (
              <div key={cat} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                  <span style={{ color: "#bbb" }}>{cat}</span>
                  <span style={{ fontWeight: "600" }}>{((localWeights[cat] ?? 0) * 100).toFixed(1)}%</span>
                </div>
                <div style={{ height: "14px", width: "100%", backgroundColor: "#1e212b", borderRadius: "3px", overflow: "hidden" }}>
                  <div 
                    style={{ 
                      height: "100%", 
                      width: `${(localWeights[cat] ?? 0) * 100}%`, 
                      backgroundColor: "#4a9eff", 
                      transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)" 
                    }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default EditCategoryWeights;