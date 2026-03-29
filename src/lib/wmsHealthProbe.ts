// ══════════════════════════════════════════════════════════════
// WMS / ArcGIS Health Probe — checks endpoint availability
// and provides fallback URL resolution
// ══════════════════════════════════════════════════════════════

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export type ServerStatus = "unknown" | "checking" | "online" | "offline";

export interface ServerHealth {
  host: string;
  status: ServerStatus;
  checkedAt: number;
  latencyMs?: number;
}

// Cache: host → health (avoids repeated probes within 5 min)
const healthCache = new Map<string, ServerHealth>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function extractHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/**
 * Probe a single endpoint via proxy to avoid CORS.
 * Uses a lightweight HEAD-like request through the wfs-proxy.
 */
async function probeEndpoint(url: string, timeoutMs = 8000): Promise<boolean> {
  const proxyBase = `${SUPABASE_URL}/functions/v1/wfs-proxy`;
  // For ArcGIS: ?f=json returns metadata; for WMS: GetCapabilities
  let testUrl: string;
  if (url.includes("/MapServer")) {
    testUrl = `${url}?f=json`;
  } else {
    const sep = url.includes("?") ? "&" : "?";
    testUrl = `${url}${sep}SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(
      `${proxyBase}?mode=wms_ext&url=${encodeURIComponent(testUrl)}`,
      {
        headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        signal: controller.signal,
      }
    );
    clearTimeout(timer);
    // Check if response is valid (not 503, not HTML error page)
    if (!resp.ok) return false;
    const contentType = resp.headers.get("content-type") || "";
    const text = await resp.text();
    // 503/HTML error pages from upstream
    if (text.includes("503 Service") || text.includes("Service Temporarily Unavailable")) {
      return false;
    }
    // Valid JSON or XML response means server is alive
    return text.length > 50;
  } catch {
    clearTimeout(timer);
    return false;
  }
}

/**
 * Check health of a server (by host), with caching.
 */
export async function checkServerHealth(baseUrl: string): Promise<ServerHealth> {
  const host = extractHost(baseUrl);
  const cached = healthCache.get(host);
  if (cached && Date.now() - cached.checkedAt < CACHE_TTL) {
    return cached;
  }

  const start = Date.now();
  const ok = await probeEndpoint(baseUrl);
  const health: ServerHealth = {
    host,
    status: ok ? "online" : "offline",
    checkedAt: Date.now(),
    latencyMs: Date.now() - start,
  };
  healthCache.set(host, health);
  return health;
}

/**
 * Probe all unique servers from a list of URLs.
 * Returns a map of host → ServerHealth.
 */
export async function probeAllServers(
  urls: string[],
  onUpdate?: (statuses: Record<string, ServerHealth>) => void
): Promise<Record<string, ServerHealth>> {
  // Deduplicate by host
  const hostMap = new Map<string, string>();
  for (const url of urls) {
    const host = extractHost(url);
    if (!hostMap.has(host)) hostMap.set(host, url);
  }

  const statuses: Record<string, ServerHealth> = {};

  // Set all to "checking" initially
  for (const [host] of hostMap) {
    statuses[host] = { host, status: "checking", checkedAt: Date.now() };
  }
  onUpdate?.(statuses);

  // Probe in parallel (max 6 concurrent)
  const entries = Array.from(hostMap.entries());
  const batchSize = 6;
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(([, url]) => checkServerHealth(url))
    );
    for (let j = 0; j < batch.length; j++) {
      const [host] = batch[j];
      const result = results[j];
      if (result.status === "fulfilled") {
        statuses[host] = result.value;
      } else {
        statuses[host] = { host, status: "offline", checkedAt: Date.now() };
      }
    }
    onUpdate?.({ ...statuses });
  }

  return statuses;
}

/**
 * Given a primary URL and fallback URLs, return the first working one.
 */
export async function resolveWithFallback(
  primaryUrl: string,
  fallbacks: string[] = []
): Promise<{ url: string; isOriginal: boolean }> {
  // Check primary first
  const primaryOk = await probeEndpoint(primaryUrl, 6000);
  if (primaryOk) return { url: primaryUrl, isOriginal: true };

  // Try fallbacks
  for (const fb of fallbacks) {
    const ok = await probeEndpoint(fb, 6000);
    if (ok) return { url: fb, isOriginal: false };
  }

  // Return primary anyway (let it fail silently)
  return { url: primaryUrl, isOriginal: true };
}

/**
 * Get the status for a specific layer's server.
 */
export function getServerStatusForUrl(
  url: string | undefined,
  statuses: Record<string, ServerHealth>
): ServerStatus {
  if (!url) return "unknown";
  const host = extractHost(url);
  return statuses[host]?.status ?? "unknown";
}

/**
 * Clear the health cache (for manual refresh).
 */
export function clearHealthCache() {
  healthCache.clear();
}
