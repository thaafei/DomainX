import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../config/api";
import { useAuthStore } from "../store/useAuthStore";
import SuccessNotification from "../components/SuccessNotification";

interface Domain {
  domain_ID: string;
  domain_name: string;
}

interface User {
  id: number;
  email: string;
  username: string;
  role: string;
  first_name: string;
  last_name: string;
  domains?: Domain[];
}

const UserProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'password'>('details');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const getSidebarItemStyle = (isActive: boolean) => ({
    padding: "12px 16px",
    cursor: "pointer",
    borderRadius: "8px",
    marginBottom: "4px",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    gap: 12,
    backgroundColor: isActive ? "rgba(255, 255, 255, 0.12)" : "transparent",
    border: isActive ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid transparent",
    color: isActive ? "var(--accent)" : "var(--text-main)",
    fontWeight: isActive ? 600 : 400,
    width: "calc(100% - 4px)", 
    boxSizing: "border-box" as const,
  });
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    user_name: "",
    email: "",
    role: "",
    domain_ids: [] as string[],
  });
  const [userDomains, setUserDomains] = useState<Domain[]>([]);

  const fetchAssignedDomains = async () => {
    if (!user?.id) return;
    
    try {
      const response = await fetch(apiUrl(`/users/${user.id}/domains/`), {
        method: "GET",
        credentials: "include",
      });
      
      if (response.ok) {
        const data = await response.json(); // This is the list from get_domains
        setUserDomains(data); // Store the full objects for display
        
        // Update formData so the checkboxes in the modal are checked
        setFormData(prev => ({
          ...prev,
          domain_ids: data.map((d: any) => String(d.domain_ID))
        }));
      }
    } catch (err) {
      console.error("Failed to fetch assigned domains:", err);
    }
  };

  // Call it on mount
  useEffect(() => {
    if (user?.id) {
      fetchAssignedDomains();
    }
  }, [user?.id]);
  const [allDomains, setAllDomains] = useState<Domain[]>([]);
  useEffect(() => {
    const fetchAllDomains = async () => {
      try {
        const response = await fetch(apiUrl("/domain/"), {
          method: "GET",
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setAllDomains(data);
        }
      } catch (err) {
        console.error("Error fetching domains:", err);
      }
    };
    fetchAllDomains();
  }, []);

  const toggleDomain = (domainId: string) => {
    setFormData(prev => ({
      ...prev,
      domain_ids: prev.domain_ids.includes(domainId)
        ? prev.domain_ids.filter(id => id !== domainId)
        : [...prev.domain_ids, domainId]
    }));
  };

  

  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const passwordsMatch = passwordData.new_password === passwordData.confirm_password;
  const newPasswordNotEmpty = passwordData.new_password.length > 0;
  const isFormValid = passwordData.current_password.length > 0 && 
                      newPasswordNotEmpty && 
                      passwordsMatch;

  const getInputBorder = (type: 'current' | 'new' | 'confirm') => {
    if (type === 'confirm') {
      if (!passwordData.confirm_password) return "1px solid var(--border-main)";
      return passwordsMatch ? "1px solid #4facfe" : "1px solid #ff4d4f";
    }
    const value = type === 'current' ? passwordData.current_password : passwordData.new_password;
    return value ? "1px solid #4facfe" : "1px solid var(--border-main)";
  };
  useEffect(() => {
    if (user) {
      const u = user as User; 
      setFormData({
        first_name: u.first_name || "",
        last_name: u.last_name || "",
        user_name: u.username || "",
        email: u.email || "",
        role: u.role || "user",
        domain_ids: u.domains ? u.domains.map((d: any) => String(d.domain_ID)) : [],
      });
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(apiUrl(`/users/${user.id}/`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update profile");
      }

      setSuccessMsg("Profile updated successfully!");
      setShowSuccess(true);
      setIsModalOpen(false);
      setTimeout(() => {
        setShowSuccess(false);
      }, 1000);

    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.new_password !== passwordData.confirm_password) {
      setError("New passwords do not match");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(apiUrl(`/users/${user?.id}/change-password/`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          old_password: passwordData.current_password,
          new_password: passwordData.new_password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to change password");
      }

      setSuccessMsg("Password changed successfully!");
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
      }, 1000);
      setPasswordData({ current_password: "", new_password: "", confirm_password: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };
  const openEditDomains = () => {
    const u = user as unknown as User;
    setFormData(prev => ({
        ...prev,
        domain_ids: u.domains?.map(d => String(d.domain_ID)) || []
    }));
    setIsModalOpen(true);
  };

  const allFieldsFilled = passwordData.current_password && passwordData.new_password && passwordData.confirm_password;
  const isPasswordFormValid = allFieldsFilled && passwordsMatch;
  if (!user) return null;
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

  return (
    <div className="dx-bg" style={{ display: "flex", height: "100vh", padding: "24px", gap: "24px", boxSizing: "border-box", position: "relative", overflow: "hidden" }}>
      <div className="stars"></div>

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
          zIndex: 10,
        }}
      >
        <div
          style={{ cursor: "pointer", fontSize: 24, color: "var(--accent)", textAlign: sidebarOpen ? "left" : "center" }}
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? "⟨" : "⟩"}
        </div>

        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px" }}>
          <div
            className="dx-side-item"
            onClick={() => { setActiveTab('details'); setError(null); }}
            style={getSidebarItemStyle(activeTab === 'details')}
          >
            {sidebarOpen ? (
              <>
                <span style={{ fontSize: "1.1rem" }}>👤</span>
                <span>Account Details</span>
              </>
            ) : (
              <div style={{ width: "100%", textAlign: "center" }}>👤</div>
            )}
          </div>

          <div
            className="dx-side-item"
            onClick={() => { setActiveTab('password'); setError(null); }}
            style={getSidebarItemStyle(activeTab === 'password')}
          >
            {sidebarOpen ? (
              <>
                <span style={{ fontSize: "1.1rem" }}>🔑</span>
                <span>Change Password</span>
              </>
            ) : (
              <div style={{ width: "100%", textAlign: "center" }}>🔑</div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <button className="dx-btn dx-btn-outline" onClick={() => navigate("/main")} style={{ justifyContent: sidebarOpen ? "flex-start" : "center" }}>
            <span>{sidebarOpen ? "← Dashboard" : "🏠"}</span>
          </button>
          <button className="dx-btn dx-btn-outline" onClick={handleLogout} style={{ justifyContent: sidebarOpen ? "flex-start" : "center", color: "#ff7b72" }}>
            <span>{sidebarOpen ? "Logout" : "🚪"}</span>
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", justifyContent: "center", overflowY: "auto", zIndex: 1 }}>
        <div style={{ width: "100%", maxWidth: "850px", paddingTop: "20px" }}>
          <h1 style={{ color: "white", marginBottom: "30px", fontWeight: "300" }}>
            {activeTab === 'details' ? 'Account Settings' : 'Security Settings'}
          </h1>

          <div className="dx-card" style={{ padding: "40px", border: "1px solid rgba(255,255,255,0.05)" }}>
            
            {error && (
              <div style={{ color: '#ff7b72', backgroundColor: 'rgba(248, 81, 73, 0.1)', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(248, 81, 73, 0.2)', marginBottom: '24px', fontSize: '0.9rem' }}>
                ⚠️ {error}
              </div>
            )}

            {activeTab === 'details' ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>First Name</label>
                  <input className="dx-input" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>Last Name</label>
                  <input className="dx-input" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>Username</label>
                  <input className="dx-input" value={formData.user_name} onChange={(e) => setFormData({ ...formData, user_name: e.target.value })} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>Email Address</label>
                  <input className="dx-input" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>                
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>Account Role</label>
                  <input 
                    className="dx-input" 
                    value={formData.role} 
                    readOnly 
                    style={{ cursor: 'not-allowed', backgroundColor: 'rgba(255,255,255,0.02)', color: 'var(--accent)', fontWeight: 'bold' }} 
                  />
                </div>

                <div style={{ gridColumn: "span 2", marginTop: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <label style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>Associated Domains</label>
                    {(formData.role === "admin" || formData.role === "superadmin") && (
                      <button 
                        className="dx-btn dx-btn-outline" 
                        style={{ fontSize: '0.7rem', padding: '4px 10px', height: 'auto' }}
                        onClick={openEditDomains}
                      >
                        Edit Assignments
                      </button>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', minHeight: '40px', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    {userDomains.length > 0 ? (
                      allDomains
                        .filter(d => formData.domain_ids.includes(String(d.domain_ID)))
                        .map((domain) => (
                          <span 
                            key={domain.domain_ID} 
                            style={{ 
                              background: 'rgba(79, 172, 254, 0.1)', 
                              border: '1px solid rgba(79, 172, 254, 0.2)', 
                              padding: '4px 12px', 
                              borderRadius: '15px', 
                              fontSize: '0.8rem', 
                              color: '#4facfe' 
                            }}
                          >
                            🌐 {domain.domain_name}
                          </span>
                        ))
                    ) : (
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>No domains assigned</span>
                    )
                  }
                  </div>
                </div>

                <div style={{ gridColumn: "span 2", marginTop: "12px" }}>
                  <button className="dx-btn dx-btn-primary" onClick={handleUpdateProfile} disabled={loading} style={{ padding: "12px 40px" }}>
                    {loading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ maxWidth: "450px", display: "flex", flexDirection: "column", gap: "24px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>Current Password</label>
                  <input 
                    className="dx-input" 
                    type="password" 
                    value={passwordData.current_password} 
                    onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })} 
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>New Password</label>
                  <input 
                    className="dx-input" 
                    type="password" 
                    value={passwordData.new_password} 
                    onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })} 
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>Confirm New Password</label>
                  <input 
                    className="dx-input" 
                    type="password" 
                    style={{ border: getInputBorder('confirm') }}
                    value={passwordData.confirm_password} 
                    onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })} 
                  />
                  {passwordData.confirm_password && !passwordsMatch && (
                    <span style={{ color: "#ff4d4f", fontSize: "0.75rem" }}>Passwords do not match</span>
                  )}
                </div>

                <button 
                  className="dx-btn dx-btn-primary" 
                  onClick={handleChangePassword} 
                  disabled={!isPasswordFormValid || loading}
                  style={{ 
                    width: "fit-content", 
                    padding: "12px 32px", 
                    marginTop: "8px",
                    opacity: isFormValid ? 1 : 0.5,
                    cursor: isFormValid ? "pointer" : "not-allowed"
                  }}
                >
                  {loading ? "Updating..." : "Update Password"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, backdropFilter: 'blur(4px)' }}>
          <div className="dx-card" style={{ width: '100%', maxWidth: '500px', padding: '30px', border: '1px solid rgba(79, 172, 254, 0.3)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
            <h2 style={{ color: 'white', marginBottom: '10px', fontWeight: '300' }}>Manage Domains</h2>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginBottom: '20px' }}>Select the domains associated with this account.</p>
            
            <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '25px', display: 'grid', gridTemplateColumns: '1fr', gap: '8px', paddingRight: '10px' }}>
              {allDomains.map(domain => (
                <label key={domain.domain_ID} style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'white', cursor: 'pointer', padding: '10px 15px', borderRadius: '6px', background: formData.domain_ids.includes(String(domain.domain_ID)) ? 'rgba(79, 172, 254, 0.1)' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', transition: '0.2s' }}>
                  <input 
                    type="checkbox" 
                    checked={formData.domain_ids.includes(String(domain.domain_ID))}
                    onChange={() => toggleDomain(String(domain.domain_ID))}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.95rem' }}>{domain.domain_name}</span>
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="dx-btn dx-btn-outline" onClick={() => setIsModalOpen(false)} style={{ padding: '10px 25px' }}>Cancel</button>
              <button className="dx-btn dx-btn-primary" onClick={handleUpdateProfile} style={{ padding: '10px 25px' }}>Save Assignments</button>
            </div>
          </div>
        </div>
      )}

      <SuccessNotification show={showSuccess} message={successMsg} />
    </div>
  );
};

export default UserProfilePage;