import React, { useState, useEffect } from "react";

interface Category {
  category_ID: string;
  category_name: string;
  category_description: string;
}

const CategoriesPage: React.FC = () => {
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);


useEffect(() => {
  const loadAll = async () => {
    try {
      const [categoriesRes] = await Promise.all(
        [fetch("http://127.0.0.1:8000/api/categories/", { credentials: "include" })]
      );

      const categoriesData = await categoriesRes.json();
    } catch (err) {
      console.error(err);
    }
  };

  loadAll();
}, []);


  const addCategory = async () => {
    if (!newName.trim()) return;

    const payload = {
      category_name: newName,
      description: newDesc.trim() || null,
    };


    try {
      const res = await fetch("http://127.0.0.1:8000/api/categories/create/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const responseBody = await res.text();

      if (!res.ok) {
        console.error("status:", res.status);
        console.error("body:", responseBody);

        let errorMsg = responseBody;
        try {
          const errorJson = JSON.parse(responseBody);
          errorMsg = errorJson.detail || errorJson.error || responseBody;
        } catch (e) {
        }
        throw new Error(`API Error (${res.status}): ${errorMsg}`);
      }

      const data = JSON.parse(responseBody);

      console.log("status:", res.status);
      console.log("body:", responseBody);
      setCategories(prev => {
          const tempMap = new Map(prev.map(m => [m.category_ID, m]));
          tempMap.set(data.metric_ID, data);

          return Array.from(tempMap.values());
      });

      setNewName("");
      setNewDesc("");

    } catch (err) {
      console.error(err);
    }
  };


  const deleteCategory = async (id: string) => {
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/categories/${id}/delete/`, {
          method: "DELETE",
          credentials: "include",
        });

        if (res.ok) {
          setCategories(prev => prev.filter(m => m.category_ID !== id));
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
            style={{ width: "100%", fontSize: "1rem", textAlign: "center" }}
            onClick={() => (window.location.href = "/main")}
          >
            ← Back
      </button>

      <button
            className="dx-btn dx-btn-outline"
            style={{ width: "100%", fontSize: "1rem", textAlign: "center" }}
            onClick={() => (window.location.href = "/category")}
          >
            Manage Categories
      </button>
    </div>

    <div
      style={{
        flex: 1,
        padding: "40px 60px",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      <div className="stars"></div>

      <div style={{ maxWidth: "900px", color: "white" }}>
       <h1 style={{ color: "var(--accent)" }}>Manage Categories</h1>

      <div className="dx-card" style={{ padding: 20, marginBottom: 24 }}>
        <h3>Add New Category</h3>

        <input
          className="dx-input"
          placeholder="Metric name..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          style={{ marginBottom: 10 }}
        />

        <input
          className="dx-input"
          placeholder="Description (optional)"
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
          style={{ marginBottom: 10 }}
        />

        <button className="dx-btn" onClick={addCategory}>
          Add Category
        </button>
      </div>

      <div className="dx-card" style={{ padding: 20 }}>
        <h3>Existing Categories</h3>

        <table style={{ width: "100%", marginTop: 10, borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: 8 }}>Name</th>
              <th style={{ textAlign: "left", padding: 8 }}>Description</th>
              <th style={{ width: 100 }}></th>
            </tr>
          </thead>

          <tbody>
            {categories.map((c) => (
              <tr
                key={c.category_ID}
                style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}
              >
                <td style={{ padding: 8 }}>{c.category_name}</td>
                <td style={{ padding: 8 }}>{c.category_description || "—"}</td>
                <td style={{ padding: 8 }}>
                  <button
                    className="dx-btn dx-btn-outline"
                    style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
                    onClick={() => deleteCategory(c.category_ID)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {categories.length === 0 && (
          <div style={{ padding: 20, opacity: 0.6 }}>No categories yet.</div>
        )}
      </div>
      </div>

    </div>
  </div>
);


};

export default CategoriesPage;
