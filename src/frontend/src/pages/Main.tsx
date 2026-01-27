import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { apiUrl } from "../config/api";
import DomainsList from "../components/DomainsList";
import DomainInfo from "../components/DomainInfo";

const Main: React.FC = () => {
  const navigate = useNavigate();
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [moreInfoSidebarOpen, setMoreInfoSidebarOpen] = useState(false);
  const [domains, setDomains] = useState<any[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<any>(null);;
  const [loading, setLoading] = useState(true);
  const { logout, setUser } = useAuthStore();
  const [showDomainModal, setShowDomainModal] = useState(false);
  const [domainName, setDomainName] = useState("");
  const [description, setDescription] = useState("");
  const [globalRanking, setGlobalRanking] = useState<Record<string, number>>({});
  const [graph, setGraph] = useState(false);
  const [formError, setFormError] = useState("");
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [selectedCreatorIds, setSelectedCreatorIds] = useState<number[]>([]);
  
  const fetchCurrentUser = async () => {
    try {
      const response = await fetch(apiUrl("/me/"), {
        method: 'GET',
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.log("Error fetching current user:", error);
    }
  };
  
  const fetchUsers = async () => {
    try {
      const response = await fetch(apiUrl('/users/?role=admin,superadmin'), {
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
    const response = await fetch(apiUrl('/domain/'),{
      method: "GET"
    });
      if (response.ok) {
        const data = await response.json();
        setDomains(data);
        // Restore last selected domain or default to first
        if (data.length > 0) {
          const savedId = localStorage.getItem("dx:lastDomainId");
          const domainToSelect = savedId
            ? data.find((d: any) => d.domain_ID === savedId) || data[0]
            : (selectedDomain || data[0]);

          if (!selectedDomain || domainToSelect.domain_ID !== selectedDomain.domain_ID) {
            setSelectedDomain(domainToSelect);
          }

          const ahpRes = await fetch(apiUrl(`/aph/${domainToSelect.domain_ID}/`), {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });

          if (ahpRes.ok) {
            const ahpData = await ahpRes.json();
            setGlobalRanking(ahpData.global_ranking);
            setGraph(true)
          } else {
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
    const response = await fetch(apiUrl(`/aph/${selectedDomain.domain_ID}/`), {
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
    fetchCurrentUser();
    fetchDomains();
    fetchUsers();
  }, []);

  // Persist last selected domain for smoother back navigation
  useEffect(() => {
    if (selectedDomain?.domain_ID) {
      try {
        localStorage.setItem("dx:lastDomainId", String(selectedDomain.domain_ID));
      } catch {}
    }
  }, [selectedDomain]);

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
    const errors = [];
    
    if (!domainName.trim() || !description.trim()) {
      errors.push("Both name and description are required.");
    }
    if (selectedCreatorIds.length === 0) {
      errors.push("At least one creator must be selected.");
    }
    
    if (errors.length > 0) {
      setFormError(errors.join(" "));
      return;
    }
    setFormError("");
    try {
      const response = await fetch(apiUrl('/domain/create/'), {
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
        const domainsResponse = await fetch(apiUrl('/domain/'), {
          method: "GET"
        });
        if (domainsResponse.ok) {
          const data = await domainsResponse.json();
          setDomains(data);
          if (selectedDomain) {
            const updatedDomain = data.find((d: any) => d.domain_ID === selectedDomain.domain_ID);
            if (updatedDomain) {
              setSelectedDomain(updatedDomain);
            }
          }
        }
      } else {
        setFormError("Failed to create domain. Please try again.");
      }
    } catch (error) {
      setFormError("Network error. Could not connect to server.");
    }
  };
  return (
    <div className="dx-bg" style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <DomainsList
        sidebarOpen={leftSidebarOpen}
        setSidebarOpen={setLeftSidebarOpen}
        domains={domains}
        selectedDomain={selectedDomain}
        setSelectedDomain={setSelectedDomain}
        getAHPRanking={getAHPRanking}
        showDomainModal={showDomainModal}
        setShowDomainModal={setShowDomainModal}
        domainName={domainName}
        setDomainName={setDomainName}
        description={description}
        setDescription={setDescription}
        selectedCreatorIds={selectedCreatorIds}
        setSelectedCreatorIds={setSelectedCreatorIds}
        adminUsers={adminUsers}
        formError={formError}
        setFormError={setFormError}
        handleCreateDomain={handleCreateDomain}
        handleLogout={handleLogout}
      />
      
      {graph && (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          padding: '20px',
          gap: '20px'
        }}>
          <div className="dx-card" style={{ padding: '20px', background: '#1a1a1a' }}>
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
        </div>
      )}

      <DomainInfo 
        selectedDomain={selectedDomain}
        sidebarOpen={moreInfoSidebarOpen}
        setSidebarOpen={setMoreInfoSidebarOpen}
      />
    </div>
  );
};

export default Main;
