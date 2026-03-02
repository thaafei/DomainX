import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import CustomIsometricBar from '../components/CustomIsometricBar';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Cell,
} from "recharts";
import { apiUrl } from "../config/api";
import DomainsList from "../components/DomainsList";
import DomainInfo from "../components/DomainInfo";
// 1. Helper for dynamic pastels
const getPastelColor = (index: number) => {
  const hue = (index * 137.5) % 360; 
  return `hsl(${hue}, 60%, 70%)`;
};

const Main: React.FC = () => {
  const navigate = useNavigate();
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [moreInfoSidebarOpen, setMoreInfoSidebarOpen] = useState(true);

  const [domains, setDomains] = useState<any[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<any>(null);
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

  const [localWeights, setLocalWeights] = useState<Record<string, number>>({});
  const [categories, setCategories] = useState<string[] | null>(null);

  const [activeTab, setActiveTab] = useState<"graph" | "table">("graph");
  const [tableData, setTableData] = useState<any[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateError, setUpdateError] = useState(null as string | null);
  const { user } = useAuthStore();
  const [editFormData, setEditFormData] = useState({
    first_name: "",
    last_name: "",
    user_name: "",
  });

  const [showSuccess, setShowSuccess] = useState(false);

  const handleUpdateUser = async () => {
    if (!user) return;
    try {
      setUpdateLoading(true);
      setUpdateError(null);
      const response = await fetch(apiUrl(`/users/${user.id}/`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          first_name: editFormData.first_name,
          last_name: editFormData.last_name,
          user_name: editFormData.user_name,
        }),
      });

      if (response.ok) {
        await fetchCurrentUser();
        setShowSuccess(true);
        // Automatically hide the message and close modal after 2 seconds
        setTimeout(() => {
          setShowSuccess(false);
          setIsEditModalOpen(false);
        }, 2000);
      } else {
        const errorData = await response.json();
        setUpdateError(errorData.error || "Update failed");
      }
    } catch (err) {
      setUpdateError("Network error");
    } finally {
      setUpdateLoading(false);
    }
  };

  const getAHPRanking = async (domainId: string) => {
    try {
      const response = await fetch(apiUrl(`/library_metric_values/ahp/${domainId}/`), {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setGlobalRanking(data.global_ranking || {});
        
        // Transform category_details for the table
        // data.category_details looks like: { "Popularity": { "React": 0.2, "Vue": 0.1 }, ... }
        const libraries = Object.keys(data.global_ranking);
        const rows = libraries.map(lib => ({
          name: lib,
          overall: data.global_ranking[lib],
          ...Object.keys(data.category_details).reduce((acc: any, cat) => {
            acc[cat] = data.category_details[cat][lib] || 0;
            return acc;
          }, {})
        }));
        
        setTableData(rows);
        setGraph(true);
      } else {
        setGraph(false);
      }
    } catch (err) {
      console.error("AHP fetch failed:", err);
      setGraph(false);
    }
  };
  const requestSort = (key: string) => {
    let direction: "asc" | "desc" = "desc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "desc") {
      direction = "asc";
    }
    setSortConfig({ key, direction });
  };

  const sortedTableData = [...tableData].sort((a, b) => {
    if (!sortConfig) return 0;
    const aVal = a[sortConfig.key];
    const bVal = b[sortConfig.key];
    return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
  });
  const activeCategories = useMemo(() => {
    if (!categories || !tableData.length) return [];

    // Filter categories: keep only those where at least one row has a valid number
    return categories.filter((cat: string) => 
      tableData.some(row => {
        const val = row[cat];
        return typeof val === 'number' && !isNaN(val) && val !== 0;
      })
    );
  }, [categories, tableData]);

  const chartData = Object.entries(globalRanking)
    .map(([name, score], index) => ({
      name,
      score: parseFloat(((score as number) * 100).toFixed(2)),
      color: getPastelColor(index),
    }))
    .sort((a, b) => b.score - a.score).slice(0, 10);;
  const fetchCurrentUser = async () => {
    try {
      const response = await fetch(apiUrl("/me/"), {
        method: "GET",
        credentials: "include",
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
      const response = await fetch(apiUrl("/users/?role=admin,superadmin"), {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setAdminUsers(data);
      }
    } catch (error) {
      console.log("Error fetching users:", error);
    }
  };

  // const getAHPRanking = async (domainId: string) => {
  //   try {
  //     const response = await fetch(apiUrl(`/library_metric_values/ahp/${domainId}/`), {
  //       method: "GET",
  //       headers: { "Content-Type": "application/json" },
  //       credentials: "include",
  //     });

  //     if (response.ok) {
  //       const data = await response.json();
  //       setGlobalRanking(data.global_ranking || {});
  //       setGraph(true);
  //     } else {
  //       setGraph(false);
  //     }
  //   } catch (err) {
  //     console.error("AHP fetch failed:", err);
  //     setGraph(false);
  //   }
  // };

  const fetchWeights = async (domainId: string) => {
    try {
      const res = await fetch(apiUrl(`/domain/${domainId}/category-weights/`), {
        method: "GET",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setLocalWeights(data || {});
      }
    } catch (err) {
      console.error("Weights fetch failed:", err);
    }
  };

  const fetchDomains = async () => {
    try {
      const response = await fetch(apiUrl("/domain/"), {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setDomains(data);

        if (data.length > 0) {
          const savedId = localStorage.getItem("dx:lastDomainId");
          const domainToSelect = savedId
            ? data.find((d: any) => String(d.domain_ID) === String(savedId)) || data[0]
            : data[0];

          setSelectedDomain(domainToSelect);

          await getAHPRanking(domainToSelect.domain_ID);
        }
      }
    } catch (error) {
      console.log("Error fetching domains:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
      document.title = "DomainX - Home";
    const fetchRules = async () => {
      try {
        const response = await fetch(apiUrl("/metrics/categories/"), {
          method: "GET",
          credentials: "include",
        });
        if (!response.ok) return;

        const data = await response.json();
        setCategories(data?.Categories || []);
      } catch (error) {
        console.error("Error fetching AHP rules:", error);
      }
    };

    fetchRules();
  }, []);

  useEffect(() => {
    fetchCurrentUser();
    fetchDomains();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (!selectedDomain?.domain_ID) return;

    const id = selectedDomain.domain_ID;

    try {
      localStorage.setItem("dx:lastDomainId", String(id));
    } catch {}

    getAHPRanking(id);
    fetchWeights(id);
  }, [selectedDomain]);

  const handleWeightChange = (category: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setLocalWeights((prev) => ({
      ...prev,
      [category]: numValue,
    }));
  };

  const saveWeights = async () => {
    if (!selectedDomain?.domain_ID) return;

    try {
      const res = await fetch(apiUrl(`/domain/${selectedDomain.domain_ID}/category-weights/`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ values: localWeights }),
      });

      if (res.ok) {
        alert("Weights updated successfully!");
        getAHPRanking(selectedDomain.domain_ID);
      }
    } catch (err) {
      console.error(err);
    }
  };

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
    const errors: string[] = [];

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
      const response = await fetch(apiUrl("/domain/"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          domain_name: domainName,
          description,
          creator_ids: selectedCreatorIds,
        }),
      });

      if (response.ok) {
        setShowDomainModal(false);
        setDomainName("");
        setDescription("");
        setSelectedCreatorIds([]);
        await fetchDomains(); // refresh list
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
        getAHPRanking={() => selectedDomain?.domain_ID && getAHPRanking(selectedDomain.domain_ID)}
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
        currentUser={user}
        editFormData={editFormData}
        setEditFormData={setEditFormData}
        isEditModalOpen={isEditModalOpen}
        setIsEditModalOpen={setIsEditModalOpen}
        handleUpdateUser={handleUpdateUser}
        updateLoading={updateLoading}
        updateError={updateError}
        showSuccess={showSuccess}
      />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", overflowY: "auto" }}>
        {/* Tab Toggle */}
        <div style={{ 
          display: "inline-flex", 
          background: "#161b22", 
          padding: "4px", 
          borderRadius: "10px", 
          border: "1px solid #30363d",
          marginBottom: "30px",
          boxShadow: "0 4px 10px rgba(0,0,0,0.3)"
        }}>
          {["graph", "table"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as "graph" | "table")}
              style={{
                padding: "10px 24px",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "0.9rem",
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                background: activeTab === tab ? "#4facfe" : "transparent",
                color: activeTab === tab ? "#fff" : "#8b949e",
                minWidth: "120px"
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab) e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab) e.currentTarget.style.color = "#8b949e";
              }}
            >
              {tab} View
            </button>
          ))}
        </div>

        {graph && activeTab === "graph" && (
          <div className="dx-card" style={{ padding: "30px", width: "95%", maxWidth: "1000px", background: "transparent", border: "none" }}>
            <h3 style={{ color: "white", marginBottom: "40px", textAlign: "left", fontSize: "1.5rem", fontWeight: "300" }}>
              Global AHP Ranking
            </h3>

            <div style={{ width: "100%", height: 450 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 60, right: 30, left: 20, bottom: 60 }}>
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "#666", fontSize: 12 }} 
                  />
                  <YAxis hide domain={[0, 110]} />
                  
                  <Bar 
                    dataKey="score" 
                    shape={<CustomIsometricBar />}
                    background={{ fill: 'transparent' }} // This allows the shape to receive height info
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                    
                    <LabelList 
                      dataKey="score" 
                      position="top" 
                      offset={25} 
                      fill="#fff"
                      style={{ fontWeight: 'bold' }}
                      formatter={(val: any) => `${val}%`} 
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              
              {/* Ranking Sub-labels (No.1, No.2, etc.) */}
              <div style={{ display: "flex", justifyContent: "space-around", marginTop: "-50px", paddingLeft: "40px", paddingRight: "30px" }}>
                {chartData.map((_, i) => (
                  <span key={i} style={{ color: "#4facfe", fontSize: "10px", fontWeight: "bold" }}>No.{i+1}</span>
                ))}
              </div>
            </div>
          </div>
        )}
        {graph && activeTab === "table" && (
          <div className="dx-card" style={{ width: "95%", maxWidth: "1200px", background: "#161b22", padding: "20px", borderRadius: "12px", border: "1px solid #30363d", overflowX: "auto", display: "block" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", color: "#c9d1d9", textAlign: "left", minWidth: "800px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #30363d" }}>
                  <th style={{ padding: "12px" }}>Library</th>
                  <th 
                    onClick={() => requestSort("overall")} 
                    style={{ padding: "12px", cursor: "pointer", color: sortConfig?.key === "overall" ? "#4facfe" : "inherit" }}
                  >
                    Overall {sortConfig?.key === "overall" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                  </th>
                  {activeCategories.map((cat: string) => (
                    <th 
                      key={cat}
                      onClick={() => requestSort(cat)}
                      style={{ 
                        padding: "12px", 
                        cursor: "pointer", 
                        color: sortConfig?.key === cat ? "#4facfe" : "inherit" 
                      }}
                    >
                      {cat} {sortConfig?.key === cat ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedTableData.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #21262d", background: idx % 2 === 0 ? "transparent" : "#0d1117" }}>
                    <td style={{ padding: "12px", fontWeight: "bold" }}>{row.name}</td>
                    <td style={{ padding: "12px", color: "#4facfe", fontWeight: "bold" }}>{(row.overall * 100).toFixed(2)}%</td>
                    {activeCategories.map((cat: string) => {
                      const score = row[cat];
                      const isValid = typeof score === 'number' && !isNaN(score);

                      return (
                        <td key={cat} style={{ padding: "12px", textAlign: "center" }}>
                          {isValid ? `${(score * 100).toFixed(2)}%` : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <DomainInfo selectedDomain={selectedDomain} sidebarOpen={moreInfoSidebarOpen} setSidebarOpen={setMoreInfoSidebarOpen} />
    </div>
  );
};

export default Main;
