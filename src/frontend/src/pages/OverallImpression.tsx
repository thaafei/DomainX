import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiUrl } from "../config/api";
import AuthTransition from "../components/AuthTransition";
import { ArrowLeft } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { headerCellStyle } from "../components/CellComponents";

interface CategoryScores {
  [categoryName: string]: { [libraryName: string]: number };
}

const OverallImpressionPage: React.FC = () => {
  const { domainId } = useParams<{ domainId: string }>();
  const navigate = useNavigate();
  const DOMAIN_ID = domainId;
  const { isLoading: authLoading } = useAuthStore();

  const [domainName, setDomainName] = useState("");
  const [categoryScores, setCategoryScores] = useState<CategoryScores>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedLibraries = React.useMemo(() => {
    const categories = Object.keys(categoryScores);
    const libs = categories.length > 0 ? Object.keys(categoryScores[categories[0]]) : [];

    if (!sortColumn) return libs;

    return [...libs].sort((a, b) => {
      let comparison = 0;

      if (sortColumn === 'library') {
        comparison = a.toLowerCase().localeCompare(b.toLowerCase());
      } else {
        const aValue = categoryScores[sortColumn]?.[a] || 0;
        const bValue = categoryScores[sortColumn]?.[b] || 0;
        comparison = aValue - bValue;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [categoryScores, sortColumn, sortDirection]);

  useEffect(() => {
    if (!DOMAIN_ID) return;
    document.title = "DomainX – Overall Impression";
    loadPageData();
  }, [DOMAIN_ID]);

  const getDomainSpecification = async () => {
    try {
      const response = await fetch(apiUrl(`/domain/${DOMAIN_ID}/`), {
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Domain not found");
        }
        throw new Error("Failed to fetch domain specifications");
      }

      const data = await response.json();
      setDomainName(data.domain_name || "");
      return data;
    } catch (error) {
      console.error("Error:", error);
      setError(error instanceof Error ? error.message : "Failed to load domain");
      return null;
    }
  };

  const loadPageData = async () => {
    try {
      setLoading(true);
      setError(null);

      const domainData = await getDomainSpecification();

      if (domainData) {
        const res = await fetch(
          apiUrl(`/library_metric_values/ahp/${DOMAIN_ID}/`),
          {
            credentials: "include",
          }
        );

        const contentType = res.headers.get("content-type") || "";
        const text = await res.text();

        if (!res.ok) {
          if (res.status === 403) {
            setTimeout(() => {
              navigate("/login", { state: { from: `/overall-impression/${DOMAIN_ID}` } });
            }, 2000);
            return;
          }
          throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
        }

        if (!contentType.includes("application/json")) {
          throw new Error(
            `Expected JSON, got ${contentType}. Body starts with: ${text.slice(0, 80)}`
          );
        }

        const data = JSON.parse(text);
        setCategoryScores(data.raw_scores || {});
      }
    } catch (err) {
      console.error("Error loading AHP data:", err);
      setError(err instanceof Error ? err.message : "Failed to load AHP data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AuthTransition message="Loading..." />
    );
  }

  if (error) {
    return (
      <div className="dx-bg" style={{ display: "flex", height: "100vh", justifyContent: "center", alignItems: "center" }}>
        <div
          className="dx-card"
          style={{
            padding: "40px",
            maxWidth: "500px",
            textAlign: "center",
            color: "white"
          }}
        >
          <h2 style={{ color: "var(--accent)", marginBottom: "20px" }}>Error</h2>
          <p style={{ marginBottom: "20px" }}>{error}</p>
          <button
            className="dx-btn dx-btn-primary"
            onClick={() => navigate("/")}
          >
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  const categories = Object.keys(categoryScores);
  const libraries = categories.length > 0 ? Object.keys(categoryScores[categories[0]]) : [];

  return (
    <div className="dx-bg" style={{ display: "flex", height: "100vh" }}>
      <div
        style={{
          flex: 1,
          padding: "28px 32px",
          position: "relative",
          color: "white",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          minHeight: 0,
        }}
      >
        <div className="stars"></div>
         <button
          className="dx-btn dx-btn-outline"
          style={{ width: "10%", fontSize: "1rem", textAlign: "center" }}
          onClick={() => navigate(`/comparison-tool/${DOMAIN_ID}`)}
        >
          <ArrowLeft size={18} /> Back
        </button>
        <h1 style={{ color: "var(--accent)", marginBottom: 20 }}>
          {domainName} – Overall Impression
        </h1>

        <div
          className="dx-card"
          style={{
            padding: 20,
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              marginBottom: 12,
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div style={{ flexGrow: 1 }} />
          </div>

          <div className="dx-table-wrap dx-table-scroll" style={{ flex: 1, minHeight: 0 }}>
            <table
              className="dx-table"
              style={{
                tableLayout: "fixed",
                width: "100%",
              }}
            >
              <thead>
                <tr>
                  <th
                    className="dx-th-sticky dx-sticky-left"
                    style={{
                      ...headerCellStyle,
                      textAlign: "left",
                      width: 200,
                      left: 0,
                    }}
                    onClick={() => handleSort('library')}
                  >
                    Library {sortColumn === 'library' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>

                  {categories.map((category) => (
                    <th
                      key={category}
                      style={{
                        textAlign: "left",
                        padding: "8px 8px",
                        fontSize: 12.5,
                        lineHeight: 1.25,
                        fontWeight: 700,
                        color: "rgba(255,255,255,0.92)",
                        background: "rgba(20, 24, 38, 0.96)",
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                        overflowWrap: "anywhere",
                        cursor: "pointer",
                        width: 180,
                      }}
                      title={category}
                      onClick={() => handleSort(category)}
                    >
                      {category} {sortColumn === category && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {sortedLibraries.map((library, rowIndex) => (
                  <tr
                    key={library}
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.08)",
                      background:
                        rowIndex % 2 === 0
                          ? "rgba(255,255,255,0.01)"
                          : "rgba(255,255,255,0.025)",
                    }}
                  >
                    <td
                      className="dx-sticky-left"
                      style={{
                        padding: "8px 10px",
                        fontWeight: 600,
                        verticalAlign: "top",
                        left: 0,
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                      }}
                      title={library}
                    >
                      {library}
                    </td>

                    {categories.map((category) => {
                      const score = categoryScores[category]?.[library];
                      const displayScore =
                        score != null && typeof score === "number" && score < 1 ? 0 : score;

                      return (
                        <td
                          key={category}
                          style={{
                            padding: "7px 8px",
                            verticalAlign: "top",
                            fontSize: 13,
                            lineHeight: 1.32,
                            color: "rgba(255,255,255,0.9)",
                            whiteSpace: "normal",
                            wordBreak: "break-word",
                          }}
                          title={score != null ? score.toString() : "—"}
                        >
                          {score != null ? displayScore : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            {libraries.length === 0 && (
              <div style={{ padding: 20, opacity: 0.6 }}>
                No data available for this domain.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverallImpressionPage;