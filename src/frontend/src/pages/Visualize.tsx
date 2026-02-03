import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useParams } from 'react-router-dom';
import Plot from 'react-plotly.js';
import Plotly, { Data, Layout } from "plotly.js-dist-min";
import JSZip from "jszip";
import { saveAs } from "file-saver";
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

interface ChartRow {
  label: string;
  value: number;
}

const Visualize: React.FC = () => {
  const navigate = useNavigate();
  const { domainId } = useParams<{ domainId: string }>();
  const DOMAIN_ID = domainId; 
  const [metricList, setMetricList] = useState<Metric[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [libraries, setLibraries] = useState<LibraryRow[]>([]);

  const [activeTab, setActiveTab] = useState<"AHP" | "Metrics" | "Libraries">("Metrics");
  const [selectedAhpOptions, setSelectedAhpOptions] = useState<string[]>([]);

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [selectedLibraries, setSelectedLibraries] = useState<string[]>([]);

  const [chartData, setChartData] = useState<{ metric: string; rows: { label: string; value: number }[] }[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const downloadFormat = "svg";

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

  const toggleAhpOption = (name: string) => {
    setSelectedAhpOptions(prev =>
      prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]
    );
  };

  const toggleSelectAllLibraries = () => {
    if (libraries.length === 0) return;
    const allIds = libraries.map(l => l.library_ID);
    const allSelected = selectedLibraries.length === allIds.length;
    setSelectedLibraries(allSelected ? [] : allIds);
  };

  function buildChartLayout(metric: string): Partial<Layout> {
    return {
      title: {
        text: metric,
        font: { size: 18 },
      },
      xaxis: {
        title: { text: "Category" },
      },
      yaxis: {
        title: { text: metric },
      },
      margin: { t: 60, l: 60, r: 60, b: 60 },
      autosize: true,
    };
  }

  function buildChartData(rows: ChartRow[]): Data[] {
    return [
      {
        x: rows.map(r => r.label),
        y: rows.map(r => r.value),
        type: "bar",
        text: rows.map(r => r.value.toString()),
        textposition: "auto",
        hovertemplate: "%{x}: %{y}<extra></extra>",
      },
    ];
  }

  const dataUrlToBlob = (dataUrl: string): Blob => {
    const [meta, content] = dataUrl.split(",");
    const isBase64 = meta.includes("base64");
    const mimeMatch = meta.match(/data:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";

    if (isBase64) {
      const binary = atob(content);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new Blob([bytes], { type: mime });
    }

    const decoded = decodeURIComponent(content);
    return new Blob([new TextEncoder().encode(decoded)], { type: mime });
  };

  const handleDownloadAll = async () => {
    if (!chartData || chartData.length === 0) return;

    const zip = new JSZip();

    for (const chart of chartData) {
      const data = buildChartData(chart.rows) as any;
      const layout = buildChartLayout(chart.metric) as any;
      const dataUrl = await Plotly.toImage({ data, layout }, {
        width: 800,
        height: 600,
        format: downloadFormat
      });

      const blob = dataUrlToBlob(dataUrl as string);
      const safeName = chart.metric.replace(/\s+/g, "_").toLowerCase();
      zip.file(`visualize_${safeName}.${downloadFormat}`, blob);
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const dateStamp = new Date().toISOString().slice(0, 10);
    saveAs(zipBlob, `visualizations_${dateStamp}.zip`);
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

    const selectedMetricArray = Array.from(selectedMetricNames);
    const selectedLibs = libraries.filter(l => selectedLibraries.includes(l.library_ID));

    const charts = selectedMetricArray.map(metricName => {
      const rows = selectedLibs.map(l => ({
        label: l.library_name,
        value: toNumber(l.metrics[metricName])
      })).sort((a, b) => b.value - a.value);

      return {
        metric: metricName,
        rows
      };
    });

    if (hasInvalid) {
      setError("Some selected metrics have invalid values.");
      return;
    }

    setChartData(charts);
  };

  const ahpOptions = [
    "Use AHP weighting",
    "Normalize weights",
    "Include consistency ratio",
    "Auto-scale weights"
  ];

  return (
    <div className="dx-bg" style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
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
          style={{ width: "100%", fontSize: "1rem", textAlign: "center" }}
          onClick={() => navigate(`/comparison-tool/${domainId}`)}
        >
          ← Back
        </button>

        <div style={{ display: "flex", gap: 6 }}>
          {(["AHP", "Metrics", "Libraries"] as const).map(tab => (
            <button
              key={tab}
              className={activeTab === tab ? "dx-btn dx-btn-primary" : "dx-btn dx-btn-outline"}
              style={{ flex: 1, padding: "8px 6px", fontSize: "0.9rem" }}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            color: "white",
            flex: 1,
            minHeight: 0,
            overflow: "hidden"
          }}
        >
          {activeTab === "AHP" && (
            <>
              <label className="dx-vis-title" style={{ fontWeight: 600 }}>
                AHP Options
              </label>
              <div style={{ fontSize: "0.85rem", opacity: 0.8 }}>
                Select AHP options for weighting.
              </div>
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  minHeight: 0,
                  paddingRight: 6
                }}
              >
                {ahpOptions.map(option => (
                  <label key={option} style={{ display: "block", marginBottom: 8 }}>
                    <input
                      type="checkbox"
                      checked={selectedAhpOptions.includes(option)}
                      onChange={() => toggleAhpOption(option)}
                      style={{ marginRight: 6 }}
                    />
                    {option}
                  </label>
                ))}
              </div>
            </>
          )}

          {activeTab === "Metrics" && (
            <>
              <label className="dx-vis-title" style={{ fontWeight: 600 }}>
                Select Metrics
              </label>
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
                    <label style={{ display: "block", fontWeight: 600, color: "white" }}>
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

      <div
        style={{
          flex: 1,
          position: "relative",
          color: "white"
        }}
      >
        <div className="stars"></div>

        <div className="dx-vis-right dx-card" style={{ height: "100%" }}>
          <h2 className="dx-vis-title" style={{padding: "0px 0px 10px 0px" }}>Comparison</h2>

          {!chartData && (
            <div className="dx-vis-placeholder">
              Select metric + libraries to visualize.
            </div>
          )}

          {chartData && (
            <div style={{ width: "100%", height: "100%", overflowY: "auto" }}>
              {chartData.map(chart => (
                <div
                  key={chart.metric}
                  style={{ marginBottom: 28, display: "flex", justifyContent: "center" }}
                >
                  <Plot
                    data={buildChartData(chart.rows)}
                    layout={buildChartLayout(chart.metric)}
                    config={{
                      responsive: true,
                      displayModeBar: true,
                      displaylogo: false,
                      modeBarButtonsToRemove: ["pan2d", "lasso2d", "select2d"]
                    }}
                    style={{ width: "100%", height: "420px" }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Visualize;
