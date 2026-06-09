/**
 * Returns CORS headers for Chrome extension origins.
 * Extension service workers with host_permissions bypass CORS, but we still
 * add headers so preflight OPTIONS requests succeed and credentials work correctly.
 */
export function getCorsHeaders(origin: string | null): Record<string, string> {
  if (!origin?.startsWith("chrome-extension://")) return {}
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  }
}
