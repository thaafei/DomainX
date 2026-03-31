import React from 'react';
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";

interface DomainInfoProps {
  selectedDomain: any;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const DomainInfo: React.FC<DomainInfoProps> = ({ selectedDomain, sidebarOpen, setSidebarOpen }) => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuthStore();

  const isLoggedIn = !!user;

  const actionButtonStyle = (collapsed = false): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    justifyContent: collapsed ? "center" : "flex-start",
    gap: 8,
    padding: collapsed ? "10px 0" : undefined,
    minWidth: 0,
  });

  return (
    <div
      className="dx-card"
      style={{
        width: sidebarOpen ? 260 : 60,
        transition: "width 0.1s ease, padding 0.1s ease",
        padding: sidebarOpen ? "16px" : "16px 6px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        color: "var(--text-main)",
        marginLeft: "auto",
        borderLeft: "1px solid rgba(255,255,255,0.08)",
        overflow: "hidden",
        flexShrink: 0,
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

          <div className="dx-info-field">
            <strong>Name:</strong> {selectedDomain?.domain_name || "N/A"}
          </div>

          <div className="dx-info-field">
            <strong>Authors:</strong>
            <ul style={{ margin: "6px 0 0 16px" }}>
              {Array.isArray(selectedDomain?.creators) && selectedDomain.creators.length > 0 ? (
                selectedDomain.creators.map((u: any) => {
                  const displayName = u?.full_name || u?.username || "Unknown";
                  const emailText = ` (${u.email})`;
                  return (
                    <li key={u.id}>
                      {displayName}
                      {emailText}
                    </li>
                  );
                })
              ) : (
                <li>Unknown</li>
              )}
            </ul>
          </div>

          <div className="dx-info-field">
            <strong>Description:</strong>
            <p style={{ marginTop: 6, opacity: 0.75 }}>
              {selectedDomain?.description || "N/A"}
            </p>
          </div>

          {selectedDomain?.paper_url && (
            <div className="dx-info-field">
              <strong>Paper:</strong>{" "}
              <a
                href={selectedDomain.paper_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--accent)" }}
              >
                {selectedDomain.paper_name || "View Paper"}
              </a>
            </div>
          )}
        </>
      )}

      <div
        style={{
          marginTop: sidebarOpen ? 0 : "auto",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {!isLoading && isLoggedIn && (
          <>
            <button
              className="dx-btn dx-btn-primary"
              disabled={!selectedDomain}
              onClick={() => navigate(`/edit-domain/${selectedDomain.domain_ID}`)}
              title="Edit Domain"
              style={actionButtonStyle(!sidebarOpen)}
            >
              <span style={{ fontSize: 15 }}>✏️</span>
              {sidebarOpen && <span>Edit Domain</span>}
            </button>

            <button
              className="dx-btn dx-btn-primary"
              disabled={!selectedDomain}
              onClick={() => navigate(`/edit-weights/${selectedDomain.domain_ID}`)}
              title="Edit Category Weights"
              style={actionButtonStyle(!sidebarOpen)}
            >
              <span style={{ fontSize: 15 }}>📊</span>
              {sidebarOpen && <span>Edit Category Weights</span>}
            </button>

            <button
              className="dx-btn dx-btn-primary"
              onClick={() => navigate("/metrics")}
              title="Edit Metrics"
              style={actionButtonStyle(!sidebarOpen)}
            >
              <span style={{ fontSize: 15 }}>🧮</span>
              {sidebarOpen && <span>Edit Metrics</span>}
            </button>
          </>
        )}

        <button
          className="dx-btn dx-btn-primary"
          disabled={!selectedDomain}
          onClick={() => navigate(`/comparison-tool/${selectedDomain.domain_ID}`)}
          title="Comparison Tool"
          style={actionButtonStyle(!sidebarOpen)}
        >
          <span style={{ fontSize: 15 }}>⚖️</span>
          {sidebarOpen && <span>Comparison Tool</span>}
        </button>
      </div>
    </div>
  );
};

export default DomainInfo;
