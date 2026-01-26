import React, { useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { selectDomainDefinition } from 'recharts/types/state/selectors/axisSelectors';

interface DomainsListProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  domains: any[];
  selectedDomain: any;
  setSelectedDomain: (domain: any) => void;
  getAHPRanking: () => void;
  showDomainModal: boolean;
  setShowDomainModal: (show: boolean) => void;
  domainName: string;
  setDomainName: (name: string) => void;
  description: string;
  setDescription: (desc: string) => void;
  selectedCreatorIds: number[];
  setSelectedCreatorIds: (ids: number[]) => void;
  adminUsers: any[];
  formError: string;
  setFormError: (error: string) => void;
  handleCreateDomain: () => void;
  handleLogout: () => void;
}

const DomainsList: React.FC<DomainsListProps> = ({
  sidebarOpen,
  setSidebarOpen,
  domains,
  selectedDomain,
  setSelectedDomain,
  getAHPRanking,
  showDomainModal,
  setShowDomainModal,
  domainName,
  setDomainName,
  description,
  setDescription,
  selectedCreatorIds,
  setSelectedCreatorIds,
  adminUsers,
  formError,
  setFormError,
  handleCreateDomain,
  handleLogout,
}) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Auto-select current user when modal opens
  useEffect(() => {
    if (showDomainModal && user && adminUsers.length > 0) {
      const currentUserInList = adminUsers.find(u => u.id === user.id);
      if (currentUserInList && !selectedCreatorIds.includes(user.id)) {
        setSelectedCreatorIds([...selectedCreatorIds, user.id]);
      }
    }
  }, [showDomainModal, user, adminUsers]);

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
        {domains.map((d) => (
          <div
            key={d.domain_ID} 
            className="dx-side-item"
            onClick={() => {setSelectedDomain(d); getAHPRanking();}}
            style={{
              padding: "12px 16px",
              cursor: "pointer",
              borderRadius: "8px",
              marginBottom: "6px",
              transition: "all 0.2s ease",                
              backgroundColor: d.domain_ID === selectedDomain?.domain_ID
                ? "rgba(255, 255, 255, 0.12)"
                : "transparent",
              border: d.domain_ID === selectedDomain?.domain_ID 
                ? "1px solid rgba(255, 255, 255, 0.1)" 
                : "1px solid transparent",
              
              color: d.domain_ID === selectedDomain?.domain_ID ? "var(--accent)" : "var(--text-main)",
              fontWeight: d.domain_ID === selectedDomain?.domain_ID ? 600 : 400,
            }}
          >
            {sidebarOpen ? (
              <>
                {d.domain_name}
                <div style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>{d.description}</div>
              </>
            ) : (
              <div style={{ textAlign: "center" }}>{d.domain_name?.charAt(0) || "?"}</div>
            )}
          </div>
        ))}
      </div>

      {sidebarOpen && (
        <>
          <button
            className="dx-btn dx-btn-outline"
            onClick={() => setShowDomainModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: 8,
            }}
          >
            <span style={{ fontSize: 15, marginRight: 8 }}>🌐</span> Create Domain
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
          {showDomainModal && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                backgroundColor: "rgba(0, 0, 0, 0.6)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 9999,
              }}
            >
              <div
                style={{
                  background: "#fff",
                  padding: "24px",
                  borderRadius: "12px",
                  width: "350px",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
                  color: "#333",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <h3>New Domain</h3>
                {formError && (
                  <div style={{ 
                    color: '#ff4d4f', 
                    backgroundColor: '#fff2f0', 
                    border: '1px solid #ffccc7', 
                    padding: '8px', 
                    borderRadius: '4px', 
                    marginBottom: '12px',
                    fontSize: '0.9rem' 
                  }}>
                    ⚠️ {formError}
                  </div>
                )}

                <input 
                  className="dx-input"
                  placeholder="Domain Name" 
                  value={domainName}
                  onChange={(e) => {
                    setDomainName(e.target.value);
                    if (formError) setFormError("");
                  }}
                  style={{ 
                    width: '100%', 
                    marginBottom: 12, 
                    padding: 8, 
                    color: 'black',
                    border: formError && !domainName ? '1px solid red' : '1px solid #ccc'
                  }}
                />

                <textarea 
                  className="dx-input"
                  placeholder="Description" 
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (formError) setFormError("");
                  }}
                  style={{ 
                    width: '100%', 
                    marginBottom: 12, 
                    padding: 8, 
                    minHeight: 60, 
                    color: 'black',
                    border: formError && !description ? '1px solid red' : '1px solid #ccc' 
                  }}
                />

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Creators:</label>
                  <div style={{ 
                    maxHeight: '150px', 
                    overflowY: 'auto', 
                    border: formError && selectedCreatorIds.length === 0 ? '1px solid red' : '1px solid #ccc',
                    borderRadius: '4px',
                    padding: '8px'
                  }}>
                    {adminUsers.length === 0 ? (
                      <div style={{ color: '#999', fontSize: '0.9rem' }}>Loading users...</div>
                    ) : (
                      adminUsers.map((user) => (
                        <label 
                          key={user.id} 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            padding: '4px 0',
                            cursor: 'pointer'
                          }}
                        >
                          <input 
                            type="checkbox"
                            checked={selectedCreatorIds.includes(user.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCreatorIds([...selectedCreatorIds, user.id]);
                              } else {
                                setSelectedCreatorIds(selectedCreatorIds.filter(id => id !== user.id));
                              }
                              if (formError) setFormError("");
                            }}
                            style={{ marginRight: 8 }}
                          />
                          <span>{user.email} ({user.username})</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="dx-btn" onClick={() => {
                    setShowDomainModal(false);
                    setFormError("");
                    setSelectedCreatorIds([]);
                    setDomainName("");
                    setDescription("");
                  }}>
                    Cancel
                  </button>
                  <button className="dx-btn dx-btn-primary" onClick={handleCreateDomain}>
                    Create
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DomainsList;
