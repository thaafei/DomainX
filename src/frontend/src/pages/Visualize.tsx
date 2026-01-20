import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useParams } from 'react-router-dom';

interface Metric {
  metric_ID: string;
  metric_name: string;
}

interface LibraryRow {
  library_ID: string;
  library_name: string;
  metrics: { [metricName: string]: string | number | null };
}

// const DOMAIN_ID = "ecba1df1ede211f0987c0050568e534c";

const Visualize: React.FC = () => {
  const navigate = useNavigate();
  const { domainId } = useParams<{ domainId: string }>();
  const DOMAIN_ID = domainId; 
  const [metricList, setMetricList] = useState<Metric[]>([]);
  const [libraries, setLibraries] = useState<LibraryRow[]>([]);

  const [selectedMetric, setSelectedMetric] = useState("");
  const [selectedLibraries, setSelectedLibraries] = useState<string[]>([]);

  const [chartData, setChartData] = useState<{ label: string; value: number }[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
         const formatUUID = (rawId: string) => {
            if (rawId && rawId.length === 32 && !rawId.includes('-')) {
              return rawId.substring(0, 8) + '-' +
                     rawId.substring(8, 12) + '-' +
                     rawId.substring(12, 16) + '-' +
                     rawId.substring(16, 20) + '-' +
                     rawId.substring(20, 32);
            }
            return rawId;
          };

      const formattedDomainId = DOMAIN_ID;
      const res = await fetch(`http://127.0.0.1:8000/api/comparison/${formattedDomainId}/`, {
        credentials: "include"
      });
      const responseText = await res.text();
      if (!res.ok) {
          throw new Error(`Server Error (${res.status}): See console for details.`);
      }
      const data = JSON.parse(responseText);

      setMetricList(data.metrics);
      setLibraries(data.libraries);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleLibrary = (id: string) => {
    setSelectedLibraries(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleVisualize = () => {
    setError(null);
    setChartData(null);

    if (!selectedMetric) {
      setError("Please select a metric.");
      return;
    }

    if (selectedLibraries.length < 2) {
      setError("Select at least two libraries.");
      return;
    }

    const rows = libraries
      .filter(l => selectedLibraries.includes(l.library_ID))
      .map(l => ({
        label: l.library_name,
        value: Number(l.metrics[selectedMetric])
      }));

    if (rows.some(r => isNaN(r.value))) {
      setError("Selected metric has missing or invalid values.");
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
          width: 160,
          padding: "22px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
          borderRight: "1px solid rgba(255,255,255,0.08)"
        }}
      >
        <button
          className="dx-btn dx-btn-outline"
          onClick={() => navigate(`/comparison-tool/${domainId}`)}
        >
          ← Back
        </button>
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

          <label style={{ marginTop: 20 }}>Select Metric</label>
          <select
            className="dx-input"
            value={selectedMetric}
            onChange={e => setSelectedMetric(e.target.value)}
          >
            <option value="">— Select Metric —</option>
            {metricList.map(m => (
              <option key={m.metric_ID} value={m.metric_name}>
                {m.metric_name}
              </option>
            ))}
          </select>

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
