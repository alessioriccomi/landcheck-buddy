/**
 * Real spatial analysis engine: queries WFS/ArcGIS endpoints
 * to determine which vincoli intersect the parcel bounding box.
 */

import { VINCOLI_ENDPOINT_MAP, buildSpatialQueryUrl, type VincoloEndpoint } from "./vincoliLayerMapping";
import { VincoloPresenza } from "@/types/vincoli";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export interface SpatialQueryResult {
  vincoloId: string;
  presenza: VincoloPresenza;
  featureCount?: number;
  error?: string;
}

/**
 * Query a single endpoint via the wfs-proxy to determine if features exist
 * at the given bounding box.
 */
async function querySingleEndpoint(
  endpoint: VincoloEndpoint,
  bbox: { south: number; west: number; north: number; east: number },
  signal?: AbortSignal,
): Promise<SpatialQueryResult> {
  if (endpoint.offline) {
    return { vincoloId: endpoint.vincoloId, presenza: "non_rilevabile", error: "Endpoint offline" };
  }

  const queryInfo = buildSpatialQueryUrl(endpoint, bbox);
  if (!queryInfo) {
    return { vincoloId: endpoint.vincoloId, presenza: "non_rilevabile", error: "No endpoint configured" };
  }

  try {
    const proxyUrl = `${SUPABASE_URL}/functions/v1/wfs-proxy?mode=wms_ext&url=${encodeURIComponent(queryInfo.url)}`;
    const resp = await fetch(proxyUrl, {
      headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      signal: signal ?? AbortSignal.timeout(12000),
    });

    if (!resp.ok) {
      return { vincoloId: endpoint.vincoloId, presenza: "non_rilevabile", error: `HTTP ${resp.status}` };
    }

    const text = await resp.text();

    if (queryInfo.type === "arcgis") {
      try {
        const json = JSON.parse(text);
        const count = json.count ?? json.features?.length ?? 0;
        if (json.error) {
          return { vincoloId: endpoint.vincoloId, presenza: "non_rilevabile", error: json.error.message };
        }
        return {
          vincoloId: endpoint.vincoloId,
          presenza: count > 0 ? "presente" : "assente",
          featureCount: count,
        };
      } catch {
        return { vincoloId: endpoint.vincoloId, presenza: "non_rilevabile", error: "Invalid JSON response" };
      }
    }

    // WFS response: look for numberMatched or count features in XML
    if (queryInfo.type === "wfs") {
      const matchedMatch = text.match(/numberMatched="(\d+)"/);
      if (matchedMatch) {
        const count = parseInt(matchedMatch[1], 10);
        return {
          vincoloId: endpoint.vincoloId,
          presenza: count > 0 ? "presente" : "assente",
          featureCount: count,
        };
      }
      // If no numberMatched, check if there are any features at all
      const hasFeatures = text.includes("<gml:") || text.includes("<wfs:member");
      return {
        vincoloId: endpoint.vincoloId,
        presenza: hasFeatures ? "presente" : "assente",
      };
    }

    return { vincoloId: endpoint.vincoloId, presenza: "non_rilevabile" };
  } catch (err: any) {
    const msg = err?.name === "TimeoutError" ? "Timeout" : String(err);
    return { vincoloId: endpoint.vincoloId, presenza: "non_rilevabile", error: msg };
  }
}

/**
 * Run spatial queries for all vincoli that have mapped endpoints.
 * Queries are batched in parallel (max 6 concurrent).
 */
export async function runSpatialQueries(
  bbox: { south: number; west: number; north: number; east: number },
  vincoloIds?: string[],
): Promise<Map<string, SpatialQueryResult>> {
  const endpoints = vincoloIds
    ? VINCOLI_ENDPOINT_MAP.filter(e => vincoloIds.includes(e.vincoloId))
    : VINCOLI_ENDPOINT_MAP;

  const results = new Map<string, SpatialQueryResult>();
  const BATCH_SIZE = 6;

  for (let i = 0; i < endpoints.length; i += BATCH_SIZE) {
    const batch = endpoints.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map(ep => querySingleEndpoint(ep, bbox))
    );

    for (const r of batchResults) {
      if (r.status === "fulfilled") {
        results.set(r.value.vincoloId, r.value);
      }
    }
  }

  return results;
}

/**
 * Determine the VincoloPresenza for a vincolo ID based on spatial query results.
 * Falls back to the original random/simulated value if no endpoint is mapped.
 */
export function getPresenzaFromSpatial(
  vincoloId: string,
  spatialResults: Map<string, SpatialQueryResult>,
  fallbackPresenza: VincoloPresenza,
): VincoloPresenza {
  const result = spatialResults.get(vincoloId);
  if (!result) return fallbackPresenza;
  return result.presenza;
}
