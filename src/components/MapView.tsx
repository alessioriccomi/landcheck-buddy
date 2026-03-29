import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Particella, PARCEL_COLORS } from "@/types/vincoli";
import { Satellite, Map, Loader2, MousePointer } from "lucide-react";
import { cn } from "@/lib/utils";
import area from "@turf/area";
import turfUnion from "@turf/union";
import { ALL_LAYERS } from "@/lib/layerDefinitions";
import { getMergedLayers } from "@/lib/settingsLayers";
import { toast } from "@/hooks/use-toast";
import { getServerStatusForUrl, type ServerHealth } from "@/lib/wmsHealthProbe";

// Fix Leaflet icon paths for Vite
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl, shadowUrl: iconShadow });

// ── Supabase project config ────────────────────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

// Geocode a municipality via the wfs-proxy edge function (mode=geocode)
// Returns lat, lng and full commune bounding box from Nominatim (server-side)
async function geocodeComuneWithBbox(comune: string): Promise<{
  lat: number;
  lng: number;
  bbox: [number, number, number, number]; // [south, north, west, east]
}> {
  try {
    const params = new URLSearchParams({ mode: "geocode", comune });
    const url = `${SUPABASE_URL}/functions/v1/wfs-proxy?${params.toString()}`;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data.lat && data.lng && data.bbox) {
        console.log(`Geocoded "${comune}" →`, data.lat, data.lng, "bbox:", data.bbox);
        return { lat: data.lat, lng: data.lng, bbox: data.bbox };
      }
    }
  } catch (e) {
    console.warn("Geocode via proxy failed:", e);
  }
  // Fallback: center of Italy with a ~50km bbox
  console.warn(`Could not geocode "${comune}", using Italy center`);
  return { lat: 42.8333, lng: 12.8333, bbox: [42.33, 43.33, 12.33, 13.33] };
}

// ──────────────────────────────────────────────────────────────
// Dizionario coordinate capoluoghi e comuni italiani principali
// ── Reverse-geocode via Nominatim (get comune from lat/lng) ──
async function reverseGeocodeComune(lat: number, lng: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=12&addressdetails=1&accept-language=it`;
    const resp = await fetch(url, {
      headers: { "User-Agent": "VincoliApp/1.0" },
    });
    if (!resp.ok) throw new Error(`Nominatim ${resp.status}`);
    const data = await resp.json();
    const addr = data.address ?? {};
    // Nominatim returns city, town, village, or municipality
    const comune = addr.city || addr.town || addr.village || addr.municipality || addr.county || "";
    if (comune) return comune;
    throw new Error("No comune found");
  } catch (err) {
    console.warn("Reverse geocode failed:", err);
    return "Sconosciuto";
  }
}





// Generate a placeholder polygon near the given center
function makePlaceholderPolygon(
  center: [number, number],
  idx: number,
  size = 0.002
): [number, number][] {
  const [lat, lng] = center;
  const offset = idx * 0.005;
  const clat = lat + offset * 0.5;
  const clng = lng + offset * 0.7;
  return [
    [clat - size, clng - size],
    [clat + size, clng - size],
    [clat + size, clng + size],
    [clat - size, clng + size],
  ];
}

// Fetch real parcel geometry via mode=parcel (Parquet lookup → tiny WFS bbox)
// This is the correct approach: finds exact coordinates from onData pre-computed DB
async function searchParcelByAttribute(
  comune: string,
  foglio: string,
  particella: string,
  bbox?: [number, number, number, number],
): Promise<GeoJSON.Feature[]> {
  const params = new URLSearchParams({ mode: "parcel", comune, foglio, particella });
  if (bbox) {
    params.set("bbox", bbox.join(","));
  }
  const url = `${SUPABASE_URL}/functions/v1/wfs-proxy?${params.toString()}`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!resp.ok) {
    const errData = await resp.json().catch(() => ({}));
    throw new Error(errData.error ?? `WFS proxy error: ${resp.status}`);
  }
  const geojson: GeoJSON.FeatureCollection = await resp.json();
  return geojson.features ?? [];
}

// WFS INTERSECTS point query: returns ONLY the parcel containing the click point
async function fetchParcelAtPoint(lat: number, lng: number): Promise<GeoJSON.Feature[]> {
  const params = new URLSearchParams({ mode: "wfs_point", lat: String(lat), lng: String(lng) });
  const url = `${SUPABASE_URL}/functions/v1/wfs-proxy?${params.toString()}`;
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` } });
  if (!resp.ok) throw new Error(`WFS point error: ${resp.status}`);
  const geojson: GeoJSON.FeatureCollection = await resp.json();
  return geojson.features ?? [];
}

// GetFeatureInfo: returns {localId, label, nationalRef} for the exact pixel clicked
async function getFeatureInfoAtPoint(lat: number, lng: number, zoom: number): Promise<{
  localId: string;
  label: string;
  nationalRef: string;
} | null> {
  const params = new URLSearchParams({
    mode: "getfeatureinfo",
    lat: String(lat),
    lng: String(lng),
    zoom: String(zoom),
  });
  const url = `${SUPABASE_URL}/functions/v1/wfs-proxy?${params.toString()}`;
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` } });
  if (resp.status === 404) return null;
  if (!resp.ok) throw new Error(`GetFeatureInfo error: ${resp.status}`);
  const data = await resp.json();
  if (data.error) return null;
  return data as { localId: string; label: string; nationalRef: string };
}

// WFS by RESOURCEID: fetches exact geometry of a single parcel
async function fetchParcelGeometryById(resourceId: string): Promise<GeoJSON.Feature[]> {
  const params = new URLSearchParams({ mode: "wfs_by_id", resourceId });
  const url = `${SUPABASE_URL}/functions/v1/wfs-proxy?${params.toString()}`;
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` } });
  if (!resp.ok) throw new Error(`WFS by ID error: ${resp.status}`);
  const geojson: GeoJSON.FeatureCollection = await resp.json();
  return geojson.features ?? [];
}

// Fallback: bbox WFS query (used only for parcel lookup by attribute, not for click)
async function fetchParcelGeometryByPoint(
  lat: number,
  lng: number,
  radius = 0.001
): Promise<GeoJSON.Feature[]> {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    radius: String(radius),
  });
  const url = `${SUPABASE_URL}/functions/v1/wfs-proxy?${params.toString()}`;
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` } });
  if (!resp.ok) throw new Error(`WFS proxy error: ${resp.status}`);
  const geojson: GeoJSON.FeatureCollection = await resp.json();
  return geojson.features ?? [];
}

// Calculate area in m² from GeoJSON polygon features
function calcAreaMq(features: GeoJSON.Feature[]): number {
  let totalMq = 0;
  for (const feat of features) {
    if (!feat.geometry || feat.geometry.type !== "Polygon") continue;
    totalMq += area(feat as GeoJSON.Feature<GeoJSON.Polygon>);
  }
  return Math.round(totalMq);
}

// Format area nicely
function formatArea(mq: number): string {
  if (mq >= 10000) return `${(mq / 10000).toFixed(2)} ha`;
  return `${mq.toLocaleString("it-IT")} m²`;
}

const CENTER: L.LatLngExpression = [41.897, 12.483];

// ── Basemap definitions ────────────────────────────────────────
type BasemapId = "osm" | "satellite";

interface BasemapDef {
  id: BasemapId;
  label: string;
  icon: "map" | "satellite";
}

const BASEMAPS: BasemapDef[] = [
  { id: "osm", label: "Mappa", icon: "map" },
  { id: "satellite", label: "Satellite", icon: "satellite" },
];

function makeBaselayer(id: BasemapId): L.TileLayer {
  switch (id) {
    case "osm":
      return L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      });
    case "satellite":
      return L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "Tiles &copy; Esri",
          maxZoom: 19,
        }
      );
  }
}

interface CustomConstraintLayer {
  id: string;
  name: string;
  url: string;
  color: string;
}

interface MapViewProps {
  particelle: Particella[];
  activeLayers: Record<string, boolean>;
  layerOpacity?: Record<string, number>;
  customConstraints?: CustomConstraintLayer[];
  onParcelGeometries?: (geoms: Record<string, L.LatLngExpression[][]>) => void;
  onParcelAreaUpdate?: (id: string, mq: number) => void;
  onAddParticella?: (p: Particella) => void;
  selectedParcelIds: string[];
  onToggleSelectParcel: (id: string) => void;
  onClearSelection: () => void;
  serverStatuses?: Record<string, ServerHealth>;
}

type ParcelStatus = "idle" | "loading" | "real" | "placeholder";

export function MapView({
  particelle,
  activeLayers,
  layerOpacity = {},
  customConstraints = [],
  onParcelGeometries,
  onParcelAreaUpdate,
  onAddParticella,
  selectedParcelIds,
  onToggleSelectParcel,
  onClearSelection,
  serverStatuses = {},
}: MapViewProps) {
  const showCatasto = activeLayers["catasto"] ?? true;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const wmsLayersRef = useRef<Record<string, L.TileLayer | L.GridLayer>>({});
  const customLayersRef = useRef<Record<string, L.TileLayer>>({});
  const parcelLayersRef = useRef<L.Layer[]>([]);
  const basemapRef = useRef<L.TileLayer | null>(null);
  // Catasto overlay refs (order: foglio → terreno → fabbricato → labels → graffe)
  const catastoFoglioRef = useRef<L.TileLayer | null>(null);      // CP.CadastralZoning (foglio, più chiaro)
  const catastoOverlayRef = useRef<L.TileLayer | null>(null);     // CP.CadastralParcel (terreno, arancione chiaro)
  const catastoFabbricatiRef = useRef<L.TileLayer | null>(null);  // CP.CadastralBuilding (arancione scuro)
  const catastoLabelsRef = useRef<L.TileLayer | null>(null);      // CP.CadastralParcel labels (numeri particella)
  const catastoGraffeRef = useRef<L.TileLayer | null>(null);      // CP.CadastralZoning graffe subalterni
  // Selected parcel highlights (multi-select)
  const selectedHighlightLayersRef = useRef<L.Layer[]>([]);
  const unionLayerRef = useRef<L.Layer | null>(null);
  const activeBaseRef = useRef<BasemapId>("osm");
  const [activeBase, setActiveBase] = useState<BasemapId>("osm");
  const [parcelStatuses, setParcelStatuses] = useState<Record<string, ParcelStatus>>({});
  // Local area map: parcelId → mq (avoids triggering re-render loop in parent)
  const [localAreas, setLocalAreas] = useState<Record<string, number>>({});
  // Store raw GeoJSON features per parcel for union computation
  const parcelFeaturesRef = useRef<Record<string, GeoJSON.Feature[]>>({});
  const [selectionArea, setSelectionArea] = useState<{ mq: number; count: number } | null>(null);
  const [clickLoading, setClickLoading] = useState(false);
  const [clickMode] = useState(false); // kept for compatibility, always false
  // Track parcel IDs already drawn/fetched to prevent redundant re-runs
  const drawnParcelIdsRef = useRef<string>("");

  // Keep refs for callbacks so map click handler always has fresh values
  const onAddParticellaRef = useRef(onAddParticella);
  onAddParticellaRef.current = onAddParticella;
  const particelleRef = useRef(particelle);
  particelleRef.current = particelle;

  // ── Initialize map once ─────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: CENTER,
      zoom: 13,
      zoomControl: false,
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Custom pane for parcel polygons — always on top
    map.createPane("parcelsPane");
    map.getPane("parcelsPane")!.style.zIndex = "650";

    // Custom pane for WMS overlays — below parcels
    map.createPane("wmsPane");
    map.getPane("wmsPane")!.style.zIndex = "300";

    // Custom pane for catasto — above WMS vincoli but below parcels
    map.createPane("catastoPane");
    map.getPane("catastoPane")!.style.zIndex = "400";

    // Initial basemap
    const base = makeBaselayer("osm");
    base.addTo(map);
    basemapRef.current = base;

    const wmsCommonOptions = {
      format: "image/png" as const,
      transparent: true,
      version: "1.3.0",
      pane: "wmsPane",
    };

    // ── Catasto WMS overlay via proxy ────────────────────────
    // Cinque layer separati con gerarchia visiva:
    //   1. CP.CadastralZoning (foglio)       → giallo/grigio, molto trasparente
    //   2. CP.CadastralParcel (terreno)      → arancione chiaro, semi-trasparente
    //   3. CP.CadastralBuilding (fabbricato) → arancione scuro, più opaco
    //   4. CP.CadastralParcel label layer    → numeri particella (alta risoluzione)
    //   5. CP.CadastralZoning graffe         → segni di collegamento terreno-fabbricato
    const proxyBase = `${SUPABASE_URL}/functions/v1/wfs-proxy`;

    const makeCatastoLayer = (wmsLayer: string, opacity: number, tileSize = 256, styles = "") => {
      const TileLayerClass = L.TileLayer.extend({
        getTileUrl(coords: L.Coords): string {
          const m = (this as unknown as { _map: L.Map })._map;
          if (!m) return "";
          const sz = tileSize;
          const tileBounds = m.unproject([coords.x * sz, coords.y * sz], coords.z);
          const tileBoundsNE = m.unproject([(coords.x + 1) * sz, (coords.y + 1) * sz], coords.z);
          const south = Math.min(tileBounds.lat, tileBoundsNE.lat);
          const north = Math.max(tileBounds.lat, tileBoundsNE.lat);
          const west = Math.min(tileBounds.lng, tileBoundsNE.lng);
          const east = Math.max(tileBounds.lng, tileBoundsNE.lng);
          const bbox = `${south},${west},${north},${east}`;
          const params = new URLSearchParams({
            mode: "wms",
            SERVICE: "WMS",
            VERSION: "1.3.0",
            REQUEST: "GetMap",
            LAYERS: wmsLayer,
            FORMAT: "image/png",
            TRANSPARENT: "true",
            CRS: "EPSG:6706",
            WIDTH: String(sz),
            HEIGHT: String(sz),
            BBOX: bbox,
            ...(styles ? { STYLES: styles } : {}),
          });
          return `${proxyBase}?${params.toString()}`;
        },
      });
      return new (TileLayerClass as unknown as new (url: string, opts: L.TileLayerOptions & { pane: string }) => L.TileLayer)(
        proxyBase,
        { opacity, attribution: "Agenzia delle Entrate", pane: "catastoPane", tileSize: tileSize, maxZoom: 19 } as L.TileLayerOptions & { pane: string }
      );
    };

    // Gerarchia visiva: foglio (più chiaro) → terreno → fabbricato (più scuro) → etichette → graffe
    // Nomi layer esatti dal GetCapabilities AdE WMS:
    const catastoFoglio    = makeCatastoLayer("CP.CadastralZoning", 0.35);       // Mappe (fogli)
    const catastoParcel    = makeCatastoLayer("CP.CadastralParcel", 0.65);       // Particelle (arancione chiaro)
    const catastoBuilding  = makeCatastoLayer("fabbricati",         0.90);       // Fabbricati (arancione scuro)
    const catastoLabels    = makeCatastoLayer("codice_plla",        1.0,  512);  // Numeri particella
    const catastoGraffe    = makeCatastoLayer("simbolo_graffa",     0.90, 512);  // Simbolo Graffa

    catastoFoglioRef.current     = catastoFoglio;
    catastoOverlayRef.current    = catastoParcel;
    catastoFabbricatiRef.current = catastoBuilding;
    catastoLabelsRef.current     = catastoLabels;
    catastoGraffeRef.current     = catastoGraffe;


    // ── Dynamic layers from ALL_LAYERS definitions ──
    // Uses L.TileLayer.extend + getTileUrl (same proven pattern as catasto layers)
    const makeProxiedWmsLayer = (wmsBaseUrl: string, wmsLayerName: string, opacity: number, skipTls = false): L.TileLayer => {
      const tlsParam = skipTls ? "&skipTls=true" : "";
      const TileLayerClass = L.TileLayer.extend({
        getTileUrl(coords: L.Coords): string {
          const m = (this as unknown as { _map: L.Map })._map;
          if (!m) return "";
          const sz = 256;
          const nw = m.unproject([coords.x * sz, coords.y * sz], coords.z);
          const se = m.unproject([(coords.x + 1) * sz, (coords.y + 1) * sz], coords.z);
          const south = Math.min(nw.lat, se.lat);
          const north = Math.max(nw.lat, se.lat);
          const west = Math.min(nw.lng, se.lng);
          const east = Math.max(nw.lng, se.lng);
          const sep = wmsBaseUrl.includes("?") ? "&" : "?";
          const targetUrl = `${wmsBaseUrl}${sep}SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=${encodeURIComponent(wmsLayerName)}&FORMAT=image/png&TRANSPARENT=true&CRS=EPSG:4326&WIDTH=${sz}&HEIGHT=${sz}&BBOX=${south},${west},${north},${east}`;
          return `${proxyBase}?mode=wms_ext&url=${encodeURIComponent(targetUrl)}${tlsParam}`;
        },
      });
      return new (TileLayerClass as unknown as new (url: string, opts: L.TileLayerOptions & { pane: string }) => L.TileLayer)(
        proxyBase,
        { opacity, pane: "wmsPane", tileSize: 256, maxZoom: 19, attribution: "Geoportale Nazionale/ISPRA/MASE" } as L.TileLayerOptions & { pane: string }
      );
    };

    // ArcGIS REST MapServer export — uses L.TileLayer.extend + getTileUrl
    const makeArcGISLayer = (arcgisUrl: string, arcgisLayers: string | undefined, opacity: number, skipTls = false): L.TileLayer => {
      const tlsParam = skipTls ? "&skipTls=true" : "";
      const TileLayerClass = L.TileLayer.extend({
        getTileUrl(coords: L.Coords): string {
          const m = (this as unknown as { _map: L.Map })._map;
          if (!m) return "";
          const sz = 256;
          const nw = m.unproject([coords.x * sz, coords.y * sz], coords.z);
          const se = m.unproject([(coords.x + 1) * sz, (coords.y + 1) * sz], coords.z);
          const south = Math.min(nw.lat, se.lat);
          const north = Math.max(nw.lat, se.lat);
          const west = Math.min(nw.lng, se.lng);
          const east = Math.max(nw.lng, se.lng);
          let targetUrl = `${arcgisUrl}/export?bbox=${west},${south},${east},${north}&bboxSR=4326&imageSR=4326&size=${sz},${sz}&format=png32&transparent=true&f=image`;
          if (arcgisLayers) targetUrl += `&layers=${encodeURIComponent(arcgisLayers)}`;
          return `${proxyBase}?mode=wms_ext&url=${encodeURIComponent(targetUrl)}${tlsParam}`;
        },
      });
      return new (TileLayerClass as unknown as new (url: string, opts: L.TileLayerOptions & { pane: string }) => L.TileLayer)(
        proxyBase,
        { opacity, pane: "wmsPane", tileSize: 256, maxZoom: 19, attribution: "Geoportale Nazionale (PCN)" } as L.TileLayerOptions & { pane: string }
      );
    };

    // Load user URL overrides from localStorage
    let urlOverrides: Record<string, { wmsUrl?: string; arcgisUrl?: string; wmsLayer?: string; arcgisLayers?: string }> = {};
    try { urlOverrides = JSON.parse(localStorage.getItem("lc_layer_url_overrides") || "{}"); } catch {}

    // Create all WMS layers (merged: built-in + custom from settings)
    const mergedLayers = getMergedLayers();
    for (const layerDef of mergedLayers) {
      try {
        const ov = urlOverrides[layerDef.id];
        const arcUrl = ov?.arcgisUrl || layerDef.arcgisUrl;
        const arcLayers = ov?.arcgisLayers || layerDef.arcgisLayers;
        const wUrl = ov?.wmsUrl || layerDef.wmsUrl;
        const wLayer = ov?.wmsLayer || layerDef.wmsLayer;

        if (arcUrl) {
          wmsLayersRef.current[layerDef.id] = makeArcGISLayer(arcUrl, arcLayers, layerDef.opacity ?? 0.5, layerDef.tlsBypass);
        } else if (wUrl && wLayer) {
          wmsLayersRef.current[layerDef.id] = makeProxiedWmsLayer(wUrl, wLayer, layerDef.opacity ?? 0.5, layerDef.tlsBypass);
        }
        console.log(`[LayerInit] Created layer: ${layerDef.id}${ov ? ' (override)' : ''}`);
      } catch (err) {
        console.warn(`Failed to create layer ${layerDef.id}:`, err);
      }
    }
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── Fallback URL resolution when server statuses arrive ──────
  // Re-creates layer tiles for offline servers that have fallback URLs
  const resolvedFallbacksRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const map = mapRef.current;
    if (!map || Object.keys(serverStatuses).length === 0) return;

    for (const layerDef of getMergedLayers()) {
      if (resolvedFallbacksRef.current.has(layerDef.id)) continue;
      if (!layerDef.fallbackUrls?.length) continue;

      const primaryUrl = layerDef.arcgisUrl || layerDef.wmsUrl;
      if (!primaryUrl) continue;

      const status = getServerStatusForUrl(primaryUrl, serverStatuses);
      if (status !== "offline") continue;

      // Try fallback URLs
      for (const fbUrl of layerDef.fallbackUrls) {
        const fbStatus = getServerStatusForUrl(fbUrl, serverStatuses);
        if (fbStatus === "offline") continue;

        // Found a viable fallback — recreate the layer
        console.log(`[Fallback] ${layerDef.id}: switching from ${primaryUrl} to ${fbUrl}`);
        const proxyBase = `${SUPABASE_URL}/functions/v1/wfs-proxy`;
        const oldLayer = wmsLayersRef.current[layerDef.id];
        const wasOnMap = oldLayer && map.hasLayer(oldLayer);

        // Create replacement layer with fallback URL
        const TileLayerClass = L.TileLayer.extend({
          getTileUrl(coords: L.Coords): string {
            const m = (this as unknown as { _map: L.Map })._map;
            if (!m) return "";
            const sz = 256;
            const nw = m.unproject([coords.x * sz, coords.y * sz], coords.z);
            const se = m.unproject([(coords.x + 1) * sz, (coords.y + 1) * sz], coords.z);
            const south = Math.min(nw.lat, se.lat), north = Math.max(nw.lat, se.lat);
            const west = Math.min(nw.lng, se.lng), east = Math.max(nw.lng, se.lng);
            let targetUrl = `${fbUrl}/export?bbox=${west},${south},${east},${north}&bboxSR=4326&imageSR=4326&size=${sz},${sz}&format=png32&transparent=true&f=image`;
            if (layerDef.arcgisLayers) targetUrl += `&layers=${encodeURIComponent(layerDef.arcgisLayers)}`;
            return `${proxyBase}?mode=wms_ext&url=${encodeURIComponent(targetUrl)}`;
          },
        });
        const newLayer = new (TileLayerClass as any)(
          "",
          { opacity: layerDef.opacity ?? 0.5, pane: "wmsPane", tileSize: 256, maxZoom: 19, attribution: "ISPRA (fallback)" }
        ) as L.TileLayer;

        if (wasOnMap) {
          map.removeLayer(oldLayer);
          newLayer.addTo(map);
        }
        wmsLayersRef.current[layerDef.id] = newLayer;
        resolvedFallbacksRef.current.add(layerDef.id);
        break;
      }
    }
  }, [serverStatuses]);

  // ── Map click handler (for adding parcels by clicking) ──────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!clickMode) {
      map.getContainer().style.cursor = "";
      return;
    }

    map.getContainer().style.cursor = "crosshair";

    const handleClick = async (e: L.LeafletMouseEvent) => {
      if (!onAddParticellaRef.current) return;
      const { lat, lng } = e.latlng;
      const zoom = map.getZoom();
      if (zoom < 15) return;
      setClickLoading(true);
      try {
        // Single call: bbox + server-side point-in-polygon → exactly 1 parcel
        const features = await fetchParcelAtPoint(lat, lng);
        if (features.length === 0) {
          setClickLoading(false);
          return;
        }

        const feat = features[0];
        const props = feat.properties ?? {};

        // Extract foglio/particella using decoded fields from proxy (priority)
        let foglio = "";
        let particella = "";
        if (props._foglio && props._particella) {
          foglio = props._foglio;
          particella = props._particella;
        } else {
          // Fallback: try decoding nationalRef client-side
          const nationalRef: string = props.nationalRef ?? "";
          if (nationalRef && nationalRef.includes(".")) {
            const dotIdx = nationalRef.indexOf(".");
            particella = nationalRef.substring(dotIdx + 1);
            const codePart = nationalRef.substring(0, dotIdx);
            if (codePart.length > 4) {
              const digits = codePart.substring(4).replace(/[^0-9]/g, "");
              const num = parseInt(digits, 10);
              if (!isNaN(num)) foglio = String(num);
            }
          }
          // Fallback: label "foglio/particella"
          if (!foglio) {
            const label: string = props.label ?? "";
            const labelParts = label.split("/");
            if (labelParts.length === 2) {
              foglio = labelParts[0].trim();
              particella = labelParts[1].trim();
            } else if (label && !particella) {
              particella = label;
            }
          }
        }

        // Reverse-geocode via Nominatim to find the correct comune
        let bestComune = "Sconosciuto";
        try {
          bestComune = await reverseGeocodeComune(lat, lng);
        } catch {
          console.warn("Reverse geocode fallback: Sconosciuto");
        }

        const mq = calcAreaMq([feat]);
        const currentLen = particelleRef.current.length;

        const clickCoords: [number, number][][] = feat.geometry?.type === "Polygon"
          ? (feat.geometry as GeoJSON.Polygon).coordinates.map(
              ring => ring.map(([lng2, lat2]) => [lat2, lng2] as [number, number])
            )
          : [];

        const newP: Particella = {
          id: crypto.randomUUID(),
          comune: bestComune,
          provincia: "",
          foglio: foglio || "—",
          particella: particella || "—",
          color: PARCEL_COLORS[currentLen % PARCEL_COLORS.length],
          superficieMq: mq > 0 ? mq : undefined,
          _clickGeometry: clickCoords.length > 0 ? clickCoords : undefined,
        } as Particella & { _clickGeometry?: [number, number][][] };
        onAddParticellaRef.current(newP);
      } catch (err) {
        console.warn("Click parcel error:", err);
      } finally {
        setClickLoading(false);
      }
    };

    map.on("click", handleClick);
    return () => {
      map.off("click", handleClick);
      map.getContainer().style.cursor = "";
    };
  }, [clickMode]);

  // ── Catasto parcel selection (click when NOT in add-mode) ────
  // Clicking on map in normal mode adds a new parcel to the list (same as card input)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (clickMode) return; // add-mode handles clicks differently

    const handleCatastoClick = async (e: L.LeafletMouseEvent) => {
      if (!onAddParticellaRef.current) return;
      const { lat, lng } = e.latlng;
      const zoom = map.getZoom();
      if (zoom < 15) return;

      setClickLoading(true);
      try {
        const features = await fetchParcelAtPoint(lat, lng);
        if (features.length === 0) { setClickLoading(false); return; }

        const feat = features[0];
        const props = feat.properties ?? {};

        let foglio = "—";
        let particella = "—";
        if (props._foglio && props._particella) {
          foglio = props._foglio;
          particella = props._particella;
        } else {
          const nationalRef: string = props.nationalRef ?? "";
          if (nationalRef && nationalRef.includes(".")) {
            const dotIdx = nationalRef.indexOf(".");
            particella = nationalRef.substring(dotIdx + 1);
            const codePart = nationalRef.substring(0, dotIdx);
            if (codePart.length > 4) {
              const digits = codePart.substring(4).replace(/[^0-9]/g, "");
              const num = parseInt(digits, 10);
              if (!isNaN(num)) foglio = String(num);
            }
          }
          if (foglio === "—") {
            const label: string = props.label ?? "";
            const labelParts = label.split("/");
            if (labelParts.length === 2) {
              foglio = labelParts[0].trim();
              particella = labelParts[1].trim();
            } else if (label) {
              particella = label;
            }
          }
        }

        // Check if this parcel is already in the list
        const existingP = particelleRef.current.find(
          p => p.foglio === foglio && p.particella === particella
        );
        if (existingP) {
          // Toggle selection of existing parcel
          onToggleSelectParcel(existingP.id);
          // Zoom to it
          const rings: L.LatLngExpression[][] = feat.geometry?.type === "Polygon"
            ? (feat.geometry as GeoJSON.Polygon).coordinates.map(ring =>
                ring.map(([lng2, lat2]) => [lat2, lng2] as L.LatLngExpression))
            : [];
          if (rings.length > 0) {
            const poly = L.polygon(rings);
            map.flyToBounds(poly.getBounds(), { padding: [80, 80], maxZoom: 17, duration: 0.5 });
          }
        } else {
          // Add as new parcel and auto-select it
          const mq = calcAreaMq([feat]);
          const clickCoords: [number, number][][] = feat.geometry?.type === "Polygon"
            ? (feat.geometry as GeoJSON.Polygon).coordinates.map(
                ring => ring.map(([lng2, lat2]) => [lat2, lng2] as [number, number]))
            : [];

          let bestComune = "Sconosciuto";
          try { bestComune = await reverseGeocodeComune(lat, lng); } catch {}

          const newP: Particella = {
            id: crypto.randomUUID(),
            comune: bestComune,
            provincia: "",
            foglio,
            particella,
            color: PARCEL_COLORS[particelleRef.current.length % PARCEL_COLORS.length],
            superficieMq: mq > 0 ? mq : undefined,
            _clickGeometry: clickCoords.length > 0 ? clickCoords : undefined,
          } as Particella & { _clickGeometry?: [number, number][][] };
          onAddParticellaRef.current(newP);
          // Auto-select the newly added parcel
          setTimeout(() => onToggleSelectParcel(newP.id), 50);
        }
      } catch (err) {
        console.warn("Catasto click error:", err);
      } finally {
        setClickLoading(false);
      }
    };

    map.on("click", handleCatastoClick);
    return () => {
      map.off("click", handleCatastoClick);
    };
  }, [clickMode, onToggleSelectParcel]);


  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    activeBaseRef.current = activeBase;

    if (basemapRef.current) map.removeLayer(basemapRef.current);
    const newBase = makeBaselayer(activeBase);
    newBase.addTo(map);
    basemapRef.current = newBase;

    const shouldShow = showCatasto;

    const toggleCatastoLayer = (layer: L.TileLayer | null) => {
      if (!layer) return;
      if (shouldShow) {
        if (!map.hasLayer(layer)) layer.addTo(map);
        layer.bringToFront();
      } else {
        if (map.hasLayer(layer)) map.removeLayer(layer);
      }
    };

    // Gerarchia visiva: foglio → terreno → fabbricato → labels → graffe
    toggleCatastoLayer(catastoFoglioRef.current);       // foglio: più trasparente, sotto tutto
    toggleCatastoLayer(catastoOverlayRef.current);      // terreno: arancione chiaro
    toggleCatastoLayer(catastoFabbricatiRef.current);   // fabbricato: arancione scuro
    toggleCatastoLayer(catastoLabelsRef.current);       // numeri particella (sopra)
    toggleCatastoLayer(catastoGraffeRef.current);       // graffe (sopra tutto)
  }, [activeBase, showCatasto]);

  // ── Toggle WMS overlays (vincoli) with bounds check ────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Build a lookup of layer bounds from definitions
    const boundsLookup: Record<string, [number, number, number, number] | undefined> = {};
    for (const l of getMergedLayers()) {
      boundsLookup[l.id] = l.bounds;
    }

    const updateLayers = () => {
      const mapBounds = map.getBounds();
      const mapS = mapBounds.getSouth();
      const mapW = mapBounds.getWest();
      const mapN = mapBounds.getNorth();
      const mapE = mapBounds.getEast();

      const layerCount = Object.keys(wmsLayersRef.current).length;
      const activeIds = Object.entries(activeLayers).filter(([, v]) => v).map(([k]) => k);
      console.log(`[LayerToggle] ${layerCount} layers in ref, ${activeIds.length} active: ${activeIds.join(", ")}`);

      for (const [id, layer] of Object.entries(wmsLayersRef.current)) {
        const isActive = activeLayers[id] ?? false;
        const lb = boundsLookup[id];
        let inBounds = true;
        if (lb && isActive) {
          const [lS, lW, lN, lE] = lb;
          inBounds = !(mapN < lS || mapS > lN || mapE < lW || mapW > lE);
        }
        const shouldShow = isActive && inBounds;
        if (shouldShow && !map.hasLayer(layer)) {
          console.log(`[LayerToggle] Adding layer: ${id}`);
          map.addLayer(layer);
        }
        if (!shouldShow && map.hasLayer(layer)) {
          console.log(`[LayerToggle] Removing layer: ${id}`);
          map.removeLayer(layer);
        }
      }
    };

    updateLayers();
    map.on("moveend", updateLayers);
    return () => { map.off("moveend", updateLayers); };
  }, [activeLayers]);

  // ── Apply dynamic opacity changes ──────────────────────────
  useEffect(() => {
    for (const [id, layer] of Object.entries(wmsLayersRef.current)) {
      const op = layerOpacity[id];
      if (op !== undefined && 'setOpacity' in layer) {
        (layer as L.TileLayer).setOpacity(op);
      }
    }
  }, [layerOpacity]);

  // ── Custom constraint layers (user-defined WMS/ArcGIS) ───────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const proxyBase = `${SUPABASE_URL}/functions/v1/wfs-proxy`;
    const currentIds = new Set(customConstraints.map(c => c.id));

    // Remove layers no longer present
    for (const [id, layer] of Object.entries(customLayersRef.current)) {
      if (!currentIds.has(id)) {
        if (map.hasLayer(layer)) map.removeLayer(layer);
        delete customLayersRef.current[id];
      }
    }

    // Add new layers
    for (const c of customConstraints) {
      if (customLayersRef.current[c.id]) continue; // already exists

      // Detect if it's ArcGIS MapServer or WMS
      const isArcGIS = c.url.includes("/MapServer") || c.url.includes("/arcgis/");

      const TileLayerClass = L.TileLayer.extend({
        getTileUrl(coords: L.Coords): string {
          const m = (this as unknown as { _map: L.Map })._map;
          if (!m) return "";
          const sz = 256;
          const nw = m.unproject([coords.x * sz, coords.y * sz], coords.z);
          const se = m.unproject([(coords.x + 1) * sz, (coords.y + 1) * sz], coords.z);
          const south = Math.min(nw.lat, se.lat);
          const north = Math.max(nw.lat, se.lat);
          const west = Math.min(nw.lng, se.lng);
          const east = Math.max(nw.lng, se.lng);

          let targetUrl: string;
          if (isArcGIS) {
            const base = c.url.replace(/\/export$/, "");
            targetUrl = `${base}/export?bbox=${west},${south},${east},${north}&bboxSR=4326&imageSR=4326&size=${sz},${sz}&format=png&transparent=true&f=image`;
          } else {
            const sep = c.url.includes("?") ? "&" : "?";
            targetUrl = `${c.url}${sep}SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&FORMAT=image/png&TRANSPARENT=true&CRS=EPSG:4326&WIDTH=${sz}&HEIGHT=${sz}&BBOX=${south},${west},${north},${east}`;
          }
          return `${proxyBase}?mode=wms_ext&url=${encodeURIComponent(targetUrl)}`;
        },
      });

      const layer = new (TileLayerClass as unknown as new (url: string, opts: L.TileLayerOptions & { pane: string }) => L.TileLayer)(
        proxyBase,
        { opacity: 0.65, pane: "wmsPane", tileSize: 256, maxZoom: 19, attribution: c.name } as L.TileLayerOptions & { pane: string }
      );

      customLayersRef.current[c.id] = layer;
      layer.addTo(map);
    }
  }, [customConstraints]);

  // ── Draw parcels ────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Only re-draw when the set of parcel IDs actually changes
    const currentIds = particelle.map(p => p.id).join(",");
    if (currentIds === drawnParcelIdsRef.current) return;
    drawnParcelIdsRef.current = currentIds;

    // Remove previous layers
    parcelLayersRef.current.forEach(layer => { try { map.removeLayer(layer); } catch {} });
    parcelLayersRef.current = [];
    parcelFeaturesRef.current = {};
    setLocalAreas({});

    if (particelle.length === 0) {
      map.setView(CENTER, 13);
      return;
    }

    const geometries: Record<string, L.LatLngExpression[][]> = {};

    // Mark all as loading
    const loadingStatuses: Record<string, ParcelStatus> = {};
    particelle.forEach(p => { loadingStatuses[p.id] = "loading"; });
    setParcelStatuses(loadingStatuses);

    // Process each parcel: geocode center → placeholder → mode=parcel lookup → real polygon
    particelle.forEach(async (p, idx) => {
      const color = p.color || "#3b82f6";
      const pAny = p as Particella & { _clickGeometry?: [number, number][][] };

      // If parcel was added by map click and already has geometry, draw it directly
      if (pAny._clickGeometry && pAny._clickGeometry.length > 0) {
        const rings: L.LatLngExpression[][] = pAny._clickGeometry.map(
          ring => ring.map(([lat2, lng2]) => [lat2, lng2] as L.LatLngExpression)
        );
        const poly = L.polygon(rings, {
          color, fillColor: color, fillOpacity: 0.4, weight: 3, opacity: 1, pane: "parcelsPane",
        });
        const mq = p.superficieMq ?? 0;
        poly.bindPopup(
          `<strong>${p.comune}</strong><br>` +
          `Foglio <b>${p.foglio}</b> / Particella <b>${p.particella}</b><br>` +
          (mq > 0 ? `<span style="font-weight:600;color:hsl(142,60%,35%)">Superficie: ${formatArea(mq)}</span><br>` : "") +
          `<em style="font-size:11px;color:hsl(142,60%,35%)">✓ Perimetro reale (WFS)</em>`
        );
        poly.addTo(map);
        parcelLayersRef.current.push(poly);
        geometries[p.id] = rings;
        onParcelGeometries?.(geometries);
        if (mq > 0) {
          setLocalAreas(prev => ({ ...prev, [p.id]: mq }));
          onParcelAreaUpdate?.(p.id, mq);
        }
        // Store GeoJSON feature for union computation
        const geojsonFeature: GeoJSON.Feature<GeoJSON.Polygon> = {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Polygon",
            coordinates: pAny._clickGeometry!.map(ring =>
              ring.map(([lat2, lng2]) => [lng2, lat2])
            ),
          },
        };
        parcelFeaturesRef.current[p.id] = [geojsonFeature];
        setParcelStatuses(prev => ({ ...prev, [p.id]: "real" }));
        if (idx === 0) {
          try { map.flyToBounds(poly.getBounds(), { padding: [80, 80], maxZoom: 17, duration: 0.8 }); } catch {}
        }
        return;
      }

      // 1. Geocode just for map centering + placeholder position
      let center: [number, number] = [42.8333, 12.8333];
      let geocodeBbox: [number, number, number, number] | undefined;
      try {
        const geocodeResult = await geocodeComuneWithBbox(p.comune);
        center = [geocodeResult.lat, geocodeResult.lng];
        geocodeBbox = geocodeResult.bbox;
      } catch {
        // use Italy center fallback
      }
      const [lat, lng] = center;

      // 2. Draw placeholder polygon immediately (near commune center)
      const rawCoords = makePlaceholderPolygon(center, idx);
      const coords: L.LatLngExpression[][] = [
        rawCoords.map(([plat, plng]) => [plat, plng] as L.LatLngExpression),
      ];

      const placeholderPoly = L.polygon(coords, {
        color,
        fillColor: color,
        fillOpacity: 0.25,
        weight: 2,
        opacity: 0.7,
        pane: "parcelsPane",
        dashArray: "8 5",
      });

      placeholderPoly.bindPopup(
        `<strong>${p.comune}</strong><br>` +
        `Foglio <b>${p.foglio}</b> / Particella <b>${p.particella}</b><br>` +
        `<em style="font-size:10px;opacity:0.6">⚠ Ricerca in corso…</em>`
      );

      placeholderPoly.addTo(map);
      geometries[p.id] = coords;
      parcelLayersRef.current.push(placeholderPoly);

      // Center map on first parcel placeholder
      if (idx === 0) {
        try { map.setView(placeholderPoly.getBounds().getCenter(), 15); } catch {}
      }

      onParcelGeometries?.(geometries);

      // Skip mode=parcel if foglio/particella are invalid (e.g. from click with no metadata)
      const hasBadData = !p.foglio || p.foglio === "—" || !p.particella || p.particella === "—";
      if (hasBadData) {
        setParcelStatuses(prev => ({ ...prev, [p.id]: "placeholder" }));
        return;
      }

      // 3. Fetch real geometry via Parquet lookup + tiny WFS bbox (mode=parcel)
      try {
        const features = await searchParcelByAttribute(p.comune, p.foglio, p.particella, geocodeBbox);

        if (features.length === 0) {
          // Remove placeholder — parcel not found
          try { map.removeLayer(placeholderPoly); } catch {}
          parcelLayersRef.current = parcelLayersRef.current.filter(l => l !== placeholderPoly);
          toast({
            title: "Particella non trovata",
            description: `${p.comune} — Fg. ${p.foglio} / Part. ${p.particella} non trovata nel catasto WFS`,
            variant: "destructive",
          });
          setParcelStatuses(prev => ({ ...prev, [p.id]: "placeholder" }));
          return;
        }

        // Remove placeholder
        try { map.removeLayer(placeholderPoly); } catch {}
        parcelLayersRef.current = parcelLayersRef.current.filter(l => l !== placeholderPoly);

        const realCoords: L.LatLngExpression[][] = [];
        let totalMq = 0;
        let firstPoly: L.Polygon | null = null;

        // Store raw GeoJSON features for union computation
        parcelFeaturesRef.current[p.id] = features.filter(
          f => f.geometry && f.geometry.type === "Polygon"
        );

        // The server already filtered by foglio+particella; render all returned features
        features.forEach(feat => {
          if (!feat.geometry || feat.geometry.type !== "Polygon") return;
          const rings = (feat.geometry as GeoJSON.Polygon).coordinates;

          totalMq += area(feat as GeoJSON.Feature<GeoJSON.Polygon>);

          const leafletRings = rings.map(ring =>
            ring.map(([lng2, lat2]) => [lat2, lng2] as L.LatLngExpression)
          );
          leafletRings.forEach(r => realCoords.push(r));

          const poly = L.polygon(leafletRings, {
            color,
            fillColor: color,
            fillOpacity: 0.4,
            weight: 3,
            opacity: 1,
            pane: "parcelsPane",
          });

          const surfaceTxt = totalMq > 0
            ? `<span style="font-weight:600;color:hsl(142,60%,35%)">Superficie: ${formatArea(Math.round(totalMq))}</span><br>`
            : "";

          poly.bindPopup(
            `<strong>${p.comune}</strong><br>` +
            `Foglio <b>${p.foglio}</b> / Particella <b>${p.particella}</b><br>` +
            surfaceTxt +
            `<em style="font-size:11px;color:hsl(142,60%,35%)">✓ Perimetro reale (WFS)</em>`
          );

          poly.addTo(map);
          parcelLayersRef.current.push(poly);
          if (!firstPoly) firstPoly = poly;
        });

        // Fly to real polygon
        if (firstPoly) {
          try {
            const b = (firstPoly as L.Polygon).getBounds();
            if (b.isValid()) map.flyToBounds(b, { padding: [80, 80], maxZoom: 17, duration: 0.8 });
          } catch {}
        }

        const mqFinal = Math.round(totalMq);
        geometries[p.id] = realCoords;
        onParcelGeometries?.(geometries);
        setLocalAreas(prev => ({ ...prev, [p.id]: mqFinal }));
        onParcelAreaUpdate?.(p.id, mqFinal);
        setParcelStatuses(prev => ({ ...prev, [p.id]: "real" }));
      } catch (err) {
        console.warn(`WFS fetch failed for ${p.comune} Fg.${p.foglio} Part.${p.particella}:`, err);
        // Remove placeholder on error too
        try { map.removeLayer(placeholderPoly); } catch {}
        parcelLayersRef.current = parcelLayersRef.current.filter(l => l !== placeholderPoly);
        toast({
          title: "Errore ricerca particella",
          description: `Impossibile cercare ${p.comune} Fg. ${p.foglio} / Part. ${p.particella}`,
          variant: "destructive",
        });
        setParcelStatuses(prev => ({ ...prev, [p.id]: "placeholder" }));
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [particelle]);

  // ── Selection highlight + union effect ──────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear previous highlights
    selectedHighlightLayersRef.current.forEach(l => { try { map.removeLayer(l); } catch {} });
    selectedHighlightLayersRef.current = [];
    if (unionLayerRef.current) {
      try { map.removeLayer(unionLayerRef.current); } catch {};
      unionLayerRef.current = null;
    }

    if (selectedParcelIds.length === 0) {
      setSelectionArea(null);
      return;
    }

    // Draw highlight borders for selected parcels
    const allFeatures: GeoJSON.Feature<GeoJSON.Polygon>[] = [];
    let boundsGroup: L.LatLngBounds | null = null;

    for (const id of selectedParcelIds) {
      const feats = parcelFeaturesRef.current[id];
      if (!feats || feats.length === 0) continue;
      for (const feat of feats) {
        if (!feat.geometry || feat.geometry.type !== "Polygon") continue;
        allFeatures.push(feat as GeoJSON.Feature<GeoJSON.Polygon>);
        const rings = (feat.geometry as GeoJSON.Polygon).coordinates.map(ring =>
          ring.map(([lng2, lat2]) => [lat2, lng2] as L.LatLngExpression)
        );
        const highlight = L.polygon(rings, {
          color: "#1d4ed8",
          fillColor: "transparent",
          fillOpacity: 0,
          weight: 3,
          opacity: 0.9,
          dashArray: "6 3",
          pane: "parcelsPane",
        });
        highlight.addTo(map);
        selectedHighlightLayersRef.current.push(highlight);
        const b = highlight.getBounds();
        boundsGroup = boundsGroup ? boundsGroup.extend(b) : b;
      }
    }

    // Compute total area of selected parcels
    let totalSelectedMq = 0;
    for (const feat of allFeatures) {
      totalSelectedMq += area(feat);
    }
    setSelectionArea({ mq: Math.round(totalSelectedMq), count: selectedParcelIds.length });

    // Try union for visual display
    if (allFeatures.length >= 2) {
      try {
        let unionResult: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | null = allFeatures[0] as GeoJSON.Feature<GeoJSON.Polygon>;
        for (let i = 1; i < allFeatures.length; i++) {
          const next = allFeatures[i] as GeoJSON.Feature<GeoJSON.Polygon>;
          const result = turfUnion(
            { type: "FeatureCollection", features: [unionResult!, next] } as GeoJSON.FeatureCollection<GeoJSON.Polygon>
          );
          if (result) unionResult = result;
        }
        if (unionResult && unionResult.geometry) {
          const coords = unionResult.geometry.type === "Polygon"
            ? [unionResult.geometry.coordinates]
            : unionResult.geometry.coordinates;
          for (const polyCoords of coords) {
            const rings = polyCoords.map((ring: number[][]) =>
              ring.map(([lng2, lat2]: number[]) => [lat2, lng2] as L.LatLngExpression)
            );
            const unionPoly = L.polygon(rings, {
              color: "#7c3aed",
              fillColor: "#7c3aed",
              fillOpacity: 0.12,
              weight: 2,
              opacity: 0.6,
              pane: "parcelsPane",
            });
            unionPoly.addTo(map);
            unionLayerRef.current = unionPoly;
          }
        }
      } catch (e) {
        console.warn("Union computation failed:", e);
      }
    }

    // Fly to selection bounds (only when a new parcel is added to selection)
    if (boundsGroup && boundsGroup.isValid()) {
      map.flyToBounds(boundsGroup, { padding: [80, 80], maxZoom: 17, duration: 0.5 });
    }
  }, [selectedParcelIds, particelle]);

  // ── Total area display (local, avoids parent re-render loop) ─
  const totalMq = Object.values(localAreas).reduce((s, v) => s + v, 0);

  return (
    <div className="h-full w-full relative">
      <div ref={containerRef} className="h-full w-full" />

      {/* Loading indicator */}
      {Object.values(parcelStatuses).some(s => s === "loading") && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-card/95 backdrop-blur border border-border rounded-lg px-3 py-1.5 flex items-center gap-2 shadow-md">
          <Loader2 size={14} className="animate-spin text-primary" />
          <span className="text-xs text-foreground">Caricamento perimetri reali…</span>
        </div>
      )}

      {/* Click loading */}
      {clickLoading && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-card/95 backdrop-blur border border-border rounded-lg px-3 py-1.5 flex items-center gap-2 shadow-md">
          <Loader2 size={14} className="animate-spin text-primary" />
          <span className="text-xs text-foreground">Ricerca particella…</span>
        </div>
      )}

      {/* Multi-selection summary panel */}
      {selectionArea && selectedParcelIds.length > 0 && !clickMode && (
        <div className="absolute top-14 left-3 z-[1000] bg-card/95 backdrop-blur border border-primary/40 rounded-lg px-3 py-2 shadow-md min-w-[200px]">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-semibold text-foreground">
              {selectionArea.count} particella/e selezionata/e
            </span>
            <button
              onClick={onClearSelection}
              className="text-muted-foreground hover:text-foreground text-xs leading-none"
            >✕</button>
          </div>
          {selectionArea.mq > 0 && (
            <>
              <p className="text-xs text-foreground font-mono">
                {selectionArea.mq.toLocaleString("it-IT")} m²
              </p>
              <p className="text-[10px] text-muted-foreground">
                {(selectionArea.mq / 10000).toFixed(4)} ha
              </p>
            </>
          )}
        </div>
      )}

      {/* Click mode removed — clicking map always adds parcels */}

      {/* Basemap switcher */}
      <div className="absolute bottom-8 right-3 z-[1000] flex flex-col gap-1">
        {BASEMAPS.map((bm) => (
          <button
            key={bm.id}
            onClick={() => setActiveBase(bm.id)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border shadow-md transition-all",
              activeBase === bm.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card/95 backdrop-blur text-foreground border-border hover:bg-muted"
            )}
          >
            {bm.icon === "map" && <Map size={12} />}
            {bm.icon === "satellite" && <Satellite size={12} />}
            {bm.label}
          </button>
        ))}
      </div>

      {/* Parcel legend + total area */}
      {particelle.length > 0 && (
        <div className="absolute bottom-8 left-3 z-[1000] bg-card/95 backdrop-blur border border-border rounded-lg p-3 shadow-lg max-w-[240px]">
          <p className="text-xs font-semibold text-foreground mb-2">Particelle</p>
          {particelle.map(p => {
            const status = parcelStatuses[p.id];
            return (
              <div key={p.id} className="flex items-center gap-2 mb-1.5">
                <div
                  className="w-4 h-4 rounded-sm flex-shrink-0 border-2"
                  style={{
                    backgroundColor: p.color ? p.color + "60" : "#3b82f660",
                    borderColor: p.color,
                    borderStyle: status === "real" ? "solid" : "dashed",
                  }}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-foreground block truncate">
                    Fg.{p.foglio} / {p.particella}
                  </span>
                  {localAreas[p.id] && (
                    <span className="text-[10px] text-green-600 dark:text-green-400 block">
                      {formatArea(localAreas[p.id])}
                    </span>
                  )}
                </div>
                {status === "loading" && <Loader2 size={10} className="animate-spin text-primary flex-shrink-0" />}
                {status === "real" && <span className="text-[10px] text-green-500 flex-shrink-0">✓</span>}
              </div>
            );
          })}

          {/* Total area */}
          {totalMq > 0 && (
            <div className="mt-2 pt-2 border-t border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-medium">Superficie totale</span>
                <span className="text-xs font-bold text-foreground">{formatArea(totalMq)}</span>
              </div>
            </div>
          )}

          {/* Legend types */}
          <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0 border-t-2 border-dashed border-muted-foreground/60 flex-shrink-0" />
              <span className="text-[10px] text-muted-foreground">Perimetro stimato</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0 border-t-2 border-solid border-muted-foreground/60 flex-shrink-0" />
              <span className="text-[10px] text-muted-foreground">Perimetro reale (WFS)</span>
            </div>
          </div>

          {/* Catasto layer legend */}
          <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground mb-1">Catasto WMS</p>
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 rounded-sm flex-shrink-0 border border-yellow-500/50" style={{ background: "rgba(234,179,8,0.12)" }} />
              <span className="text-[10px] text-muted-foreground">Foglio</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 rounded-sm flex-shrink-0 border border-orange-400/70" style={{ background: "rgba(251,146,60,0.30)" }} />
              <span className="text-[10px] text-muted-foreground">Terreno</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 rounded-sm flex-shrink-0 border border-orange-700/80" style={{ background: "rgba(194,65,12,0.55)" }} />
              <span className="text-[10px] text-muted-foreground">Fabbricato</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0 border-t-2 border-dashed border-orange-500/70 flex-shrink-0" />
              <span className="text-[10px] text-muted-foreground">Graffe / subalterni</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
