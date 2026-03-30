// ══════════════════════════════════════════════════════════════
// WMS / ArcGIS Health Probe — checks endpoint availability
// and provides fallback URL resolution
// ══════════════════════════════════════════════════════════════

import { getEndpointHost, getEndpointKey, getKnownEndpointIssue } from "@/lib/wmsEndpointIssues";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export type ServerStatus = "unknown" | "checking" | "online" | "offline" | "tls_error";

export interface ServerHealth {
  host: string;
  status: ServerStatus;
  checkedAt: number;
  latencyMs?: number;
  errorDetail?: string;
}

// Cache: endpoint → health (avoids repeated probes within 5 min)
const healthCache = new Map<string, ServerHealth>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Probe a single endpoint via proxy to avoid CORS.
 * Uses a lightweight HEAD-like request through the wfs-proxy.
 */
async function probeEndpoint(url: string, timeoutMs = 8000, skipTls = false): Promise<{ ok: boolean; tlsError?: boolean; detail?: string }> {
  const proxyBase = `${SUPABASE_URL}/functions/v1/wfs-proxy`;
  let testUrl: string;
  if (url.includes("/MapServer")) {
    testUrl = `${url}?f=json`;
  } else {
    const sep = url.includes("?") ? "&" : "?";
    testUrl = `${url}${sep}SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities`;
  }
  const skipParam = skipTls ? "&skipTls=true" : "";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(
      `${proxyBase}?mode=wms_ext&url=${encodeURIComponent(testUrl)}${skipParam}`,
      {
        headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        signal: controller.signal,
      }
    );
    clearTimeout(timer);
    if (!resp.ok) {
      try {
        const json = await resp.json();
        return {
          ok: false,
          tlsError: json.error === "TLS_INVALID_CERT",
          detail: json.userMessage || json.detail || json.error,
        };
      } catch { /* not json */ }
      return { ok: false };
    }
    const text = await resp.text();
    if (text.length < 50) return { ok: false };
    const lower = text.substring(0, 2000).toLowerCase();
    if (lower.includes("503 service") || lower.includes("service temporarily unavailable")) return { ok: false };
    if (lower.includes("<!doctype html") || lower.includes("<html")) {
      if (!lower.includes("<wms_capabilities") && !lower.includes("<wmt_ms_capabilities") && !lower.includes('"mapname"')) {
        return { ok: false };
      }
    }
    if (text.startsWith("{")) {
      try {
        const json = JSON.parse(text);
        if (json.error) return { ok: false };
      } catch { /* not JSON */ }
    }
    return { ok: true };
  } catch {
    clearTimeout(timer);
    return { ok: false };
  }
}

/**
 * Check health of a server (by host), with caching.
 */
export async function checkServerHealth(baseUrl: string): Promise<ServerHealth> {
  const key = getEndpointKey(baseUrl);
  const host = getEndpointHost(baseUrl);
  const knownIssue = getKnownEndpointIssue(baseUrl);
  if (knownIssue) {
    const health: ServerHealth = {
      host,
      status: knownIssue.status,
      checkedAt: Date.now(),
      errorDetail: knownIssue.message,
    };
    healthCache.set(key, health);
    return health;
  }

  const cached = healthCache.get(key);
  if (cached && Date.now() - cached.checkedAt < CACHE_TTL) {
    return cached;
  }

  const start = Date.now();
  const result = await probeEndpoint(baseUrl);
  const health: ServerHealth = {
    host,
    status: result.ok ? "online" : result.tlsError ? "tls_error" : "offline",
    checkedAt: Date.now(),
    latencyMs: Date.now() - start,
    errorDetail: result.detail,
  };
  healthCache.set(key, health);
  return health;
}

/**
 * Probe all unique endpoints from a list of URLs.
 * Returns a map of endpointKey → ServerHealth.
 */
export async function probeAllServers(
  urls: string[],
  onUpdate?: (statuses: Record<string, ServerHealth>) => void
): Promise<Record<string, ServerHealth>> {
  const endpointMap = new Map<string, string>();
  for (const url of urls) {
    const endpointKey = getEndpointKey(url);
    if (!endpointMap.has(endpointKey)) endpointMap.set(endpointKey, url);
  }

  const statuses: Record<string, ServerHealth> = {};

  // Set all to "checking" initially
  for (const [endpointKey, url] of endpointMap) {
    statuses[endpointKey] = { host: getEndpointHost(url), status: "checking", checkedAt: Date.now() };
  }
  onUpdate?.(statuses);

  // Probe in parallel (max 6 concurrent)
  const entries = Array.from(endpointMap.entries());
  const batchSize = 6;
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(([, url]) => checkServerHealth(url))
    );
    for (let j = 0; j < batch.length; j++) {
      const [endpointKey, url] = batch[j];
      const result = results[j];
      if (result.status === "fulfilled") {
        statuses[endpointKey] = result.value;
      } else {
        statuses[endpointKey] = { host: getEndpointHost(url), status: "offline", checkedAt: Date.now() };
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
  if (!getKnownEndpointIssue(primaryUrl)) {
    const primaryResult = await probeEndpoint(primaryUrl, 6000);
    if (primaryResult.ok) return { url: primaryUrl, isOriginal: true };
  }

  // Try fallbacks
  for (const fb of fallbacks) {
    if (getKnownEndpointIssue(fb)) continue;
    const fbResult = await probeEndpoint(fb, 6000);
    if (fbResult.ok) return { url: fb, isOriginal: false };
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
  return statuses[getEndpointKey(url)]?.status ?? "unknown";
}

/**
 * Clear the health cache (for manual refresh).
 */
export function clearHealthCache() {
  healthCache.clear();
}
