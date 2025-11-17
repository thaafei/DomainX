import React, { useState } from 'react';
import axios from 'axios';


const parseGitHubRepo = (value: string): { owner: string; repo: string } | null => {
  const v = value.trim();
  const regex = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/\s]+)\/([^\/\s]+)(?:\/.*)?$/i;
  const m = v.match(regex);
  if (!m) return null;
  const owner = m[1];
  const repo = m[2].replace(/\.git$/, '');
  return { owner, repo };
};

const Visualize: React.FC = () => {
  const [inputs, setInputs] = useState<string[]>([
    'https://github.com/pytorch/pytorch',
    'https://github.com/tensorflow/tensorflow'
  ]);

  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<{ label: string; stars: number }[] | null>(null);
  const [loading, setLoading] = useState(false);

  const addField = () => setInputs([...inputs, '']);
  const removeField = (i: number) => setInputs(inputs.filter((_, idx) => idx !== i));
  const updateField = (i: number, value: string) => setInputs(inputs.map((v, idx) => (idx === i ? value : v)));

  const handleVisualize = async () => {
    setError(null);
    setChartData(null);

    const parsed = inputs.map(v => parseGitHubRepo(v.trim()));
    const bad = parsed.findIndex(p => p === null);
    if (bad !== -1) {
      setError(`Invalid GitHub repo URL at input #${bad + 1}`);
      return;
    }

    const uniqueRepos = Array.from(new Set(parsed.map(p => `${p!.owner}/${p!.repo}`)));
    if (uniqueRepos.length < 2) {
      setError('Please provide at least two unique GitHub repos.');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post('/api/github/stars/', { repos: uniqueRepos });
      setChartData(response.data);
    } catch (err) {
      console.error(err);
      setError('Could not reach backend API.');
    } finally {
      setLoading(false);
    }
  };

  const maxStars = chartData?.length ? Math.max(...chartData.map(d => d.stars)) : 1;

return (
  <div className="dx-bg" style={{ display: "flex", height: "100vh" }}>

    <div
          className="dx-card"
          style={{
            width: 160,
            padding: "22px 14px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            gap: 18,
            borderRight: "1px solid rgba(255,255,255,0.08)"
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
        display: "grid",
        gridTemplateColumns: "420px 1fr",
        gap: "60px",
        position: "relative"
      }}
    >
      <div className="stars"></div>

      <div className="dx-vis-container">

        <div className="dx-vis-left dx-card">
          <h2 className="dx-vis-title">Repositories</h2>
          <p className="dx-vis-sub">Enter GitHub repos to compare popularity.</p>

          <div className="dx-vis-input-list">
            {inputs.map((val, idx) => (
              <div key={idx} className="dx-vis-input-row">
                <input
                  value={val}
                  onChange={(e) => updateField(idx, e.target.value)}
                  className="dx-input"
                  placeholder="github.com/owner/repo"
                />
                <button className="dx-btn dx-btn-outline" onClick={() => removeField(idx)}>x</button>
              </div>
            ))}

            <button className="dx-btn dx-btn-outline" onClick={addField}>+ Add</button>
            {error && <div className="dx-error">{error}</div>}

            <button
              className="dx-btn dx-btn-primary"
              onClick={handleVisualize}
              disabled={loading}
              style={{ marginTop: '1rem' }}
            >
              {loading ? 'Working...' : 'Visualize'}
            </button>
          </div>
        </div>

        <div className="dx-vis-right dx-card">
          <h3 className="dx-vis-title">Star Comparison</h3>

          {!chartData && <div className="dx-vis-placeholder">Enter 2+ repos and click Visualize.</div>}

          {chartData && (
            <div className="dx-chart-area">
              {chartData.map((d, i) => {
                const heightPercent = d.stars / maxStars;
                return (
                  <div key={i} className="dx-chart-bar-wrap">
                    <div
                      className="dx-chart-bar"
                      style={{ height: `${heightPercent * 200}px` }}
                    >
                      <span className="dx-chart-label">{d.stars}</span>
                    </div>
                    <div className="dx-chart-name">{d.label.split('/').slice(-1)[0]}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  </div>
);


};

export default Visualize;
