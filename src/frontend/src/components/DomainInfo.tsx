import React from 'react';
import { useNavigate } from "react-router-dom";

interface DomainInfoProps {
    selectedDomain: any;
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
}

const DomainInfo: React.FC<DomainInfoProps> = ({ selectedDomain, sidebarOpen, setSidebarOpen }) => {
      const navigate = useNavigate();

    return (
        <div
        className="dx-card"
        style={{
            width: sidebarOpen ? 260 : 60,
            transition: "0.28s",
            padding: sidebarOpen ? "16px" : "16px 6px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
            color: "var(--text-main)",
            marginLeft: "auto",
            borderLeft: "1px solid rgba(255,255,255,0.08)"
        }}
        >
        <div
            style={{ 
              cursor: "pointer", 
              fontSize: 24, 
              color: "var(--accent)",
              display: "flex",
              justifyContent: sidebarOpen ? "flex-start" : "flex-end",
              alignItems: "center"
            }}
            onClick={() => setSidebarOpen(!sidebarOpen)}
        >
            {sidebarOpen ? "⟩" : "⟨"}
        </div>

        {sidebarOpen && (
          <>
            <h3 style={{ marginTop: 0, color: "var(--accent)" }}>Details</h3>

            <div className="dx-info-field"><strong>Name:</strong> {selectedDomain?.domain_name || "N/A"}</div>
            <div className="dx-info-field"><strong>Version:</strong> {selectedDomain?.description || "No version available"}</div>
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
            <button
                className="dx-btn dx-btn-outline"
                disabled={!selectedDomain}
                onClick={() => navigate(`/comparison-tool/${selectedDomain.domain_ID}`)}
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
          </>
        )}
        </div>
    );
};

export default DomainInfo;
