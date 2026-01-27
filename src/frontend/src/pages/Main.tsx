import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { apiUrl } from "../config/api";
const domains = [
  { name: "Neural Networks", version: "v1.0" },
  { name: "Domain X", version: "v2.1" },
  { name: "Domain Y", version: "v3.0" },
];

const Main: React.FC = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedDomain, setSelectedDomain] = useState(domains[0]);
  const { logout } = useAuthStore();
  const handleLogout = async () => {
      try {
          await fetch(apiUrl("/logout/"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });
        logout();
        navigate("/login");
      } catch (err: any) {
        console.error(err);
      }
  };
  return (
    <div className="dx-bg" style={{ display: "flex", height: "100vh", overflow: "hidden" }}>

      <div
        className="dx-card"
        style={{
          width: sidebarOpen ? 260 : 60,
          transition: "0.28s",
          padding: sidebarOpen ? "16px" : "16px 6px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          color: "var(--text-main)"
        }}
      >
        <div
          style={{ cursor: "pointer", fontSize: 24, color: "var(--accent)" }}
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? "⟨" : "⟩"}
        </div>

        {sidebarOpen && (
          <input
            className="dx-input"
            placeholder="Filter domains..."
            style={{ marginBottom: 12 }}
          />
        )}

        <div style={{ flex: 1, overflowY: "auto" }}>
          {domains.map((d, i) => (
            <div
              key={i}
              className="dx-side-item"
              onClick={() => setSelectedDomain(d)}
              style={{
                padding: sidebarOpen ? "10px" : "10px 0",
                cursor: "pointer",
                color: d.name === selectedDomain.name ? "var(--accent)" : "var(--text-main)",
                fontWeight: d.name === selectedDomain.name ? 600 : 400,
                transition: "0.25s"
              }}
            >
              {sidebarOpen ? (
                <>
                  {d.name}
                  <div style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>{d.version}</div>
                </>
              ) : (
                <div style={{ textAlign: "center" }}>{d.name.charAt(0)}</div>
              )}
            </div>
          ))}
        </div>

        {sidebarOpen && (
          <>
            <button
              className="dx-btn dx-btn-outline"
              onClick={() => navigate("/comparison-tool")}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <span style={{ fontSize: 15 }}>⚖️</span> Comparison Tool
            </button>
            <button
              className="dx-btn dx-btn-outline"
              onClick={() => navigate("/metrics")}
              style={{
                display: "flex",
                alignItems: "center",
                marginTop: 8,
              }}
            >
              Edit Metrics
            </button>
            <button
              className="dx-btn dx-btn-outline"
              onClick={() => handleLogout()}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginTop: 8,
                opacity: 0.85
              }}
            >
              Logout
            </button>
          </>
        )}

      </div>

      <div style={{ flex: 1, padding: "28px 34px", overflowY: "auto", color: "var(--text-main)" }}>
        <h1 style={{ color: "var(--accent)", marginTop: 0 }}>{selectedDomain.name}</h1>

        <div className="dx-card" style={{ marginBottom: 20, padding: 18 }}>
          <div style={{ marginTop: 18 }}>
              <h3 className="dx-vis-title" style={{ textAlign: "center" }}>Package Rankings (Overall)</h3>

              <div className="dx-chart-area center-charts">
                <div className="dx-chart-bar-wrap">
                  <div className="dx-bar-slot">
                    <div className="dx-chart-bar bar-pytorch" style={{ height: '210px' }} />
                  </div>
                  <div className="dx-chart-name">PyTorch</div>
                </div>

                <div className="dx-chart-bar-wrap">
                  <div className="dx-bar-slot">
                     <div className="dx-chart-bar bar-tensorflow" style={{ height: '260px' }} />
                  </div>
                  <div className="dx-chart-name">TensorFlow</div>
                </div>

                <div className="dx-chart-bar-wrap">
                  <div className="dx-bar-slot">
                    <div className="dx-chart-bar bar-jax" style={{ height: '180px' }} />
                  </div>
                  <div className="dx-chart-name">JAX</div>
                </div>
              </div>
         </div>
      </div>

        <div className="dx-card" style={{ padding: 18 }}>

          <div style={{ marginTop: 40 }}>
              <h3 className="dx-vis-title" style={{ textAlign: "center" }}>Category Rankings</h3>

              <div className="dx-chart-area center-charts">
                <div className="dx-chart-bar-wrap">
                  <div className="dx-bar-slot">
                    <div className="dx-chart-bar bar-cyan" style={{ height: '130px' }} />
                  </div>
                  <div className="dx-chart-name">Usability</div>
                </div>

                <div className="dx-chart-bar-wrap">
                  <div className="dx-bar-slot">
                    <div className="dx-chart-bar bar-purple" style={{ height: '210px' }} />
                  </div>
                  <div className="dx-chart-name">Maintainability</div>
                </div>

                <div className="dx-chart-bar-wrap">
                  <div className="dx-bar-slot">
                    <div className="dx-chart-bar bar-blue" style={{ height: '260px' }} />
                  </div>
                  <div className="dx-chart-name">Reproducibility</div>
                </div>

                <div className="dx-chart-bar-wrap">
                  <div className="dx-bar-slot">
                    <div className="dx-chart-bar bar-green" style={{ height: '160px' }} />
                  </div>
                  <div className="dx-chart-name">Transparency</div>
                </div>
              </div>
            </div>


        </div>
      </div>

      <div
        className="dx-card"
        style={{
          width: 260,
          padding: 18,
          borderLeft: "1px solid rgba(255,255,255,0.08)",
          color: "var(--text-main)"
        }}
      >
        <h3 style={{ marginTop: 0, color: "var(--accent)" }}>Details</h3>

        <div className="dx-info-field"><strong>Name:</strong> {selectedDomain.name}</div>
        <div className="dx-info-field"><strong>Version:</strong> {selectedDomain.version}</div>
        <div className="dx-info-field">
          <strong>Authors:</strong>
          <ul style={{ margin: "6px 0 0 16px" }}>
            <li>Unknown</li>
            <li>Unknown</li>
          </ul>
        </div>
        <div className="dx-info-field">
          <strong>Description:</strong>
          <p style={{ marginTop: 6, opacity: 0.75 }}>
            Placeholder description text about the domain.
          </p>
        </div>
        <div className="dx-info-field">
          <strong>Link:</strong> <a href="#" style={{ color: "var(--accent)" }}>Research Paper</a>
        </div>
      </div>
    </div>
  );
};

export default Main;
