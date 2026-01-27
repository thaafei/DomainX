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
      const { user } = useAuthStore();
      
      // Check if current user is a creator or superadmin
      const isCreator = user && selectedDomain?.creators?.some((c: any) => c.id === user.id);
      const isSuperAdmin = user?.role === "superadmin";
      const canEditDomain = isCreator || isSuperAdmin;

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
            {/* commenting this field out since our versioning is not implemented yet
              <div className="dx-info-field"><strong>Version:</strong> {selectedDomain?.description || "No version available"}</div>
            */}
            <div className="dx-info-field">
              <strong>Authors:</strong>
              <ul style={{ margin: "6px 0 0 16px" }}>
                {Array.isArray(selectedDomain?.creators) && selectedDomain.creators.length > 0 ? (
                  selectedDomain.creators.map((u: any) => {
                    const displayName = u?.full_name || u?.username || "Unknown";
                    const emailText = ` (${u.email})`;
                    return (
                      <li key={u.id}>{displayName}{emailText}</li>
                    );
                  })
                ) : (
                  <li>Unknown</li>
                )}
              </ul>
            </div>
            <div className="dx-info-field">
                <strong>Description:</strong>
                <p style={{ marginTop: 6, opacity: 0.75 }}>{selectedDomain?.description || "N/A"}</p>
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
            {canEditDomain && (
              <button
                className="dx-btn dx-btn-primary"
                onClick={() => navigate(`/edit-domain/${selectedDomain.domain_ID}`)}
                style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}
              >
                <span style={{ fontSize: 15 }}>✏️</span> Edit Domain
              </button>
            )}
            
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
