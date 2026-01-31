import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiUrl } from "../config/api";

const EditCategoryWeights: React.FC = () => {
  const { domainId } = useParams<{ domainId: string }>();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<string[]>([]);
  const [localWeights, setLocalWeights] = useState<Record<string, number>>({});
  const [initialWeights, setInitialWeights] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

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
        
        // Ensure every category has a value, default to 1/N for a fresh start
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
  const handleInputChange = (cat: string, value: string) => {
    // Remove any non-numeric characters except the decimal point
    const cleanValue = value.replace(/[^0-9.]/g, "");
    const numericValue = parseFloat(cleanValue) || 0;
    
    // Convert percentage back to decimal (0-1 range) for state
    const decimalValue = numericValue / 100;
    
    // Limit to 1 (100%) to prevent slider overflow
    const finalValue = Math.min(decimalValue, 1);
    
    setLocalWeights(prev => ({ ...prev, [cat]: finalValue }));
    if (saveStatus) setSaveStatus(null);
  };
  // Derived Values
  const totalSum = useMemo(() => 
    categories.reduce((sum, cat) => sum + (localWeights[cat] ?? 0), 0), 
  [localWeights, categories]);

  const isTotalValid = Math.abs(totalSum - 1.0) < 0.001;

  // Actions
  const handleSliderChange = (cat: string, val: number) => {
    setLocalWeights(prev => ({ ...prev, [cat]: val }));
    if (saveStatus) setSaveStatus(null);
  };

  const handleNormalize = () => {
    const equalValue = 1 / categories.length;
    const normalized = categories.reduce((acc: any, cat) => {
      acc[cat] = equalValue;
      return acc;
    }, {});
    setLocalWeights(normalized);
  };

  const handleReset = () => {
    setLocalWeights(initialWeights);
  };

  const saveWeights = async () => {
    if (!isTotalValid) {
      setSaveStatus(`Error: Total must be 100% (Current: ${(totalSum * 100).toFixed(1)}%)`);
      return;
    }
    try {
      const res = await fetch(apiUrl(`/domain/${domainId}/category-weights/`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ values: localWeights }),
      });
      if (res.ok) {
        setSaveStatus("Saved successfully!");
        setTimeout(() => navigate("/main"), 1500);
      }
    } catch (err) {
      setSaveStatus("Network error.");
    }
  };

  // Sort categories for the Preview column (Highest to Lowest)
  const sortedPreview = [...categories].sort((a, b) => (localWeights[b] ?? 0) - (localWeights[a] ?? 0));

  if (loading) return <div className="dx-bg" style={{ color: "white", padding: "20px" }}>Loading...</div>;

  return (
    <div className="dx-bg" style={{ minHeight: "100vh", padding: "20px", color: "#e0e0e0", fontFamily: "sans-serif" }}>
      {/* Header Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: "1200px", margin: "0 auto 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <h3 style={{ margin: 0, color: isTotalValid ? "#52c41a" : "#ff4d4f" }}>Total = {(totalSum * 100).toFixed(0)}%</h3>
          <span style={{ color: isTotalValid ? "#52c41a" : "#ff4d4f", fontSize: "1.2rem" }}>
            {isTotalValid ? "✅" : "⚠️"}
          </span>
        </div>
        
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="dx-btn" style={{ backgroundColor: "#333" }} onClick={handleReset}>↺ Reset</button>
          <button className="dx-btn" style={{ backgroundColor: "#333" }} onClick={handleNormalize}>⇋ Normalize</button>
          <button className="dx-btn dx-btn-primary" onClick={saveWeights} disabled={!isTotalValid}>
             {saveStatus === "Saved successfully!" ? "Saved ✓" : "Save"}
          </button>
          <button className="dx-btn" onClick={() => navigate("/main")} style={{ backgroundColor: "#444" }}>Back</button>
        </div>
      </div>

      {saveStatus && !isTotalValid && (
        <div style={{ textAlign: "center", color: "#ff4d4f", marginBottom: "10px" }}>{saveStatus}</div>
      )}

      <div style={{ display: "flex", gap: "40px", maxWidth: "1200px", margin: "0 auto" }}>
        
        {/* Left Column: Sliders */}
        <div className="dx-card" style={{ flex: 1, padding: "25px" }}>
          <h4 style={{ marginTop: 0, color: "var(--accent)" }}>Weights</h4>
          {categories.map(cat => (
            <div key={cat} style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "0.9rem" }}>{cat}</span>
                
                {/* NEW: Editable Input Field */}
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <input
                    type="text"
                    className="dx-input"
                    style={{ 
                      width: "60px", 
                      padding: "2px 5px", 
                      textAlign: "right", 
                      background: "#1a1a1a", 
                      border: "1px solid #333",
                      borderRadius: "4px",
                      color: "white",
                      fontSize: "0.85rem"
                    }}
                    value={((localWeights[cat] ?? 0) * 100).toFixed(1)}
                    onChange={(e) => handleInputChange(cat, e.target.value)}
                  />
                  <span style={{ fontSize: "0.85rem" }}>%</span>
                </div>
              </div>

              {/* Slider stays synced because it uses the same localWeights[cat] */}
              <input 
                type="range"
                min="0"
                max="1"
                step="0.001" // Increased step precision for smoother typing sync
                value={localWeights[cat] ?? 0}
                onChange={(e) => handleSliderChange(cat, parseFloat(e.target.value))}
                style={{ width: "100%", cursor: "pointer", accentColor: "var(--accent)" }}
              />
            </div>
          ))}
        </div>

        {/* Right Column: Preview Bar Graph */}
        <div className="dx-card" style={{ flex: 1, padding: "25px" }}>
          <h4 style={{ marginTop: 0, color: "var(--accent)" }}>Preview (Priority)</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            {sortedPreview.map(cat => (
              <div key={cat}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "4px" }}>
                  <span>{cat}</span>
                  <span>{((localWeights[cat] ?? 0) * 100).toFixed(1)}%</span>
                </div>
                <div style={{ height: "12px", width: "100%", backgroundColor: "#222", borderRadius: "6px", overflow: "hidden" }}>
                  <div 
                    style={{ 
                      height: "100%", 
                      width: `${(localWeights[cat] ?? 0) * 100}%`, 
                      backgroundColor: "var(--accent)",
                      transition: "width 0.3s ease",
                      opacity: 0.8
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