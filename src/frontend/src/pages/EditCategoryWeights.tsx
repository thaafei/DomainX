import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiUrl } from "../config/api";
import { ArrowLeft } from "lucide-react";

// Define the shape of our Metric based on your Django Serializer
interface Metric {
  metric_ID: string;
  metric_name: string;
  category: string | null;
  weight: number;
}

const EditCategoryWeights: React.FC = () => {
  const { domainId } = useParams<{ domainId: string }>();
  const navigate = useNavigate();
  
  const [categories, setCategories] = useState<string[]>([]);
  const [metricList, setMetricList] = useState<Metric[]>([]);
  const [matrix, setMatrix] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const RI: Record<number, number> = { 
    1: 0, 2: 0, 3: 0.58, 4: 0.9, 5: 1.12, 6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49 
  };
  useEffect(() => {
    const fetchData = async () => {
      if (!domainId) return;
      try {
        const [catRes, metricsRes, savedRes] = await Promise.all([
          fetch(apiUrl("/metrics/categories/"), { credentials: "include" }),
          fetch(apiUrl("/metrics/"), { credentials: "include" }),
          fetch(apiUrl(`/domain/${domainId}/category-weights/`), { credentials: "include" })
        ]);

        const catData = await catRes.json();
        const metricsData: Metric[] = await metricsRes.json();
        const savedData = await savedRes.json(); 

        // Identify categories currently in use by metrics
        const usedCategories = new Set(metricsData.map(m => m.category?.trim()).filter(Boolean));
        const filteredCategories = (catData?.Categories || []).filter((c: string) => usedCategories.has(c.trim()));
        
        if (metricsData.some(m => !m.category || m.category.trim() === "")) {
          filteredCategories.push("Uncategorized");
        }

        setCategories(filteredCategories);
        setMetricList(metricsData);

        // BUILD MATRIX WITH DEFAULT FALLBACKS
        const initialMatrix: Record<string, Record<string, number>> = {};
        filteredCategories.forEach((r: string) => {
          initialMatrix[r] = {};
          filteredCategories.forEach((c: string) => {
            // Check if the pair exists in saved data; if not, default to 1
            const savedValue = savedData?.ahp_matrix?.[r]?.[c];
            initialMatrix[r][c] = (savedValue !== undefined) ? savedValue : 1;
          });
        });
        
        setMatrix(initialMatrix);
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [domainId]);

  // AHP Math: Calculate weights and consistency ratio
  const ahpResults = useMemo(() => {
    if (categories.length === 0) return { weights: [], cr: 0 };
    const n = categories.length;
    
    const colSums: Record<string, number> = {};
    categories.forEach(col => {
      colSums[col] = categories.reduce((sum, row) => sum + (matrix[row][col] || 1), 0);
    });

    const weights = categories.map(row => {
      const weight = categories.reduce((sum, col) => sum + (matrix[row][col] / colSums[col]), 0) / n;
      return { name: row, weight };
    });

    let lambdaMax = 0;
    categories.forEach((row, i) => {
      let rowWeightedSum = 0;
      categories.forEach((col, j) => {
        rowWeightedSum += matrix[row][col] * weights[j].weight;
      });
      lambdaMax += rowWeightedSum / weights[i].weight;
    });
    lambdaMax = lambdaMax / n;

    const ci = (lambdaMax - n) / (Math.max(1, n - 1));
    const cr = n > 2 ? ci / RI[n] : 0;

    return { weights: weights.sort((a, b) => b.weight - a.weight), cr };
  }, [matrix, categories]);

  const handleUpdate = (row: string, col: string, val: number) => {
    setMatrix(prev => ({
      ...prev,
      [row]: { ...prev[row], [col]: val },
      [col]: { ...prev[col], [row]: 1 / val }
    }));
  };

  const handleSave = async () => {
    // Dictionary for domain.category_weights
    const weightsDict = ahpResults.weights.reduce(
      (acc, curr) => ({ ...acc, [curr.name]: curr.weight }), 
      {}
    );

    try {
      setSaveStatus("Saving...");
      const res = await fetch(apiUrl(`/domain/${domainId}/category-weights/`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          values: weightsDict, // Goes to category_weights
          matrix: matrix       // Goes to ahp_matrix
        }),
        credentials: "include",
      });

      if (res.ok) {
        setSaveStatus("Saved!");
        setTimeout(() => navigate(`/main`), 1000);
      }
    } catch (err) { 
      setSaveStatus("Error.");
    }
  };

  const resetToEqual = () => {
    const init: Record<string, Record<string, number>> = {};
    categories.forEach((r: string) => {
      init[r] = {};
      categories.forEach((c: string) => { init[r][c] = 1; });
    });
    setMatrix(init);
  };

  if (loading) return (
    <div className="dx-bg" style={{ minHeight: "100vh", padding: "40px", color: "white" }}>
      Loading Domain Categories...
    </div>
  );

  return (
    <div className="dx-bg" style={{ minHeight: "100vh", padding: "30px", color: "#e0e0e0", fontFamily: "sans-serif" }}>
      
      {/* Top Navigation Row */}
      <div style={{ maxWidth: "1300px", margin: "0 auto", marginBottom: "20px" }}>
        <button 
          className="dx-btn dx-btn-outline" 
          onClick={() => navigate("/main")}
        >
          ← Back
        </button>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: "1300px", margin: "0 auto 30px" }}>
        <div>
          <h2 style={{ margin: 0, color: "#fff" }}>Domain Weight Configuration</h2>
          <p style={{ color: "#888", fontSize: "0.9rem", marginTop: "5px" }}>
            Compare the importance of categories specifically for this domain.
          </p>
        </div>
        
        <div style={{ display: "flex", gap: "12px" }}>
          <button className="dx-btn dx-btn-outline" onClick={resetToEqual}>Reset to Equal</button>
          <button 
            className="dx-btn" 
            style={{ 
              background: ahpResults.cr > 0.1 ? "#444" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              border: "none",
              opacity: ahpResults.cr > 0.1 ? 0.6 : 1,
              cursor: ahpResults.cr > 0.1 ? "not-allowed" : "pointer"
            }}
            onClick={handleSave} 
            disabled={ahpResults.cr > 0.1}
          >
            {saveStatus || "Save Weights"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: "30px", maxWidth: "1300px", margin: "0 auto", alignItems: "flex-start" }}>
        
        {/* LEFT COLUMN: Pairwise Matrix */}
        <div style={{ 
          flex: 2, 
          background: "#1e212b", 
          padding: "25px", 
          borderRadius: "12px", 
          border: "1px solid #333", 
          overflowX: "auto",
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)" 
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ padding: "10px", borderBottom: "1px solid #333" }}></th>
                {categories.map(c => (
                  <th key={c} style={{ padding: "10px", color: "#4a9eff", fontSize: "0.85rem", borderBottom: "1px solid #333" }}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((rowCat, rowIndex) => (
                <tr key={rowCat} style={{ borderBottom: "1px solid #2a2d3e" }}>
                  <td style={{ padding: "15px 10px", fontWeight: "bold", fontSize: "0.85rem", color: "#fff" }}>
                    {rowCat}
                  </td>
                  {categories.map((colCat, colIndex) => {
                    // Diagonal: Always 1
                    if (rowIndex === colIndex) {
                      return <td key={colCat} style={{ textAlign: "center", color: "#555" }}>1</td>;
                    }
                    
                    // Lower Triangle: Show reciprocal (Read Only)
                    if (rowIndex > colIndex) {
                      const val = matrix[rowCat][colCat];
                      return (
                        <td key={colCat} style={{ textAlign: "center", fontSize: "0.8rem", color: "#777" }}>
                          {val < 1 ? `1/${Math.round(1/val)}` : val.toFixed(1)}
                        </td>
                      );
                    }

                    // Upper Triangle: Selectable Inputs
                    return (
                      <td key={colCat} style={{ textAlign: "center" }}>
                        <select 
                          value={matrix[rowCat][colCat]} 
                          onChange={(e) => handleUpdate(rowCat, colCat, parseFloat(e.target.value))}
                          style={{ 
                            background: "#2a2d3e", 
                            color: "white", 
                            border: "1px solid #444", 
                            borderRadius: "6px", 
                            padding: "5px",
                            cursor: "pointer"
                          }}
                        >
                          <option value={1}>1 (Equal)</option>
                          {[2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                            <React.Fragment key={n}>
                              <option value={n}>{n} (More Imp.)</option>
                              <option value={1/n}>1/{n} (Less Imp.)</option>
                            </React.Fragment>
                          ))}
                        </select>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* RIGHT COLUMN: Results & Math Feedback */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "20px", position: "sticky", top: "20px" }}>
          
          {/* Consistency Gauge */}
          <div style={{ 
            background: "#161821", 
            padding: "20px", 
            borderRadius: "12px", 
            border: `1px solid ${ahpResults.cr > 0.1 ? "#ff4d4f" : "#52c41a"}`,
            transition: "all 0.3s ease"
          }}>
            <h4 style={{ margin: "0 0 10px 0", fontSize: "0.85rem", textTransform: "uppercase", color: "#aaa" }}>
              Consistency Logic
            </h4>
            <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
              <span style={{ fontSize: "1.8rem", fontWeight: "bold", color: ahpResults.cr > 0.1 ? "#ff4d4f" : "#52c41a" }}>
                {(ahpResults.cr * 100).toFixed(1)}%
              </span>
              <span style={{ fontSize: "0.8rem", color: "#666" }}>Ratio (CR)</span>
            </div>
            <p style={{ fontSize: "0.8rem", color: "#aaa", marginTop: "10px", lineHeight: "1.4" }}>
              {ahpResults.cr > 0.1 
                ? "⚠️ Warning: Your choices are logically inconsistent (e.g., A > B, B > C, but C > A). Adjust values before saving." 
                : "✓ Your comparisons are consistent and mathematically sound."}
            </p>
          </div>

          {/* Real-time Weight Ranking */}
          <div style={{ 
            background: "#161821", 
            padding: "20px", 
            borderRadius: "12px", 
            border: "1px solid #333" 
          }}>
            <h4 style={{ margin: "0 0 20px 0", color: "#888", textTransform: "uppercase", fontSize: "0.8rem" }}>
              Calculated Priorities
            </h4>
            {ahpResults.weights.map(item => (
              <div key={item.name} style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", marginBottom: "8px" }}>
                  <span style={{ color: "#fff" }}>{item.name}</span>
                  <span style={{ color: "#4a9eff", fontWeight: "bold" }}>{(item.weight * 100).toFixed(1)}%</span>
                </div>
                <div style={{ height: "8px", width: "100%", background: "#222", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{ 
                    height: "100%", 
                    width: `${item.weight * 100}%`, 
                    background: "linear-gradient(90deg, #4a9eff, #67e8f9)", 
                    borderRadius: "4px", 
                    transition: "width 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)" 
                  }} />
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