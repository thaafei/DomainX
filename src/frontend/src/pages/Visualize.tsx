import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useParams } from 'react-router-dom';
import { apiUrl } from "../config/api";
interface Metric {
  metric_ID: string;
  metric_name: string;
  category?: string | null;
}

interface LibraryRow {
  library_ID: string;
  library_name: string;
  metrics: { [metricName: string]: string | number | null };
}

const Visualize: React.FC = () => {
  const navigate = useNavigate();
  const { domainId } = useParams<{ domainId: string }>();
  const DOMAIN_ID = domainId; 
  const [metricList, setMetricList] = useState<Metric[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [libraries, setLibraries] = useState<LibraryRow[]>([]);

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [selectedLibraries, setSelectedLibraries] = useState<string[]>([]);

  const [chartData, setChartData] = useState<{ label: string; value: number }[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
  if (!DOMAIN_ID) return;
      loadData();
    }, [DOMAIN_ID]);


  const loadData = async () => {
    try {
      const parseJson = async (res: Response) => {
        const contentType = res.headers.get("content-type") || "";
        const responseText = await res.text();

        if (!res.ok) {
          console.error("Visualize load error:", res.status, responseText);
          throw new Error(`Server Error (${res.status})`);
        }

        if (!contentType.includes("application/json")) {
          throw new Error(`Expected JSON, got ${contentType}. Body: ${responseText.slice(0, 120)}`);
        }

        return JSON.parse(responseText);
      };

      const [comparisonRes, metricsRes, categoriesRes] = await Promise.all([
        fetch(apiUrl(`/library_metric_values/comparison/${DOMAIN_ID}/`), {
          credentials: "include",
        }),
        fetch(apiUrl("/metrics/"), { credentials: "include" }),
        fetch(apiUrl("/metrics/categories/"), { credentials: "include" }),
      ]);

      const [comparisonData, metricsData, categoriesData] = await Promise.all([
        parseJson(comparisonRes),
        parseJson(metricsRes),
        parseJson(categoriesRes),
      ]);

      setMetricList(Array.isArray(metricsData) ? metricsData : comparisonData.metrics || []);
      setLibraries(comparisonData.libraries || []);
      setCategories(Array.isArray(categoriesData?.Categories) ? categoriesData.Categories : []);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleCategory = (name: string) => {
    setSelectedCategories(prev =>
      prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]
    );
  };

  const toggleMetric = (name: string) => {
    setSelectedMetrics(prev =>
      prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]
    );
  };

  const toggleLibrary = (id: string) => {
    setSelectedLibraries(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleVisualize = () => {
    setError(null);
    setChartData(null);

    if (selectedCategories.length === 0 && selectedMetrics.length === 0) {
      setError("Please select at least one category or metric.");
      return;
    }

    if (selectedLibraries.length < 2) {
      setError("Select at least two libraries.");
      return;
    }

    const metricsByCategory: Record<string, string[]> = {};
    const derivedCategories = Array.from(
      new Set((metricList || []).map(m => m.category).filter(Boolean) as string[])
    );
    const availableCategories = categories.length ? categories : derivedCategories;

    availableCategories.forEach(cat => {
      metricsByCategory[cat] = (metricList || [])
        .filter(m => m.category === cat)
        .map(m => m.metric_name);
    });

    if ((metricList || []).some(m => !m.category)) {
      metricsByCategory["Uncategorized"] = (metricList || [])
        .filter(m => !m.category)
        .map(m => m.metric_name);
    }

    const selectedMetricNames = new Set<string>(selectedMetrics);
    selectedCategories.forEach(cat => {
      (metricsByCategory[cat] || []).forEach(name => selectedMetricNames.add(name));
    });

    if (selectedMetricNames.size === 0) {
      setError("Selected categories have no metrics.");
      return;
    }

    let hasInvalid = false;
    const toNumber = (val: string | number | null | undefined) => {
      if (val === null || val === undefined || val === "") return 0;
      const num = Number(val);
      if (isNaN(num)) {
        hasInvalid = true;
        return 0;
      }
      return num;
    };

    const rows = libraries
      .filter(l => selectedLibraries.includes(l.library_ID))
      .map(l => {
        let total = 0;
        selectedMetricNames.forEach(name => {
          total += toNumber(l.metrics[name]);
        });
        return {
          label: l.library_name,
          value: total,
        };
      });

    if (hasInvalid) {
      setError("Some selected metrics have invalid values.");
      return;
    }

    setChartData(rows);
  };

  const maxValue = chartData?.length
    ? Math.max(...chartData.map(d => d.value))
    : 1;

  return (
    <div className="dx-bg" style={{ display: "flex", height: "100vh" }}>

      <div
        className="dx-card"
        style={{
          width: 280,
          padding: "22px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
          height: "100%",
          borderRight: "1px solid rgba(255,255,255,0.08)"
        }}
      >
        <button
          className="dx-btn dx-btn-outline"
          style={{ width: "100%", fontSize: "1rem", textAlign: "center" }}
          onClick={() => navigate(`/comparison-tool/${domainId}`)}
        >
          ← Back
        </button>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            color: "white",
            flex: 1,
            minHeight: 0
          }}
        >
          <label className="dx-vis-title" style={{ fontWeight: 600 }}>Select Metrics</label>
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
            ).map(cat => (
              <div key={cat} style={{ marginBottom: 10 }}>
                <label style={{ display: "block", fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(cat)}
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
                <label style={{ display: "block", fontWeight: 600, color: "white"}}>
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes("Uncategorized")}
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
        </div>
      </div>

      <div
        style={{
          flex: 1,
          padding: "40px 60px",
          display: "grid",
          gridTemplateColumns: "420px 1fr",
          gap: "60px",
          position: "relative",
          color: "white"
        }}
      >
        <div className="stars"></div>

        <div
          className="dx-card"
          style={{
            padding: 20,
            display: "flex",
            flexDirection: "column",
            height: "100%"
          }}
        >
          <h2 className="dx-vis-title">Visualize Metrics</h2>

          <label style={{ marginTop: 20 }}>Select Libraries</label>
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              marginTop: 10,
              paddingRight: 8
            }}
          >
            {libraries.map(lib => (
              <label
                key={lib.library_ID}
                style={{ display: "block", marginBottom: 6 }}
              >
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

          {error && (
            <div className="dx-error" style={{ marginTop: 10 }}>
              {error}
            </div>
          )}

          <button
            className="dx-btn dx-btn-primary"
            style={{ marginTop: 20 }}
            onClick={handleVisualize}
          >
            Visualize →
          </button>
        </div>

        <div className="dx-vis-right dx-card">
          <h3 className="dx-vis-title">Comparison</h3>

          {!chartData && (
            <div className="dx-vis-placeholder">
              Select metric + libraries to visualize.
            </div>
          )}

          {chartData && (
            <div className="dx-chart-area">
              {chartData.map((d, i) => {
                const heightPercent = d.value / maxValue;

                return (
                  <div key={i} className="dx-chart-bar-wrap">
                    <div
                      className="dx-chart-bar"
                      style={{ height: `${heightPercent * 220}px` }}
                    >
                      <span className="dx-chart-label">{d.value}</span>
                    </div>
                    <div className="dx-chart-name">{d.label}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Visualize;
