import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
interface Library {
  Library_ID: string;
  Library_Name: string;
  Repository_URL: string | null;
  Programming_Language: string;
}

const DOMAIN_ID = "dd8d1992-d085-41e1-8ed0-7d292d4c2f2f";   // POC domain (need to delete later and replace with actual)

const AddLibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [language, setLanguage] = useState("");

  useEffect(() => {
    loadLibraries();
  }, []);

  const loadLibraries = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/libraries/${DOMAIN_ID}/`, {
        credentials: "include",
      });
      const data = await res.json();
      setLibraries(data.libraries);
    } catch (err) {
      console.error(err);
    }
  };

  const addLibrary = async () => {
    if (!name.trim()) return;

    const payload = {
      Library_Name: name,
      Repository_URL: url.trim() || null,
      Programming_Language: language.trim(),
      Domain: DOMAIN_ID,
    };

    try {
      const res = await fetch("http://127.0.0.1:8000/api/libraries/create/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data));

      setLibraries(prev => [...prev, data.library]);

      setName("");
      setUrl("");
      setLanguage("");
    } catch (err) {
      console.error(err);
    }
  };

  const deleteLibrary = async (id: string) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/libraries/${id}/delete/`, {
        method: "DELETE",
        credentials: "include"
      });

      if (res.ok) {
        setLibraries(prev => prev.filter(l => l.Library_ID !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="dx-bg" style={{ display: "flex", height: "100vh" }}>
      <div
        className="dx-card"
        style={{
          width: 160,
          padding: "22px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
          borderRight: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <button
          className="dx-btn dx-btn-outline"
          onClick={() => navigate("/comparisontool")}
        >
          ← Back
        </button>
      </div>

      <div style={{ flex: 1, padding: "40px 60px", color: "white" }}>
        <h1 style={{ color: "var(--accent)" }}>Manage Libraries</h1>

        <div className="dx-card" style={{ padding: 20, marginBottom: 24 }}>
          <h3>Add New Library</h3>

          <input className="dx-input" placeholder="Library name..."
            value={name} onChange={e => setName(e.target.value)}
            style={{ marginBottom: 10 }} />

          <input className="dx-input" placeholder="Repository URL (optional)"
            value={url} onChange={e => setUrl(e.target.value)}
            style={{ marginBottom: 10 }} />

          <input className="dx-input" placeholder="Programming language"
            value={language} onChange={e => setLanguage(e.target.value)}
            style={{ marginBottom: 10 }} />

          <button className="dx-btn" onClick={addLibrary}>Add Library</button>
        </div>

        <div className="dx-card" style={{ padding: 20 }}>
          <h3>Existing Libraries</h3>

          <table style={{ width: "100%", marginTop: 10, borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ padding: 8 }}>Name</th>
                <th style={{ padding: 8 }}>Language</th>
                <th style={{ padding: 8 }}>URL</th>
                <th style={{ width: 100 }}></th>
              </tr>
            </thead>

            <tbody>
              {libraries.map(lib => (
                <tr key={lib.Library_ID} style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <td style={{ padding: 8 }}>{lib.Library_Name}</td>
                  <td style={{ padding: 8 }}>{lib.Programming_Language || "—"}</td>
                  <td style={{ padding: 8 }}>{lib.Repository_URL || "—"}</td>
                  <td style={{ padding: 8 }}>
                    <button className="dx-btn dx-btn-outline"
                      style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
                      onClick={() => deleteLibrary(lib.Library_ID)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {libraries.length === 0 && (
            <div style={{ padding: 20, opacity: 0.6 }}>No libraries yet.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddLibraryPage;
