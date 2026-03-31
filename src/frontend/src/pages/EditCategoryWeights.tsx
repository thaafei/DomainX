import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiUrl } from "../config/api";
import AuthTransition from "../components/AuthTransition";

const AHP_QUALITIES = [
  "Installability",
  "Correctness and Verifiability",
  "Surface Reliability",
  "Surface Robustness",
  "Surface Usability",
  "Maintainability",
  "Reusability",
  "Surface Understandability",
  "Visibility/Transparency"
] as const;

type QualityName = typeof AHP_QUALITIES[number];

interface CategoryWeight {
  name: QualityName;
  weight: number;
}

interface SavedData {
  ahp_matrix?: Record<string, Record<string, number>>;
  category_weights?: Record<string, number>;
}

const EditCategoryWeights: React.FC = () => {
  const { domainId } = useParams<{ domainId: string }>();
  const navigate = useNavigate();

  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [ahpCategories, setAhpCategories] = useState<QualityName[]>([]);
  const [matrix, setMatrix] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [showMissingWarning, setShowMissingWarning] = useState(false);

  const RI: Record<number, number> = {
    1: 0, 2: 0, 3: 0.58, 4: 0.9, 5: 1.12, 6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49
  };

  useEffect(() => {
    document.title = "DomainX - Edit Category Weights";

    const fetchData = async () => {
      if (!domainId) return;
      try {
        const [catRes, savedRes] = await Promise.all([
          fetch(apiUrl("/metrics/categories/"), { credentials: "include" }),
          fetch(apiUrl(`/domain/${domainId}/category-weights/`), { credentials: "include" })
        ]);

        const catData = await catRes.json();
        const savedData: SavedData = await savedRes.json();

        // Get all categories from the JSON
        const allCategoriesFromJson = catData?.Categories || [];
        setAllCategories(allCategoriesFromJson);

        // Added explicit type for parameter 'quality'
        const validAhpCategories = AHP_QUALITIES.filter((quality: QualityName) =>
          allCategoriesFromJson.includes(quality)
        );

        // Check if any required categories are missing
        const missingCategories = AHP_QUALITIES.filter((quality: QualityName) =>
          !allCategoriesFromJson.includes(quality)
        );

        if (missingCategories.length > 0) {
          console.warn("Missing AHP categories:", missingCategories);
          setShowMissingWarning(true);
        }

        setAhpCategories(validAhpCategories);

        // Initialize matrix with default values (1 = equal importance)
        const initialMatrix: Record<string, Record<string, number>> = {};
        validAhpCategories.forEach((row: QualityName) => {
          initialMatrix[row] = {};
          validAhpCategories.forEach((col: QualityName) => {
            const savedValue = savedData?.ahp_matrix?.[row]?.[col];
            initialMatrix[row][col] = (savedValue !== undefined) ? savedValue : 1;
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
    const n = ahpCategories.length;
    if (n === 0) return { weights: [] as CategoryWeight[], cr: 0, lambdaMax: 0, ci: 0 };

    const colSums: Record<string, number> = {};
    ahpCategories.forEach((col: QualityName) => {
      colSums[col] = ahpCategories.reduce((sum: number, row: QualityName) => sum + (matrix[row][col] || 1), 0);
    });

    // Calculate weights (priority vector)
    const weights = ahpCategories.map((row: QualityName) => {
      const weight = ahpCategories.reduce((sum: number, col: QualityName) => sum + (matrix[row][col] / colSums[col]), 0) / n;
      return { name: row, weight };
    });

    let lambdaMax = 0;
    ahpCategories.forEach((row: QualityName, i: number) => {
      let rowWeightedSum = 0;
      ahpCategories.forEach((col: QualityName, j: number) => {
        rowWeightedSum += matrix[row][col] * weights[j].weight;
      });
      lambdaMax += rowWeightedSum / weights[i].weight;
    });
    lambdaMax = lambdaMax / n;

    const ci = (lambdaMax - n) / (Math.max(1, n - 1));
    const cr = n > 2 ? ci / RI[n] : 0;

    return {
      weights: weights.sort((a, b) => b.weight - a.weight),
      cr,
      lambdaMax,
      ci
    };
  }, [matrix, ahpCategories]);

  const handleUpdate = (row: QualityName, col: QualityName, val: number) => {
    setMatrix(prev => ({
      ...prev,
      [row]: { ...prev[row], [col]: val },
      [col]: { ...prev[col], [row]: 1 / val }
    }));
  };

  const handleSave = async () => {
    const weightsDict = ahpResults.weights.reduce(
      (acc, curr) => ({ ...acc, [curr.name]: curr.weight }),
      {} as Record<string, number>
    );

    try {
      setSaveStatus("Saving...");
      const res = await fetch(apiUrl(`/domain/${domainId}/category-weights/`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          values: weightsDict,
          matrix: matrix,
          categories_used: ahpCategories
        }),
        credentials: "include",
      });

      if (res.ok) {
        setSaveStatus("Saved! Redirecting...");
        setTimeout(() => navigate(`/`), 1500);
      } else {
        const error = await res.json();
        setSaveStatus(`Error: ${error.message || "Failed to save"}`);
      }
    } catch (err) {
      setSaveStatus("Error saving. Please try again.");
      console.error("Save error:", err);
    }
  };

  const resetToEqual = () => {
    const init: Record<string, Record<string, number>> = {};
    ahpCategories.forEach((row: QualityName) => {
      init[row] = {};
      ahpCategories.forEach((col: QualityName) => {
        init[row][col] = 1;
      });
    });
    setMatrix(init);
  };

  const getShortName = (name: string): string => {
    const shortNames: Record<string, string> = {
      "Installability": "Install",
      "Correctness and Verifiability": "Correctness",
      "Surface Reliability": "Reliability",
      "Surface Robustness": "Robustness",
      "Surface Usability": "Usability",
      "Maintainability": "Maintain",
      "Reusability": "Reuse",
      "Surface Understandability": "Understand",
      "Visibility/Transparency": "Visibility"
    };
    return shortNames[name] || name.split(" ")[0];
  };

  if (loading) {
    return <AuthTransition message="Loading Domain Categories..." />;
  }

  // Show warning if categories are missing
  if (showMissingWarning && ahpCategories.length < AHP_QUALITIES.length) {
    const missing = AHP_QUALITIES.filter((q: QualityName) => !allCategories.includes(q));
    return (
      <div className="dx-bg" style={{ minHeight: "100vh", padding: "30px", color: "#e0e0e0" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
          <div style={{ background: "#1e212b", padding: "40px", borderRadius: "12px", border: "1px solid #ff4d4f" }}>
            <h2 style={{ color: "#ff4d4f", marginBottom: "20px" }}>⚠️ Missing Categories</h2>
            <p>The following required AHP categories are missing from your categories.json:</p>
            <ul style={{ textAlign: "left", display: "inline-block", margin: "20px 0", color: "#ffaa00" }}>
              {missing.map((q: QualityName) => <li key={q}>{q}</li>)}
            </ul>
            <p>Please add these categories to proceed with AHP calculations.</p>
            <button className="dx-btn" onClick={() => navigate("/")} style={{ marginTop: "20px" }}>
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (ahpCategories.length === 0) {
    return (
      <div className="dx-bg" style={{ minHeight: "100vh", padding: "30px", color: "#e0e0e0" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
          <div style={{ background: "#1e212b", padding: "40px", borderRadius: "12px" }}>
            <h2>No Matching Categories Found</h2>
            <p>None of the required AHP categories exist in your categories.json.</p>
            <button className="dx-btn" onClick={() => navigate("/")} style={{ marginTop: "20px" }}>
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Removed the problematic JSX syntax
  return (
    <div className="dx-bg" style={{ minHeight: "100vh", padding: "30px", color: "#e0e0e0", fontFamily: "sans-serif" }}>

      {/* Header */}
      <div style={{ maxWidth: "1400px", margin: "0 auto", marginBottom: "20px" }}>
        <button
          className="dx-btn dx-btn-outline"
          onClick={() => navigate("/")}
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
        >
          ← Back to Dashboard
        </button>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: "1400px", margin: "0 auto 30px" }}>
        <div>
          <h2 style={{ margin: 0, color: "#fff", fontSize: "28px" }}>Category Weight Configuration</h2>
          <p style={{ color: "#888", fontSize: "0.9rem", marginTop: "8px" }}>
            Compare the importance of the 9 software quality categories
          </p>
          <p style={{ color: "#4a9eff", fontSize: "0.8rem", marginTop: "4px" }}>
            Categories: {ahpCategories.map(getShortName).join(" | ")}
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            className="dx-btn dx-btn-outline"
            onClick={resetToEqual}
            style={{ padding: "8px 16px" }}
          >
            Reset to Equal
          </button>
          <button
            className="dx-btn"
            style={{
              background: ahpResults.cr > 0.1 ? "#444" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              border: "none",
              padding: "8px 24px",
              borderRadius: "8px",
              opacity: ahpResults.cr > 0.1 ? 0.6 : 1,
              cursor: ahpResults.cr > 0.1 ? "not-allowed" : "pointer",
              transition: "all 0.2s"
            }}
            onClick={handleSave}
            disabled={ahpResults.cr > 0.1}
          >
            {saveStatus || "Save & Continue to Package Scoring"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: "30px", maxWidth: "1400px", margin: "0 auto", alignItems: "flex-start", flexWrap: "wrap" }}>

        {/* LEFT COLUMN: Pairwise Matrix */}
        <div style={{
          flex: 2,
          minWidth: "600px",
          background: "#1e212b",
          padding: "25px",
          borderRadius: "12px",
          border: "1px solid #333",
          overflowX: "auto",
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)"
        }}>
          <h3 style={{ marginBottom: "20px", color: "#fff", fontSize: "18px" }}>Pairwise Comparison Matrix</h3>
          <p style={{ fontSize: "12px", color: "#888", marginBottom: "20px" }}>
            Rate how much more important the ROW category is compared to the COLUMN category.
            Values {'>'} 1 mean the row is more important; values {'<'} 1 mean the column is more important.
          </p>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead>
              <tr>
                <th style={{ padding: "12px", borderBottom: "1px solid #333", textAlign: "left", minWidth: "140px" }}>Category</th>
                {ahpCategories.map((c: QualityName) => (
                  <th key={c} style={{ padding: "12px", color: "#4a9eff", fontSize: "0.75rem", borderBottom: "1px solid #333", textAlign: "center" }}>
                    {getShortName(c)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ahpCategories.map((rowCat: QualityName, rowIndex: number) => (
                <tr key={rowCat} style={{ borderBottom: "1px solid #2a2d3e" }}>
                  <td style={{ padding: "12px", fontWeight: "bold", fontSize: "0.85rem", color: "#fff", background: "#252836" }}>
                    {getShortName(rowCat)}
                    <span style={{ fontSize: "10px", color: "#666", display: "block" }}>{rowCat}</span>
                  </td>
                  {ahpCategories.map((colCat: QualityName, colIndex: number) => {
                    if (rowIndex === colIndex) {
                      return <td key={colCat} style={{ textAlign: "center", color: "#555", background: "#252836" }}>1</td>;
                    }

                    // Lower Triangle: Show reciprocal (Read Only)
                    if (rowIndex > colIndex) {
                      const val = matrix[rowCat][colCat];
                      return (
                        <td key={colCat} style={{ textAlign: "center", fontSize: "0.75rem", color: "#777", background: "#252836" }}>
                          {val < 1 ? `1/${Math.round(1/val)}` : val.toFixed(1)}
                        </td>
                      );
                    }

                    // Upper Triangle: Selectable Inputs
                    return (
                      <td key={colCat} style={{ textAlign: "center", background: "#252836" }}>
                        <select
                          value={matrix[rowCat][colCat]}
                          onChange={(e) => handleUpdate(rowCat, colCat, parseFloat(e.target.value))}
                          style={{
                            background: "#2a2d3e",
                            color: "white",
                            border: "1px solid #444",
                            borderRadius: "6px",
                            padding: "6px 8px",
                            fontSize: "0.75rem",
                            cursor: "pointer",
                            width: "100px"
                          }}
                        >
                          <option value={1}>1 (Equal)</option>
                          <option value={2}>2 (Slightly More)</option>
                          <option value={3}>3 (Moderately More)</option>
                          <option value={4}>4 (More)</option>
                          <option value={5}>5 (Strongly More)</option>
                          <option value={6}>6 (Very Strongly More)</option>
                          <option value={7}>7 (Extremely More)</option>
                          <option value={8}>8 (Very Extremely More)</option>
                          <option value={9}>9 (Absolutely More)</option>
                          <option value={1/2}>1/2 (Slightly Less)</option>
                          <option value={1/3}>1/3 (Moderately Less)</option>
                          <option value={1/4}>1/4 (Less)</option>
                          <option value={1/5}>1/5 (Strongly Less)</option>
                          <option value={1/6}>1/6 (Very Strongly Less)</option>
                          <option value={1/7}>1/7 (Extremely Less)</option>
                          <option value={1/8}>1/8 (Very Extremely Less)</option>
                          <option value={1/9}>1/9 (Absolutely Less)</option>
                        </select>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: "20px", padding: "12px", background: "#252836", borderRadius: "8px", fontSize: "12px", color: "#888" }}>
            <strong style={{ color: "#4a9eff" }}>How to use:</strong> Compare categories by their importance for software quality assessment.
            For example, if "Installability" is strongly more important than "Usability", select 5 in the Installability row and Usability column.
          </div>
        </div>

        <div style={{ flex: 1, minWidth: "280px", display: "flex", flexDirection: "column", gap: "20px", position: "sticky", top: "20px" }}>

          <div style={{
            background: "#161821",
            padding: "20px",
            borderRadius: "12px",
            border: `1px solid ${ahpResults.cr > 0.1 ? "#ff4d4f" : "#52c41a"}`,
          }}>
            <h4 style={{ margin: "0 0 12px 0", fontSize: "0.85rem", textTransform: "uppercase", color: "#aaa" }}>
              Consistency Ratio
            </h4>
            <div style={{ display: "flex", alignItems: "baseline", gap: "10px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "2rem", fontWeight: "bold", color: ahpResults.cr > 0.1 ? "#ff4d4f" : "#52c41a" }}>
                {(ahpResults.cr * 100).toFixed(1)}%
              </span>
              <span style={{ fontSize: "0.8rem", color: "#666" }}>CR (should be &lt; 10%)</span>
            </div>
            <p style={{ fontSize: "0.75rem", color: "#aaa", marginTop: "12px", lineHeight: "1.5" }}>
              {ahpResults.cr > 0.1
                ? "⚠️ Inconsistent judgments detected. Please review your comparisons."
                : "✓ Consistent comparisons. Your judgments are mathematically sound."}
            </p>
          </div>


          <div style={{
            background: "#161821",
            padding: "20px",
            borderRadius: "12px",
            border: "1px solid #333"
          }}>
            <h4 style={{ margin: "0 0 20px 0", color: "#888", textTransform: "uppercase", fontSize: "0.8rem" }}>
              Calculated Category Priorities
            </h4>
            {ahpResults.weights.map((item: CategoryWeight, idx: number) => (
              <div key={item.name} style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "6px" }}>
                  <span style={{ color: "#fff" }}>
                    {idx + 1}. {getShortName(item.name)}
                  </span>
                  <span style={{ color: "#4a9eff", fontWeight: "bold" }}>{(item.weight * 100).toFixed(1)}%</span>
                </div>
                <div style={{ height: "6px", width: "100%", background: "#222", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${item.weight * 100}%`,
                    background: "linear-gradient(90deg, #4a9eff, #67e8f9)",
                    borderRadius: "4px"
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
