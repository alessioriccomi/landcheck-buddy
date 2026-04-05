/**
 * Maps vincolo IDs (from analisiVincoli.ts) to layer endpoint definitions
 * for real spatial queries via ArcGIS REST / WFS GetFeature.
 *
 * Each entry specifies which GIS endpoint to query to determine if a
 * specific constraint is present at a given parcel location.
 */

export interface VincoloEndpoint {
  /** Vincolo ID from analisiVincoli (e.g. "bc_01", "pa_01") */
  vincoloId: string;
  /** ArcGIS REST query endpoint (preferred) */
  arcgisUrl?: string;
  /** ArcGIS layer IDs to query (comma separated) */
  arcgisLayerIds?: string;
  /** WFS endpoint for GetFeature queries */
  wfsUrl?: string;
  /** WFS TypeName */
  wfsLayer?: string;
  /** SRID for the endpoint */
  srid?: string;
  /** If true, this endpoint is known to be offline */
  offline?: boolean;
}

// Primary mapping: vincolo ID → GIS endpoint for spatial analysis
// Uses ArcGIS REST query where available (more reliable than WFS PCN which is offline)
export const VINCOLI_ENDPOINT_MAP: VincoloEndpoint[] = [
  // ── Beni Culturali ─────────────────────────────────────────
  { vincoloId: "bc_01", wfsUrl: "https://sitap.cultura.gov.it/geoserver/sitap_ws/wfs", wfsLayer: "sitap_ws:wms_sitap_v1497_pol_136", srid: "4326" },
  { vincoloId: "bc_02", wfsUrl: "https://sitap.cultura.gov.it/geoserver/sitap_ws/wfs", wfsLayer: "sitap_ws:tab_vir_geo_aree_archeol_vincolate", srid: "4326" },
  { vincoloId: "bc_05", arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/UNESCO/MapServer", arcgisLayerIds: "0", srid: "32632" },

  // ── Paesaggistici Art. 142 ──────────────────────────────────
  { vincoloId: "pa_01", arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/Vincoli_Paesaggistici_Art142/MapServer", arcgisLayerIds: "0,1,2,3,4,5,6,7,8,9,10", srid: "32632" },
  { vincoloId: "pa_02", wfsUrl: "https://sitap.cultura.gov.it/geoserver/sitap_ws/wfs", wfsLayer: "sitap_ws:wms_sitap_v1497_pol_136", srid: "4326" },
  { vincoloId: "pa_04", arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/Vincoli_Paesaggistici_Art142/MapServer", arcgisLayerIds: "2", srid: "32632" },
  { vincoloId: "pa_05", arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/Vincoli_Paesaggistici_Art142/MapServer", arcgisLayerIds: "6", srid: "32632" },

  // ── Idrogeologici ──────────────────────────────────────────
  { vincoloId: "id_01", arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/PAI_pericolosita_idrogeologica/MapServer", arcgisLayerIds: "2", srid: "32632" },
  { vincoloId: "id_02", arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/PAI_pericolosita_idrogeologica/MapServer", arcgisLayerIds: "1", srid: "32632" },
  { vincoloId: "id_02b", arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/PAI_pericolosita_idrogeologica/MapServer", arcgisLayerIds: "1", srid: "32632" },
  { vincoloId: "id_03", arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/PAI_pericolosita_idrogeologica/MapServer", arcgisLayerIds: "0", srid: "32632" },
  { vincoloId: "id_03b", arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/PAI_pericolosita_idrogeologica/MapServer", arcgisLayerIds: "0", srid: "32632" },

  // ── Ambientali ──────────────────────────────────────────────
  { vincoloId: "amb_01", arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/SIC_ZSC_ZPS/MapServer", arcgisLayerIds: "0", srid: "3003" },
  { vincoloId: "amb_02", arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/SIC_ZSC_ZPS/MapServer", arcgisLayerIds: "1", srid: "3003" },
  { vincoloId: "amb_03", arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/EUAP/MapServer", arcgisLayerIds: "0", srid: "32632" },
  { vincoloId: "amb_04", arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/aree_ramsar/MapServer", arcgisLayerIds: "0", srid: "32632" },

  // ── Rischio Idrico ─────────────────────────────────────────
  { vincoloId: "ri_01", arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/Alluvioni_Classi_di_Rischio/MapServer", arcgisLayerIds: "0", srid: "32632" },
  { vincoloId: "ri_02", arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/PAI_rischio_idrogeologico/MapServer", arcgisLayerIds: "0,1", srid: "32632" },

  // ── Frane ──────────────────────────────────────────────────
  { vincoloId: "id_02", arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/Catalogo_Frane_Frane_poligonali/MapServer", arcgisLayerIds: "0", srid: "32632" },

  // ── Infrastrutture ─────────────────────────────────────────
  { vincoloId: "sr_01", arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/elettrodotti/MapServer", arcgisLayerIds: "0", srid: "32632" },
  { vincoloId: "sr_02", offline: true }, // SNAM: no public endpoint
  { vincoloId: "sr_04", arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/strade/MapServer", arcgisLayerIds: "0", srid: "32632" },
  { vincoloId: "sr_05", arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/ferrovie/MapServer", arcgisLayerIds: "0", srid: "32632" },

  // ── Militari ───────────────────────────────────────────────
  { vincoloId: "mil_01", arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/aree_militari/MapServer", arcgisLayerIds: "0", srid: "32632" },
  { vincoloId: "mil_02", arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/aeroporti/MapServer", arcgisLayerIds: "0", srid: "32632" },

  // ── Forestali ──────────────────────────────────────────────
  { vincoloId: "for_01", arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/Vincoli_Paesaggistici_Art142/MapServer", arcgisLayerIds: "6", srid: "32632" },

  // ── Agricoli ───────────────────────────────────────────────
  { vincoloId: "ag_03", arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/DOC_DOCG/MapServer", arcgisLayerIds: "0", srid: "32632" },
  { vincoloId: "ag_04", arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/DOP_IGP/MapServer", arcgisLayerIds: "0", srid: "32632" },

  // ── Faglie / Sismici ───────────────────────────────────────
  { vincoloId: "sis_fac", arcgisUrl: "https://sgi2.isprambiente.it/arcgis/rest/services/servizi/ithaca_new/MapServer", arcgisLayerIds: "0,1", srid: "3857" },

  // ── Aree Idonee ────────────────────────────────────────────
  { vincoloId: "ai_01", arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/Aree_idonee_FER/MapServer", arcgisLayerIds: "0", srid: "4326" },
  { vincoloId: "ai_02", arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/siti_contaminati/MapServer", arcgisLayerIds: "0", srid: "32632" },
];

/**
 * Build the spatial query URL for a given endpoint and bounding box (WGS84).
 * Returns either an ArcGIS REST query URL or a WFS GetFeature URL.
 */
export function buildSpatialQueryUrl(
  endpoint: VincoloEndpoint,
  bbox: { south: number; west: number; north: number; east: number }
): { url: string; type: "arcgis" | "wfs" } | null {
  if (endpoint.offline) return null;

  if (endpoint.arcgisUrl && endpoint.arcgisLayerIds) {
    // ArcGIS REST MapServer query: use identify or query on specific layer
    const layerIds = endpoint.arcgisLayerIds.split(",");
    const layerId = layerIds[0].trim();
    const queryUrl = `${endpoint.arcgisUrl}/${layerId}/query?` +
      `geometry=${bbox.west},${bbox.south},${bbox.east},${bbox.north}` +
      `&geometryType=esriGeometryEnvelope` +
      `&spatialRel=esriSpatialRelIntersects` +
      `&inSR=4326` +
      `&returnCountOnly=true` +
      `&f=json`;
    return { url: queryUrl, type: "arcgis" };
  }

  if (endpoint.wfsUrl && endpoint.wfsLayer) {
    const queryUrl = `${endpoint.wfsUrl}?` +
      `SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature` +
      `&TYPENAMES=${endpoint.wfsLayer}` +
      `&SRSNAME=EPSG:4326` +
      `&BBOX=${bbox.west},${bbox.south},${bbox.east},${bbox.north},EPSG:4326` +
      `&COUNT=1` +
      `&resultType=hits`;
    return { url: queryUrl, type: "wfs" };
  }

  return null;
}
