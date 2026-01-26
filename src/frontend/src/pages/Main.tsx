import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { apiUrl } from "../config/api";

const Main: React.FC = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [domains, setDomains] = useState<any[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<any>(null);;
  const [loading, setLoading] = useState(true);
  const { logout } = useAuthStore();
  const [showDomainModal, setShowDomainModal] = useState(false);
  const [domainName, setDomainName] = useState("");
  const [description, setDescription] = useState("");
  const [globalRanking, setGlobalRanking] = useState<Record<string, number>>({});
  const [graph, setGraph] = useState(false);
  const [formError, setFormError] = useState("");
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [selectedCreatorIds, setSelectedCreatorIds] = useState<number[]>([]);
  const fetchUsers = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/users/?role=admin,superadmin', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        console.log(data)
        setAdminUsers(data);
      }
    } catch (error) {
      console.log("Error fetching users:", error);
    }
  };

  const fetchDomains = async () => {
    try {
    const response = await fetch('http://127.0.0.1:8000/api/domain/');
      if (response.ok) {
        const data = await response.json();
        setDomains(data);
        // Set the first domain as default if none selected
        if (data.length > 0 && !selectedDomain) {
          const firstDomain = data[0];
          setSelectedDomain(firstDomain);
          const response = await fetch(`http://127.0.0.1:8000/api/aph/${firstDomain.domain_ID}/`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });

        if (response.ok) {
          const data = await response.json();
          setGlobalRanking(data.global_ranking);
          setGraph(true)
        }
        else {
          setGraph(false);
          }
        }
      }
    } catch (error) {
      console.log("Error fetching domains:", error);
    } finally {
      setLoading(false);
    }
  };

  const getAHPRanking = async () => {
    const response = await fetch(`http://127.0.0.1:8000/api/aph/${selectedDomain.domain_ID}/`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.ok) {
      const data = await response.json();
      setGlobalRanking(data.global_ranking);
      setGraph(true)
    }
    else {
      setGraph(false);
    }
  };
  const chartData = Object.entries(globalRanking)
    .map(([name, score]) => ({
      name,
      score: parseFloat(((score as number) * 100).toFixed(2))
    }))
    .sort((a, b) => b.score - a.score);

  useEffect(() => {
    fetchDomains();
    fetchUsers();
  }, []);

  if (loading) return <div>Loading...</div>;
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
        console.log(err);
      }
  };
  const handleCreateDomain = async () => {
    if (!domainName.trim() || !description.trim()) {
      setFormError("Both name and description are required.");
      return;
    }
    setFormError("");
    try {
      const response = await fetch('http://127.0.0.1:8000/api/domain/create/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain_name: domainName,
          description: description,
          creator_ids: selectedCreatorIds
        }),
      });
      if (response.ok) {
        setShowDomainModal(false);
        setDomainName("");
        setDescription("");
        setSelectedCreatorIds([]);
        fetchDomains();
      } else {
        setFormError("Failed to create domain. Please try again.");
      }
    } catch (error) {
      setFormError("Network error. Could not connect to server.");
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
              disabled={!selectedDomain}
              onClick={() => navigate(`/comparison-tool/${selectedDomain.domain_ID}`)}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <span style={{ fontSize: 15 }}>⚖️</span> Comparison Tool
            </button>
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
      
      {graph && (
        <div className="dx-card" style={{ padding: '20px', background: '#1a1a1a', marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ color: 'var(--accent)', margin: 0 }}>Global AHP Ranking</h3>
            <span style={{ fontSize: '0.8rem', color: '#888' }}>*Sum of priorities = 100%</span>
          </div>
          
          <div style={{ width: '100%', height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#ccc" 
                  angle={-45} 
                  textAnchor="end" 
                  interval={0}
                  tick={{ fill: '#ccc', fontSize: 11 }} 
                />
                <YAxis 
                  stroke="#ccc" 
                  tick={{ fill: '#ccc' }} 
                  unit="%" 
                  domain={[0, 'auto']}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#222', border: '1px solid var(--accent)', borderRadius: '4px' }}
                  itemStyle={{ color: 'var(--accent)' }}
                  formatter={(value) => {
                    const numericValue = Number(value) || 0;
                    return [`${numericValue.toFixed(2)}%`, 'Priority Score'];
                  }}
                />
                <Bar dataKey="score">
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      // The highest ranked library gets the full accent color
                      fill={index === 0 ? 'var(--accent)' : 'rgba(var(--accent-rgb), 0.4)'} 
                      style={{ transition: 'fill 0.3s ease' }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

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
      </div>
    </div>
  );
};

export default Main;
