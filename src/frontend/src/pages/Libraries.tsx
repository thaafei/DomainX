import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useParams } from 'react-router-dom';

import { apiUrl } from "../config/api";
interface Library {
  library_ID: string;
  library_name: string;
  url: string | null;
  programming_language: string;
}

const AddLibraryPage: React.FC = () => {
  const { domainId } = useParams<{ domainId: string }>();
  const DOMAIN_ID = domainId
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
        const formatUUID = (rawId: string) => {
            if (rawId && rawId.length === 32 && !rawId.includes('-')) {
              return rawId.substring(0, 8) + '-' +
                     rawId.substring(8, 12) + '-' +
                     rawId.substring(12, 16) + '-' +
                     rawId.substring(16, 20) + '-' +
                     rawId.substring(20, 32);
            }
            return rawId;
          };

      const formattedDomainId = formatUUID(DOMAIN_ID || "");
      const res = await fetch(apiUrl(`/api/libraries/${formattedDomainId}/`), {
        credentials: "include",
      });
      const responseText = await res.text();
      if (!res.ok) {
          throw new Error(`Server Error (${res.status}): See console for details.`);
      }
      const data = JSON.parse(responseText);
      //const data = await res.json();
      setLibraries(data.libraries);
    } catch (err) {
      console.error(err);
    }
  };

  const addLibrary = async () => {
    if (!name.trim()) return;

    const payload = {
      library_name: name,
      url: url.trim() || null,
      programming_language: language.trim(),
      domain: DOMAIN_ID,
    };

    try {
      const res = await fetch(apiUrl("/api/libraries/create/"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const text = await res.text();

    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {

    }

    if (!res.ok) {
      console.error("HTTP", res.status, "body:", text);
      throw new Error(data ? JSON.stringify(data) : text);
    }


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
      const res = await fetch(apiUrl(`/api/libraries/${id}/delete/`), {
        method: "DELETE",
        credentials: "include"
      });

      if (res.ok) {
        setLibraries(prev => prev.filter(l => l.library_ID !== id));
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
          onClick={() => navigate(`/comparison-tool/${domainId}`)}
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
                <tr key={lib.library_ID} style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <td style={{ padding: 8 }}>{lib.library_name}</td>
                  <td style={{ padding: 8 }}>{lib.programming_language || "—"}</td>
                  <td style={{ padding: 8 }}>{lib.url || "—"}</td>
                  <td style={{ padding: 8 }}>
                    <button className="dx-btn dx-btn-outline"
                      style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
                      onClick={() => deleteLibrary(lib.library_ID)}>
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
