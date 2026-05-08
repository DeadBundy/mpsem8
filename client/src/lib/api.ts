export function getApiBaseUrl() {
  // Vite will inline env vars at build time. For local dev, set VITE_API_URL to http://localhost:5000.
  // For Vercel/Render split deployments, set VITE_API_URL to your Render backend origin.
  const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
  return (apiUrl || "").replace(/\/+$/, "");
}

export function apiUrl(path: string) {
  const base = getApiBaseUrl();
  // If no API base URL is provided, fall back to relative calls (same-origin).
  if (!base) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

