import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiUrl } from "../config/api";

const EditCategoryWeights: React.FC = () => {
  const { domainId } = useParams<{ domainId: string }>();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<string[]>([]);
  const [localWeights, setLocalWeights] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!domainId) return;
      try {
        // Fetch Categories
        const catRes = await fetch(apiUrl("/metrics/categories/"), { credentials: "include" });
        const catData = await catRes.json();
        setCategories(catData?.Categories || []);

        // Fetch Current Weights
        const weightRes = await fetch(apiUrl(`/domain/${domainId}/category-weights/`), { credentials: "include" });
        if (weightRes.ok) {
          const weightData = await weightRes.json();
          setLocalWeights(weightData || {});
        }
      } catch (err) {
        console.error("Error loading weights page:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [domainId]);

  const handleWeightChange = (category: string, value: string) => {
    setLocalWeights((prev) => ({ ...prev, [category]: parseFloat(value) || 0 }));
  };

    const saveWeights = async () => {
        // 1. Calculate the sum across ALL categories, not just the changed ones
        const totalWeight = categories.reduce((sum, cat) => {
            // Use the localWeight if it exists, otherwise assume the default 1.0 
            // (or whatever your default logic is in the table)
            const weight = localWeights[cat] !== undefined ? localWeights[cat] : 1.0;
            return sum + weight;
        }, 0);

        // 2. Validation
        if (Math.abs(totalWeight - 1.0) > 0.0001) {
            setSaveStatus(`Error: Weights must sum to 1.0 (Current Total: ${totalWeight.toFixed(2)})`);
            return; 
        }

        // 3. Proceed to save if valid
        try {
            // We send the full map. It's best to construct the full object here 
            // so the backend definitely gets all metrics, even unchanged ones.
            const fullWeightsPayload = categories.reduce((acc, cat) => {
            acc[cat] = localWeights[cat] !== undefined ? localWeights[cat] : 1.0;
            return acc;
            }, {} as Record<string, number>);

            const res = await fetch(apiUrl(`/domain/${domainId}/category-weights/`), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ values: fullWeightsPayload }),
            });

            if (res.ok) {
            setSaveStatus("Saved successfully!");
            setTimeout(() => navigate("/"), 2000);
            }
        } catch (err) {
            setSaveStatus("Network error.");
        }
    };

  if (loading) return <div className="dx-bg" style={{ color: "white", padding: "20px" }}>Loading...</div>;

  return (
    <div className="dx-bg" style={{ minHeight: "100vh", padding: "40px", display: "flex", justifyContent: "center" }}>
      <div className="dx-card" style={{ width: "100%", maxWidth: "600px", height: "fit-content", padding: "30px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
          <h2 style={{ color: "var(--accent)", margin: 0 }}>Edit Category Weights</h2>
          <button className="dx-btn" onClick={() => navigate("/main")} style={{ backgroundColor: "#444" }}>Back</button>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", color: "white" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #333" }}>
              <th style={{ padding: "12px" }}>Category</th>
              <th style={{ padding: "12px" }}>Weight</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat} style={{ borderBottom: "1px solid #222" }}>
                <td style={{ padding: "12px" }}>{cat}</td>
                <td style={{ padding: "12px" }}>
                  <input
                    type="number"
                    className="dx-input"
                    style={{ width: "100px" }}
                    step="0.1"
                    value={localWeights[cat] ?? 1.0}
                    onChange={(e) => handleWeightChange(cat, e.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ 
            marginTop: "10px", 
            textAlign: "right", 
            color: Math.abs(categories.reduce((sum, cat) => sum + (localWeights[cat] ?? 1.0), 0) - 1) < 0.0001 ? "#52c41a" : "#ff4d4f" 
            }}>
            <strong>
                Total Sum: {categories.reduce((sum, cat) => sum + (localWeights[cat] ?? 1.0), 0).toFixed(2)}
            </strong>
        </div>
        <div style={{ marginTop: "30px" }}>
        <button 
            className="dx-btn dx-btn-primary" 
            style={{ padding: "10px 25px" }} 
            onClick={saveWeights}
            disabled={saveStatus === "Saved successfully!"}
        >
            {saveStatus === "Saved successfully!" ? "Saved" : "Save and Apply Changes"}
        </button>

        {saveStatus && (
            <span style={{ 
            color: saveStatus.includes("Error") || saveStatus.includes("Network") ? "#ff4d4f" : "#52c41a", 
            fontWeight: "bold",
            fontSize: "0.9rem",
            transition: "opacity 0.3s ease"
            }}>
            {saveStatus === "Saved successfully!" && "✓ "} 
            {saveStatus}
            </span>
        )}
        </div>
    </div>
    </div>
  );
};

export default EditCategoryWeights;