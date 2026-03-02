import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useParams } from 'react-router-dom';
import Plot from 'react-plotly.js';
import Plotly, { Data, Layout } from "plotly.js-dist-min";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { apiUrl } from "../config/api";
import VisualizeSidebar from "../components/VisualizeSidebar";
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

interface ChartRow {
  label: string;
  value: number;
}

const Visualize: React.FC = () => {
  const { domainId } = useParams<{ domainId: string }>();
  const DOMAIN_ID = domainId; 
  const [metricList, setMetricList] = useState<Metric[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [libraries, setLibraries] = useState<LibraryRow[]>([]);
  const [activeTab, setActiveTab] = useState< "Metrics" | "Libraries">("Metrics");

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [selectedLibraries, setSelectedLibraries] = useState<string[]>([]);

  const [chartData, setChartData] = useState<{ metric: string; rows: { label: string; value: number }[] }[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const downloadFormat = "svg";

  // Filter out non-visualizable metrics (bool and text types)
  const visualizableMetrics = useMemo(() => {
    return metricList.filter(m => m.value_type !== "bool" && m.value_type !== "text");
  }, [metricList]);

  useEffect(() => {
      document.title = "DomainX – Visualize";
    const visualizableMetricNames = new Set(visualizableMetrics.map(m => m.metric_name));
    setSelectedMetrics(prev => prev.filter(name => visualizableMetricNames.has(name)));
  }, [visualizableMetrics]);

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
        parseJson(categoriesRes)
      ]);

      setMetricList(Array.isArray(metricsData) ? metricsData : comparisonData.metrics || []);
      const librariesData = comparisonData.libraries || [];
      setLibraries(librariesData);
      // Auto-select all libraries by default
      setSelectedLibraries(librariesData.map((lib: LibraryRow) => lib.library_ID));
      setCategories(Array.isArray(categoriesData?.Categories) ? categoriesData.Categories : []);

      const derivedCategories = Array.from(
        new Set((Array.isArray(metricsData) ? metricsData : comparisonData.metrics || [])
          .map((m: Metric) => m.category)
          .filter(Boolean) as string[])
      );
      const availableCategories = (Array.isArray(categoriesData?.Categories)
        ? categoriesData.Categories
        : derivedCategories
      ).filter((cat: string) => (Array.isArray(metricsData) ? metricsData : comparisonData.metrics || [])
        .some((m: Metric) => m.category === cat));

      const hasUncategorized = (Array.isArray(metricsData) ? metricsData : comparisonData.metrics || [])
        .some((m: Metric) => !m.category);
      const categoryList = hasUncategorized
        ? [...availableCategories, "Uncategorized"]
        : availableCategories;
    } catch (err) {
      console.error(err);
    }
  };

  const getCategoryMetricNames = (name: string) => {
    if (name === "Uncategorized") {
      return visualizableMetrics.filter(m => !m.category).map(m => m.metric_name);
    }
    return visualizableMetrics.filter(m => m.category === name).map(m => m.metric_name);
  };

  const isCategoryFullySelected = (name: string) => {
    const categoryMetrics = getCategoryMetricNames(name);
    if (categoryMetrics.length === 0) return false;
    return categoryMetrics.every(metric => selectedMetrics.includes(metric));
  };

  const toggleCategory = (name: string) => {
    const categoryMetrics = getCategoryMetricNames(name);
    const isFullySelected = isCategoryFullySelected(name);

    setSelectedMetrics(prev => {
      if (isFullySelected) {
        // Remove all metrics from this category
        return prev.filter(metric => !categoryMetrics.includes(metric));
      } else {
        // Add all metrics from this category
        const merged = new Set([...prev, ...categoryMetrics]);
        return Array.from(merged);
      }
    });
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


  const toggleSelectAllLibraries = () => {
    if (libraries.length === 0) return;
    const allIds = libraries.map(l => l.library_ID);
    const allSelected = selectedLibraries.length === allIds.length;
    setSelectedLibraries(allSelected ? [] : allIds);
  };

  const toggleSelectAllMetrics = () => {
    if (visualizableMetrics.length === 0) return;
    const allNames = visualizableMetrics.map(m => m.metric_name);
    const allSelected = selectedMetrics.length === allNames.length;
    setSelectedMetrics(allSelected ? [] : allNames);
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

    let charts: { metric: string; rows: { label: string; value: number }[] }[] = [];

      // Metrics mode - show raw metric values
    charts = selectedMetricArray.map(metricName => {
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

  const handleClear =() => {
    setError(null);
    setChartData(null);
  }
  return (
    <div className="dx-bg" style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <VisualizeSidebar
        domainId={domainId}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        metricList={visualizableMetrics}
        categories={categories}
        libraries={libraries}
        selectedMetrics={selectedMetrics}
        setSelectedMetrics={setSelectedMetrics}
        selectedLibraries={selectedLibraries}
        setSelectedLibraries={setSelectedLibraries}
        error={error}
        setError={setError}
        setChartData={setChartData}
        handleVisualize={handleVisualize}
        handleDownloadAll={handleDownloadAll}
        handleClear={handleClear}
        chartData={chartData}
        getCategoryMetricNames={getCategoryMetricNames}
        isCategoryFullySelected={isCategoryFullySelected}
        toggleCategory={toggleCategory}
        toggleMetric={toggleMetric}
        toggleLibrary={toggleLibrary}
        toggleSelectAllMetrics={toggleSelectAllMetrics}
        toggleSelectAllLibraries={toggleSelectAllLibraries}
      />

      <div
        style={{
          flex: 1,
          position: "relative",
          color: "white"
        }}
      >
        <div className="stars"></div>

        <div className="dx-vis-right dx-card" style={{ height: "100%" }}>
          <h2 className="dx-vis-title" style={{padding: "0px 0px 10px 0px" }}>Export Visualizations - Preview</h2>

          {!chartData && (
            <div className="dx-vis-placeholder">
              Select metric(s) + libraries to visualize.
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
