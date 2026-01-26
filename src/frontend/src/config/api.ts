const raw = process.env.REACT_APP_API_BASE_URL;
// Default to "/api" so dev proxy forwards to Django correctly
const API_BASE = (raw ? raw : "/api").replace(/\/$/, "");
export function apiUrl(path: string) {
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}
