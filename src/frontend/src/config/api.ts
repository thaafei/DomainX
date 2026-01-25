const raw = process.env.REACT_APP_API_BASE_URL;
const API_BASE = raw ? raw.replace(/\/$/, "") : "";
export function apiUrl(path: string) {
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}
