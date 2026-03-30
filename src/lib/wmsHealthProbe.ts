// ══════════════════════════════════════════════════════════════
// WMS / ArcGIS Health Probe — checks endpoint availability
// and provides fallback URL resolution
// ══════════════════════════════════════════════════════════════

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const OVERRIDES_KEY = "lc_layer_url_overrides";
const TLS_BYPASS_KEY = "lc_tls_bypass";

export type ServerStatus = "unknown" | "checking" | "online" | "offline" | "tls_error" | "forbidden";

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

export function getEndpointKey(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    return url.split("?")[0].replace(/\/+$/, "");
  }
}

export function getEndpointHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/**
 * Get the resolved URL for a layer, applying user overrides from localStorage.
 */
export function getLayerUrl(layer: {
  id: string;
  wmsUrl?: string;
  wmsLayer?: string;
  arcgisUrl?: string;
  arcgisLayers?: string;
  tlsBypass?: boolean;
  fallbackUrls?: string[];
}): {
  wmsUrl?: string;
  wmsLayer?: string;
  arcgisUrl?: string;
  arcgisLayers?: string;
  tlsBypass: boolean;
  fallbackUrls: string[];
} {
  let overrides: Record<string, any> = {};
  try { overrides = JSON.parse(localStorage.getItem(OVERRIDES_KEY) || "{}"); } catch {}
  let tlsBypassMap: Record<string, boolean> = {};
  try { tlsBypassMap = JSON.parse(localStorage.getItem(TLS_BYPASS_KEY) || "{}"); } catch {}

  const ov = overrides[layer.id] || {};
  return {
    wmsUrl: ov.wmsUrl ?? layer.wmsUrl,
    wmsLayer: ov.wmsLayer ?? layer.wmsLayer,
    arcgisUrl: ov.arcgisUrl ?? layer.arcgisUrl,
    arcgisLayers: ov.arcgisLayers ?? layer.arcgisLayers,
    tlsBypass: tlsBypassMap[layer.id] ?? layer.tlsBypass ?? false,
    fallbackUrls: ov.fallbackUrls ?? layer.fallbackUrls ?? [],
  };
}

/**
 * Probe a single endpoint via proxy to avoid CORS.
 */
async function probeEndpoint(url: string, timeoutMs = 8000, skipTls = false): Promise<{
  ok: boolean;
  tlsError?: boolean;
  forbidden?: boolean;
  detail?: string;
  latencyMs?: number;
}> {
  const proxyBase = `${SUPABASE_URL}/functions/v1/wfs-proxy`;
  let testUrl: string;
  if (url.includes("/MapServer")) {
    testUrl = `${url}${url.includes("?") ? "&" : "?"}f=json`;
  } else {
    const sep = url.includes("?") ? "&" : "?";
    testUrl = `${url}${sep}SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities`;
  }
  const skipParam = skipTls ? "&skipTls=true" : "";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();

  try {
    const resp = await fetch(
      `${proxyBase}?mode=wms_ext&url=${encodeURIComponent(testUrl)}${skipParam}`,
      {
        headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        signal: controller.signal,
      }
    );
    clearTimeout(timer);
    const latencyMs = Date.now() - start;

    if (resp.status === 403) {
      try {
        const json = await resp.json();
        return { ok: false, forbidden: true, detail: json.error || "Domain not allowed", latencyMs };
      } catch {}
      return { ok: false, forbidden: true, detail: "Domain not allowed", latencyMs };
    }

    if (!resp.ok) {
      try {
        const json = await resp.json();
        return {
          ok: false,
          tlsError: json.error === "TLS_INVALID_CERT",
          detail: json.userMessage || json.detail || json.error,
          latencyMs,
        };
      } catch {}
      return { ok: false, latencyMs };
    }

    const text = await resp.text();
    if (text.length < 50) return { ok: false, detail: "Response too short", latencyMs };

    const lower = text.substring(0, 2000).toLowerCase();
    if (lower.includes("503 service") || lower.includes("service temporarily unavailable"))
      return { ok: false, detail: "Service Unavailable (503)", latencyMs };

    // Check if it's HTML (not GIS data)
    if (lower.includes("<!doctype html") || lower.includes("<html")) {
      if (!lower.includes("<wms_capabilities") && !lower.includes("<wmt_ms_capabilities") && !lower.includes('"mapname"')) {
        return { ok: false, detail: "HTML response instead of GIS data", latencyMs };
      }
    }

    // ArcGIS JSON error check
    if (text.startsWith("{")) {
      try {
        const json = JSON.parse(text);
        if (json.error) return { ok: false, detail: `ArcGIS error: ${json.error.message || JSON.stringify(json.error)}`, latencyMs };
      } catch {}
    }

    return { ok: true, latencyMs };
  } catch (e) {
    clearTimeout(timer);
    const latencyMs = Date.now() - start;
    return { ok: false, detail: e instanceof Error ? e.message : "Connection failed", latencyMs };
  }
}

/**
 * Check health of a server, with caching.
 */
export async function checkServerHealth(baseUrl: string, forceRefresh = false, skipTls = false): Promise<ServerHealth> {
  const key = getEndpointKey(baseUrl);
  const host = getEndpointHost(baseUrl);

  if (!forceRefresh) {
    const cached = healthCache.get(key);
    if (cached && Date.now() - cached.checkedAt < CACHE_TTL) {
      return cached;
    }
  }

  const result = await probeEndpoint(baseUrl, 8000, skipTls);
  const health: ServerHealth = {
    host,
    status: result.ok ? "online" : result.tlsError ? "tls_error" : result.forbidden ? "forbidden" : "offline",
    checkedAt: Date.now(),
    latencyMs: result.latencyMs,
    errorDetail: result.detail,
  };
  healthCache.set(key, health);
  return health;
}

/**
 * Probe all unique endpoints from a list of URLs.
 */
export async function probeAllServers(
  urls: string[],
  onUpdate?: (statuses: Record<string, ServerHealth>) => void,
  forceRefresh = false,
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

  // Probe in parallel (max 4 concurrent)
  const entries = Array.from(endpointMap.entries());
  const batchSize = 4;
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(([, url]) => checkServerHealth(url, forceRefresh))
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
  fallbacks: string[] = [],
  skipTls = false,
): Promise<{ url: string; isOriginal: boolean }> {
  const primaryResult = await probeEndpoint(primaryUrl, 6000, skipTls);
  if (primaryResult.ok) return { url: primaryUrl, isOriginal: true };

  for (const fb of fallbacks) {
    const fbResult = await probeEndpoint(fb, 6000, skipTls);
    if (fbResult.ok) return { url: fb, isOriginal: false };
  }

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

/**
 * Auto-discovery: test common URL patterns for a given host.
 */
export async function discoverAlternativeUrls(
  baseHost: string,
  onResult?: (url: string, status: ServerStatus) => void,
): Promise<{ url: string; status: ServerStatus; latencyMs?: number }[]> {
  const patterns = [
    `/arcgis/rest/services`,
    `/geoserver/wms`,
    `/geoserver/ows`,
    `/wms`,
    `/ows`,
    `/arcgis/services`,
  ];

  // PCN-specific alternatives
  const pcnAlternatives = [
    "https://wms.pcn.minambiente.it/ogc",
    "https://www.pcn.minambiente.it/arcgis/rest/services",
  ];

  const urlsToTest: string[] = [];

  if (baseHost.includes("pcn.minambiente.it")) {
    urlsToTest.push(...pcnAlternatives);
  }

  for (const pattern of patterns) {
    urlsToTest.push(`https://${baseHost}${pattern}`);
  }

  const results: { url: string; status: ServerStatus; latencyMs?: number }[] = [];

  // Test in batches of 3
  for (let i = 0; i < urlsToTest.length; i += 3) {
    const batch = urlsToTest.slice(i, i + 3);
    const probeResults = await Promise.allSettled(
      batch.map(url => probeEndpoint(url, 6000))
    );
    for (let j = 0; j < batch.length; j++) {
      const url = batch[j];
      const r = probeResults[j];
      const status: ServerStatus = r.status === "fulfilled" && r.value.ok ? "online" : "offline";
      results.push({ url, status, latencyMs: r.status === "fulfilled" ? r.value.latencyMs : undefined });
      onResult?.(url, status);
    }
  }

  return results;
}
