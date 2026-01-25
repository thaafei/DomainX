import React, { useState, useEffect } from "react";

interface Metric {
  metric_ID: string;
  metric_name: string;
  value_type: string;
  category?: string;
  description?: string;
}

const MetricsPage: React.FC = () => {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("float");
  const [newCategory, setNewCategory] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [selectedOptionCategory, setSelectedOptionCategory] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [rulesData, setRulesData] = useState<any>(null);
  const [categories, setCategories] = useState<any>(null);

  useEffect(() => {
    setSelectedOptionCategory("");
    setSelectedTemplate("");
  }, [newType]);

  useEffect(() => {
    const fetchRules = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/api/metric-rules/'); 
        const data = await response.json();
        setRulesData(data);
      } catch (error) {
        console.error("Error fetching AHP rules:", error);
      }
    };
    fetchRules();
  }, []);
  useEffect(() => {
    const fetchRules = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/api/metric-categories/'); 
        const data = await response.json();
        setCategories(data.Categories);
      } catch (error) {
        console.error("Error fetching AHP rules:", error);
      }
    };
    fetchRules();
  }, []);
  useEffect(() => {
        const loadMetrics = async () => {
            try {
                const res = await fetch("http://127.0.0.1:8000/api/metrics/", {
                    credentials: "include",
                });

                const data = await res.json();

                const uniqueMetricsMap = new Map();
                (Array.isArray(data) ? data : []).forEach(metric => {
                    uniqueMetricsMap.set(metric.metric_ID, metric);
                });
                const uniqueMetrics = Array.from(uniqueMetricsMap.values());
                setMetrics(uniqueMetrics);

            } catch (err) {
                console.error(err);
            }
        };

      loadMetrics();
    }, []);

  const getAvailableCategories = () => {
    if (!rulesData) return {};
    if (newType === 'bool') { return rulesData.bool || {}};
    if (newType === 'range') { return rulesData.range || {}};
    
    return {};
  };
  const addMetric = async () => {
    if (!newName.trim()) return;

    const payload = {
      metric_name: newName,
      value_type: newType,
      option_category: selectedOptionCategory,
      rule: selectedTemplate || null,
      category: newCategory.trim() || null,
      description: newDesc.trim() || null,
    };

    try {
      const res = await fetch("http://127.0.0.1:8000/api/metrics/create/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const responseBody = await res.text();

      if (!res.ok) {
        console.error("status:", res.status);
        console.error("body:", responseBody);

        let errorMsg = responseBody;
        try {
          const errorJson = JSON.parse(responseBody);
          errorMsg = errorJson.detail || errorJson.error || responseBody;
        } catch (e) {
        }
        throw new Error(`API Error (${res.status}): ${errorMsg}`);
      }

      const data = JSON.parse(responseBody);

      console.log("status:", res.status);
      console.log("body:", responseBody);
      setMetrics(prev => {
          const tempMap = new Map(prev.map(m => [m.metric_ID, m]));
          tempMap.set(data.metric_ID, data);

          return Array.from(tempMap.values());
      });

      setNewName("");
      setNewType("float");
      setNewCategory("");
      setNewDesc("");
      setSelectedTemplate("")
      setSelectedOptionCategory("")

    } catch (err) {
      console.error(err);
    }
  };


  const deleteMetric = async (id: string) => {
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/metrics/${id}/delete/`, {
          method: "DELETE",
          credentials: "include",
        });

        if (res.ok) {
          setMetrics(prev => prev.filter(m => m.metric_ID !== id));
        }
      } catch (err) {
        console.error(err);
      }
    };

return (
  <div className="dx-bg" style={{ display: "flex", height: "100vh" }}>
    <div
      className="dx-card"
      style={{
        width: 160,
        padding: "22px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 18,
        borderRight: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <button
            className="dx-btn dx-btn-outline"
            style={{ width: "100%", fontSize: "1rem", textAlign: "center" }}
            onClick={() => (window.location.href = "/main")}
          >
            ← Back
      </button>
    </div>

    <div
      style={{
        flex: 1,
        padding: "40px 60px",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      <div className="stars"></div>

      <div style={{ maxWidth: "900px", color: "white" }}>
       <h1 style={{ color: "var(--accent)" }}>Manage Metrics</h1>

      <div className="dx-card" style={{ padding: 20, marginBottom: 24 }}>
        <h3>Add New Metric</h3>

        <input
          className="dx-input"
          placeholder="Metric name..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          maxLength={100}
          style={{ marginBottom: 10 }}
        />

        <select
          className="dx-input"
          value={newType}
          onChange={(e) => {setNewType(e.target.value); setSelectedTemplate("");}}
          style={{ marginBottom: 10 }}
        >
          <option value="float" style={{ color:'black'}}>Float</option>
          <option value="int" style={{ color:'black'}}>Integer</option>
          <option value="bool" style={{ color:'black'}}>Boolean</option>
          <option value="range" style={{ color:'black'}}>Range</option>
          <option value="text" style={{ color:'black'}}>Text</option>
        </select>
        {(newType === "bool" || newType === "range") && (
          <>
            <select
              className="dx-input"
              value={selectedOptionCategory}
              onChange={(e) => {
                setSelectedOptionCategory(e.target.value);
                setSelectedTemplate("");
              }}
              style={{ marginBottom: 10, borderColor: "var(--accent)" }}
            >
              <option value="">-- Select Input Category --</option>
              {Object.entries(getAvailableCategories()).map(([key, cat]: [string, any]) => (
                <option key={key} value={key} style={{ color: 'black' }}>
                  {cat.display_name || key}
                </option>
              ))}
            </select>
            {selectedOptionCategory && getAvailableCategories()[selectedOptionCategory] && (
              <select
                className="dx-input"
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                style={{ marginBottom: 10, backgroundColor: "rgba(var(--accent-rgb), 0.1)" }}
              >
                <option value="">-- Select Scoring Rule (Template) --</option>
                {Object.keys(getAvailableCategories()[selectedOptionCategory].templates).map(tKey => (
                  <option key={tKey} value={tKey} style={{ color: 'black' }}>
                    {tKey.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            )}
          </>
        )}

        {selectedTemplate && (
          <div style={{ fontSize: '0.8rem', color: 'var(--accent)', marginBottom: 10, padding: '5px', border: '1px dashed var(--accent)' }}>
            Rule Preview: {JSON.stringify(
              (newType === "bool" ? rulesData.bool : rulesData.range)[selectedOptionCategory].templates[selectedTemplate]
            )}
          </div>
        )}
        <select
              className="dx-input"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              style={{ marginBottom: 10, borderColor: "var(--accent)" }}
            >
              <option value="">-- Select Category (Optional) --</option>
              {categories && categories.map((catName: string) => (
                <option key={catName} value={catName} style={{ color: 'black' }}>
                  {catName}
                </option>
              ))}
        </select>

        <input
          className="dx-input"
          placeholder="Description (optional)"
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
          style={{ marginBottom: 10 }}
        />

        <button className="dx-btn" onClick={addMetric}>
          Add Metric
        </button>
      </div>

      <div className="dx-card" style={{ padding: 20 }}>
        <h3>Existing Metrics</h3>

        <table style={{ width: "100%", marginTop: 10, borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: 8 }}>Name</th>
              <th style={{ textAlign: "left", padding: 8 }}>Type</th>
              <th style={{ textAlign: "left", padding: 8 }}>Category</th>
              <th style={{ textAlign: "left", padding: 8 }}>Description</th>
              <th style={{ width: 100 }}></th>
            </tr>
          </thead>

          <tbody>
            {metrics.map((m) => (
              <tr
                key={m.metric_ID}
                style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}
              >
                <td style={{ padding: 8 }}>{m.metric_name}</td>
                <td style={{ padding: 8 }}>{m.value_type}</td>
                <td style={{ padding: 8 }}>{m.category || "—"}</td>
                <td style={{ padding: 8 }}>{m.description || "—"}</td>
                <td style={{ padding: 8 }}>
                  <button
                    className="dx-btn dx-btn-outline"
                    style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
                    onClick={() => deleteMetric(m.metric_ID)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {metrics.length === 0 && (
          <div style={{ padding: 20, opacity: 0.6 }}>No metrics yet.</div>
        )}
      </div>
      </div>

    </div>
  </div>
);


};

export default MetricsPage;
