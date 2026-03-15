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
import Plot from 'react-plotly.js';
import { apiUrl } from "../config/api";
import DomainsList from "../components/DomainsList";
import DomainInfo from "../components/DomainInfo";
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import Plotly, { Data, Layout } from "plotly.js-dist-min";

// Helper for image conversion
const dataUrlToBlob = (data: string) => {
  if (!data) return new Blob();

  // 1. Handle Raw XML/SVG tags
  if (data.startsWith('<svg') || data.startsWith('<?xml')) {
    return new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
  }

  // 2. Handle Data URLs
  if (data.startsWith('data:')) {
    const [header, body] = data.split(',');
    
    if (header.includes('base64')) {
      // Decode Base64 (usually for PNG/JPEG)
      const bin = window.atob(body);
      const arr = new Uint8Array(bin.length).map((_, i) => bin.charCodeAt(i));
      return new Blob([arr], { type: header.split(':')[1].split(';')[0] });
    } else {
      // Decode URL-encoded string (usually for SVG)
      return new Blob([decodeURIComponent(body)], { type: 'image/svg+xml;charset=utf-8' });
    }
  }
  
  return new Blob([data], { type: 'text/plain' });
};

const getPastelColor = (index: number) => {
  const hue = (index * 137.5) % 360; 
  return `hsl(${hue}, 60%, 70%)`;
};

interface LibraryRow {
  library_ID: string;
  library_name: string;
  metrics: { [metricName: string]: string | number | null };
}

interface AhpData {
  global_ranking: Record<string, number>;
  category_details: Record<string, Record<string, number>>;
}

const downloadConfig: any = {
  responsive: true,
  displayModeBar: true,
  modeBarButtonsToRemove: ['select2d', 'lasso2d', 'zoomIn2d', 'zoomOut2d'],
  toImageButtonOptions: {
    format: 'png',
    filename: 'domainx_analysis',
    height: 500,
    width: 700,
    scale: 2,
    setBackground: 'transparent' 
  }
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
  const [ahpData, setAhpData] = useState<AhpData | null>(null);
  const [libraries, setLibraries] = useState<LibraryRow[]>([]);
  const [selectedIndividualAhpCategories, setSelectedIndividualAhpCategories] = useState<string[]>([]);
  const [plotlyCharts, setPlotlyCharts] = useState<{ metric: string; rows: { label: string; value: number }[] }[]>([]);
  const toggleIndividualAhpCategory = (category: string) => {
    setSelectedIndividualAhpCategories(prev =>
      prev.includes(category) ? prev.filter(x => x !== category) : [...prev, category]
    );
  };
  const downloadFormat = "svg";
  //Derived List for Filter Buttons
  const categoryListForAhp = useMemo(() => {
    if (!ahpData?.category_details) return [];
    return Object.keys(ahpData.category_details);
  }, [ahpData]);
  function buildChartLayout(metric: string, isExport: boolean = false): Partial<Layout> {
  // Website: White text for dark theme | Download: Black text for general use
  const fontColor = isExport ? "#000000" : "#ffffff";
  const gridColor = isExport ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";

  return {
    title: {
      text: metric,
      font: { size: 18, color: fontColor },
    },
    paper_bgcolor: "rgba(0,0,0,0)", // Keep background transparent for both
    plot_bgcolor: "rgba(0,0,0,0)",
    xaxis: {
      title: { text: "Category", font: { color: fontColor } },
      tickfont: { color: fontColor },
      gridcolor: gridColor,
    },
    yaxis: {
      title: { text: metric, font: { color: fontColor } },
      tickfont: { color: fontColor },
      gridcolor: gridColor,
    },
    margin: { t: 80, l: 60, r: 60, b: 60 },
    autosize: true,
  };
}

  const buildChartData = (rows: { label: string; value: number }[]): Data[] => [{
    x: rows.map(r => r.label),
    y: rows.map(r => r.value),
    type: "bar",
    marker: { color: "#4facfe" }
  }];

  // Download All Logic
  const handleDownloadAll = async () => {
  if (!plotlyCharts.length) return;
  const zip = new JSZip();
  const dateStamp = new Date().toISOString().slice(0, 10);

  try {
    const downloadPromises = plotlyCharts.map(async (chart) => {
      const data = buildChartData(chart.rows);
      const layout = buildChartLayout(chart.metric, true);

      // Generating higher resolution for the zip files
      const dataUrl = await Plotly.toImage(
        { data, layout }, 
        { width: 1200, height: 800, format: 'svg' }
      );

      const blob = dataUrlToBlob(dataUrl as string);
      const safeName = chart.metric.replace(/[^\w\s]/gi, '').replace(/\s+/g, "_").toLowerCase();
      zip.file(`${safeName}.svg`, blob);
    });

    await Promise.all(downloadPromises);
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `DomainX_Analysis_${dateStamp}.zip`);
  } catch (error) {
    console.error("Export failed:", error);
  }
};
  // Trigger the update whenever categories or domain changes
  useEffect(() => {
      if (selectedDomain && ahpData) {
          generatePlotlyCharts();
      }
  }, [selectedIndividualAhpCategories, selectedDomain, ahpData]);

  const generatePlotlyCharts = () => {
    // 1. Create the Global chart object
    const globalChart = {
      metric: "Global AHP Ranking",
      rows: chartData.map(d => ({ label: d.name, value: d.score / 100 }))
    };

    // 2. Create the Category chart objects
    const categoryCharts = selectedIndividualAhpCategories.map(cat => {
      const categoryScores = ahpData?.category_details[cat];
      if (!categoryScores) return null;

      const rows = libraries.map(l => ({
        label: l.library_name,
        value: Number(categoryScores[l.library_name]) || 0
      })).sort((a, b) => b.value - a.value);

      return { metric: `${cat} Score`, rows };
    }).filter((chart): chart is { metric: string; rows: { label: string; value: number }[] } => 
      chart !== null
    );

    // 3. Set state with Global first, then Categories
    setPlotlyCharts([globalChart, ...categoryCharts]);
  };


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
        setAhpData(data);
        const libraryRows: LibraryRow[] = Object.keys(data.global_ranking).map(name => ({
        library_ID: name,
        library_name: name,
        metrics: {} 
      }));
      setLibraries(libraryRows);
        setGlobalRanking(data.global_ranking || {});
        
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
    .sort((a, b) => b.score - a.score);;
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
        
        // 1. Always set the full list to state so the UI has them
        setDomains(data);

        if (data.length > 0) {
          const savedId = localStorage.getItem("dx:lastDomainId");
          
          // 2. Logic for Logged In vs Guest
          let domainToSelect;

          if (user) {
            // LOGGED IN: Use saved ID or just the first one in the list
            domainToSelect = data.find((d: any) => String(d.domain_ID) === String(savedId)) || data[0];
          } else {
            // GUEST: Only look at published domains
            const publishedDomains = data.filter((d: any) => d.is_published);
            
            if (publishedDomains.length > 0) {
              domainToSelect = publishedDomains[0];
            } else {
              domainToSelect = null;
            }
          }

          setSelectedDomain(domainToSelect);

          if (domainToSelect) {
            await getAHPRanking(domainToSelect.domain_ID);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching domains:", error);
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
    if (!user) {
      navigate("/login");
      return;
    }

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
      {/* Left Sidebar - Existing Domains Logic */}
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
        isLoggedIn={!!user}
        isAdmin={user?.role === 'admin' || user?.role === 'superadmin'}
      />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative", overflow: "hidden" }}>
        <div className="stars"></div>

        {/* Tab Toggle */}
        <div style={{ 
          display: "inline-flex", 
          background: "#161b22", 
          padding: "4px", 
          borderRadius: "10px", 
          border: "1px solid #30363d",
          marginTop: "30px",
          marginBottom: "10px",
          zIndex: 10
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
                background: activeTab === tab ? "#4facfe" : "transparent",
                color: activeTab === tab ? "#fff" : "#8b949e",
                minWidth: "120px"
              }}
            >
              {tab.toUpperCase()} VIEW
            </button>
          ))}
        </div>

        {activeTab === "graph" && (
          <div className="dx-card" style={{ 
            padding: "24px", 
            width: "95%", 
            maxWidth: "1200px", 
            height: "calc(100vh - 150px)", // Set a fixed height relative to viewport
            overflowY: "auto",             // Enable vertical scrolling
            display: "flex", 
            flexDirection: "column",
            background: "rgba(13, 17, 23, 0.8)" 
          }}>
            
            {/* Filters and Download Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "24px", gap: "20px" }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ color: "white", marginBottom: "12px" }}>Detailed Analysis Filters</h3>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {categoryListForAhp.map(cat => (
                    <button 
                      key={cat}
                      onClick={() => toggleIndividualAhpCategory(cat)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "20px",
                        border: "1px solid #30363d",
                        background: selectedIndividualAhpCategories.includes(cat) ? "#4facfe" : "#161b22",
                        color: "white",
                        cursor: "pointer",
                        fontSize: "0.85rem"
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {plotlyCharts.length > 0 && (
                <button
                  className="dx-btn dx-btn-outline"
                  onClick={handleDownloadAll}
                  disabled={plotlyCharts.length === 0}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Download (.zip)
                </button>
              )}
            </div>

            {/* Scrollable Chart Area */}
            <div style={{ flex: 1, overflowY: "auto", paddingRight: "10px" }}>
              {plotlyCharts.length > 0 ? (
                plotlyCharts.map((chart) => (
                  <div key={chart.metric} style={{ marginBottom: "25px", background: "rgba(22, 27, 34, 0.5)", padding: "20px", borderRadius: "12px", border: "1px solid #30363d" }}>
                    <Plot
                      data={buildChartData(chart.rows)}
                      layout={buildChartLayout(chart.metric)}
                      config={downloadConfig}
                      style={{ width: "100%", height: "400px" }}
                    />
                  </div>
                ))
              ) : (
                <div style={{ textAlign: "center", padding: "60px", color: "#8b949e", border: "2px dashed #30363d", borderRadius: "12px" }}>
                  Select domain
                </div>
              )}
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
}

export default Main;
