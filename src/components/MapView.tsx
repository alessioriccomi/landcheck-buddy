import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Particella, PARCEL_COLORS } from "@/types/vincoli";
import { Satellite, Map, Layers, Loader2, MousePointer } from "lucide-react";
import { cn } from "@/lib/utils";
import area from "@turf/area";
import { ALL_LAYERS } from "@/components/LayerControl";

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
// (mantenuto solo per compatibilità con la modalità click-mappa)
// ──────────────────────────────────────────────────────────────
const COMUNI_COORDS: Record<string, [number, number]> = {
  "roma": [41.9028, 12.4964],
  "milano": [45.4654, 9.1859],
  "napoli": [40.8518, 14.2681],
  "torino": [45.0703, 7.6869],
  "palermo": [38.1157, 13.3615],
  "genova": [44.4056, 8.9463],
  "bologna": [44.4949, 11.3426],
  "firenze": [43.7696, 11.2558],
  "bari": [41.1171, 16.8719],
  "catania": [37.5079, 15.0830],
  "venezia": [45.4408, 12.3155],
  "verona": [45.4384, 10.9916],
  "messina": [38.1938, 15.5540],
  "padova": [45.4064, 11.8768],
  "trieste": [45.6495, 13.7768],
  "taranto": [40.4644, 17.2470],
  "brescia": [45.5416, 10.2118],
  "prato": [43.8777, 11.1023],
  "parma": [44.8015, 10.3279],
  "modena": [44.6471, 10.9252],
  "reggio calabria": [38.1114, 15.6438],
  "reggio emilia": [44.6989, 10.6297],
  "perugia": [43.1122, 12.3888],
  "livorno": [43.5485, 10.3106],
  "ravenna": [44.4184, 12.2035],
  "cagliari": [39.2238, 9.1217],
  "foggia": [41.4621, 15.5444],
  "rimini": [44.0678, 12.5695],
  "salerno": [40.6824, 14.7681],
  "ferrara": [44.8381, 11.6198],
  "sassari": [40.7259, 8.5556],
  "latina": [41.4677, 12.9035],
  "monza": [45.5845, 9.2744],
  "siracusa": [37.0755, 15.2866],
  "pescara": [42.4618, 14.2158],
  "bergamo": [45.6983, 9.6773],
  "forlì": [44.2227, 12.0407],
  "trento": [46.0748, 11.1217],
  "vicenza": [45.5455, 11.5354],
  "terni": [42.5636, 12.6430],
  "bolzano": [46.4983, 11.3548],
  "novara": [45.4469, 8.6224],
  "piacenza": [45.0526, 9.6930],
  "ancona": [43.6158, 13.5189],
  "arezzo": [43.4633, 11.8800],
  "udine": [46.0614, 13.2356],
  "cesena": [44.1394, 12.2420],
  "lecce": [40.3516, 18.1750],
  "pesaro": [43.9100, 12.9132],
  "catanzaro": [38.9099, 16.5879],
  "la spezia": [44.1024, 9.8240],
  "como": [45.8081, 9.0852],
  "lucca": [43.8430, 10.5077],
  "brindisi": [40.6326, 17.9415],
  "pistoia": [43.9298, 10.9066],
  "savona": [44.3068, 8.4814],
  "pisa": [43.7228, 10.4017],
  "alessandria": [44.9121, 8.6150],
  "siena": [43.3188, 11.3307],
  "grosseto": [42.7604, 11.1116],
  "potenza": [40.6418, 15.8058],
  "l'aquila": [42.3498, 13.3995],
  "campobasso": [41.5602, 14.6680],
  "aosta": [45.7372, 7.3206],
  "matera": [40.6664, 16.6043],
  "cosenza": [39.3087, 16.2529],
  "caserta": [41.0740, 14.3325],
  "avellino": [40.9147, 14.7900],
  "benevento": [41.1297, 14.7784],
  "frosinone": [41.6354, 13.3500],
  "viterbo": [42.4202, 12.1046],
  "rieti": [42.4022, 12.8594],
  "teramo": [42.6586, 13.7042],
  "chieti": [42.3517, 14.1681],
  "macerata": [43.2984, 13.4533],
  "ascoli piceno": [42.8509, 13.5745],
  "mantova": [45.1564, 10.7914],
  "cremona": [45.1327, 10.0227],
  "lodi": [45.3098, 9.5041],
  "lecco": [45.8566, 9.3944],
  "varese": [45.8206, 8.8257],
  "pavia": [45.1847, 9.1582],
  "asti": [44.9004, 8.2059],
  "cuneo": [44.3842, 7.5421],
  "vercelli": [45.3219, 8.4233],
  "rovigo": [45.0699, 11.7901],
  "belluno": [46.1434, 12.2169],
  "treviso": [45.6699, 12.2430],
  "pordenone": [45.9564, 12.6615],
  "gorizia": [45.9408, 13.6219],
  "imperia": [43.8886, 8.0214],
  "nuoro": [40.3186, 9.3295],
  "oristano": [39.9068, 8.5916],
  "olbia": [40.9232, 9.4986],
  // Comuni toscani e altri
  "montecatini terme": [43.8847, 10.7735],
  "montecatini-terme": [43.8847, 10.7735],
  "empoli": [43.7197, 10.9453],
  "pontedera": [43.6614, 10.6325],
  "massa": [44.0353, 10.1418],
  "carrara": [44.0786, 10.0998],
  "viareggio": [43.8673, 10.2505],
  "forte dei marmi": [43.9631, 10.1705],
  "pietrasanta": [43.9580, 10.2240],
  "capannori": [43.8427, 10.5742],
  "altopascio": [43.8175, 10.6760],
  "pescia": [43.9022, 10.6913],
  "monsummano terme": [43.8715, 10.8128],
  "buggiano": [43.8784, 10.7349],
  "uzzano": [43.8872, 10.7213],
  "lamporecchio": [43.8203, 10.8961],
  "serravalle pistoiese": [43.9097, 10.8296],
  "quarrata": [43.8458, 10.9858],
  "montale": [43.9408, 11.0183],
  "agliana": [43.9024, 11.0028],
  "pieve a nievole": [43.8817, 10.7954],
  "massa e cozzile": [43.9108, 10.7511],
  "larciano": [43.8218, 10.8714],
  "ponte buggianese": [43.8416, 10.7499],
  "san miniato": [43.6857, 10.8498],
  "certaldo": [43.5480, 11.0420],
  "castelfiorentino": [43.6055, 10.9736],
  "poggibonsi": [43.4688, 11.1511],
  "colle val d'elsa": [43.4228, 11.1197],
  "colle di val d'elsa": [43.4228, 11.1197],
  "volterra": [43.4014, 10.8604],
  "san gimignano": [43.4677, 11.0435],
  "montalcino": [43.0588, 11.4900],
  "montepulciano": [43.0980, 11.7861],
  "pienza": [43.0748, 11.6790],
  "chianciano terme": [43.0604, 11.8260],
  "chiusi": [43.0156, 11.9457],
  "sansepolcro": [43.5693, 12.1395],
  "bibbiena": [43.6959, 11.8170],
  "poppi": [43.7262, 11.7704],
  "stia": [43.7996, 11.7097],
  "pratovecchio": [43.7810, 11.7211],
  "castiglion fiorentino": [43.3411, 11.9225],
  "cortona": [43.2763, 11.9875],
  "castiglione della pescaia": [42.7622, 10.8765],
  "orbetello": [42.4384, 11.2148],
  "pitigliano": [42.6362, 11.6680],
  "sorano": [42.6826, 11.7158],
  "manciano": [42.5907, 11.5153],
  "scansano": [42.6889, 11.3318],
  "follonica": [42.9234, 10.7612],
  "massa marittima": [43.0505, 10.8943],
  "roccastrada": [43.0061, 11.1636],
  "civitavecchia": [42.0938, 11.7961],
  "montefiascone": [42.5403, 12.0267],
  "tivoli": [41.9634, 12.7981],
  "velletri": [41.6869, 12.7805],
  "anzio": [41.4477, 12.6267],
  "nettuno": [41.4639, 12.6602],
  "pomezia": [41.6719, 12.5012],
  "albano laziale": [41.7292, 12.6608],
  "genzano di roma": [41.7009, 12.6921],
  "marino": [41.7706, 12.6548],
  "frascati": [41.8082, 12.6813],
  "palestrina": [41.8388, 12.8908],
  "valmontone": [41.7804, 12.9206],
  "colleferro": [41.7277, 13.0049],
  "guidonia montecelio": [41.9968, 12.7218],
  "monterotondo": [42.0514, 12.6168],
  "mentana": [42.0232, 12.6422],
  "fiumicino": [41.7756, 12.2381],
  "cerveteri": [41.9994, 12.1000],
  "ladispoli": [41.9479, 12.0791],
  "santa marinella": [42.0342, 11.8498],
  "tarquinia": [42.2591, 11.7559],
};

function getComuneCoords(comune: string): [number, number] | null {
  const key = comune.toLowerCase().trim();
  return COMUNI_COORDS[key] ?? null;
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
): Promise<GeoJSON.Feature[]> {
  const params = new URLSearchParams({ mode: "parcel", comune, foglio, particella });
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

// Legacy fetchParcelGeometry for click mode (uses lat/lng/radius, no specific parcel)
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
type BasemapId = "osm" | "satellite" | "catasto" | "satellite_catasto";

interface BasemapDef {
  id: BasemapId;
  label: string;
  icon: "map" | "satellite" | "layers";
}

const BASEMAPS: BasemapDef[] = [
  { id: "osm", label: "Mappa", icon: "map" },
  { id: "satellite", label: "Satellite", icon: "satellite" },
  { id: "satellite_catasto", label: "Sat+Catasto", icon: "layers" },
  { id: "catasto", label: "Map+Catasto", icon: "layers" },
];

function makeBaselayer(id: BasemapId): L.TileLayer {
  switch (id) {
    case "osm":
      return L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      });
    case "satellite":
    case "satellite_catasto":
      return L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "Tiles &copy; Esri",
          maxZoom: 19,
        }
      );
    case "catasto":
      return L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
        opacity: 0.55,
      });
  }
}

interface MapViewProps {
  particelle: Particella[];
  activeLayers: Record<string, boolean>;
  onParcelGeometries?: (geoms: Record<string, L.LatLngExpression[][]>) => void;
  onParcelAreaUpdate?: (id: string, mq: number) => void;
  onAddParticella?: (p: Particella) => void;
}

type ParcelStatus = "idle" | "loading" | "real" | "placeholder";

export function MapView({
  particelle,
  activeLayers,
  onParcelGeometries,
  onParcelAreaUpdate,
  onAddParticella,
}: MapViewProps) {
  const showCatasto = activeLayers["catasto"] ?? true;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const wmsLayersRef = useRef<Record<string, L.TileLayer.WMS | L.TileLayer>>({});
  const parcelLayersRef = useRef<L.Layer[]>([]);
  const basemapRef = useRef<L.TileLayer | null>(null);
  const catastoOverlayRef = useRef<L.TileLayer.WMS | null>(null);
  const fabbricatiOverlayRef = useRef<L.TileLayer | null>(null);
  const activeBaseRef = useRef<BasemapId>("osm");
  const [activeBase, setActiveBase] = useState<BasemapId>("osm");
  const [parcelStatuses, setParcelStatuses] = useState<Record<string, ParcelStatus>>({});
  // Local area map: parcelId → mq (avoids triggering re-render loop in parent)
  const [localAreas, setLocalAreas] = useState<Record<string, number>>({});
  const [clickLoading, setClickLoading] = useState(false);
  const [clickMode, setClickMode] = useState(false);
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
    const proxyBase = `${SUPABASE_URL}/functions/v1/wfs-proxy`;

    const CatastoTileLayer = L.TileLayer.extend({
      getTileUrl(coords: L.Coords): string {
        const m = (this as unknown as { _map: L.Map })._map;
        if (!m) return "";
        const tileBounds = m.unproject([coords.x * 256, coords.y * 256], coords.z);
        const tileBoundsNE = m.unproject([(coords.x + 1) * 256, (coords.y + 1) * 256], coords.z);
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
          LAYERS: "CP.CadastralParcel",
          FORMAT: "image/png",
          TRANSPARENT: "true",
          CRS: "EPSG:6706",
          WIDTH: "256",
          HEIGHT: "256",
          BBOX: bbox,
        });
        return `${proxyBase}?${params.toString()}`;
      },
    });

    const catastoWms = new (CatastoTileLayer as unknown as new (url: string, opts: L.TileLayerOptions & { pane: string }) => L.TileLayer)(
      proxyBase,
      {
        opacity: 0.85,
        attribution: "Agenzia delle Entrate",
        pane: "wmsPane",
        tileSize: 256,
        maxZoom: 19,
      } as L.TileLayerOptions & { pane: string }
    );
    catastoOverlayRef.current = catastoWms as unknown as L.TileLayer.WMS;

    // ── Fabbricati WMS layer (edifici arancioni, stile forMaps) ──
    // Usa lo stesso proxy con LAYERS=CP.CadastralBuilding (layer INSPIRE fabbricati AdE)
    const FabbricatiTileLayer = L.TileLayer.extend({
      getTileUrl(coords: L.Coords): string {
        const m = (this as unknown as { _map: L.Map })._map;
        if (!m) return "";
        const tileBounds = m.unproject([coords.x * 256, coords.y * 256], coords.z);
        const tileBoundsNE = m.unproject([(coords.x + 1) * 256, (coords.y + 1) * 256], coords.z);
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
          LAYERS: "CP.CadastralParcel",
          STYLES: "inspire_common:DEFAULT",
          FORMAT: "image/png",
          TRANSPARENT: "true",
          CRS: "EPSG:6706",
          WIDTH: "256",
          HEIGHT: "256",
          BBOX: bbox,
        });
        return `${proxyBase}?${params.toString()}`;
      },
    });

    const fabbricatiLayer = new (FabbricatiTileLayer as unknown as new (url: string, opts: L.TileLayerOptions & { pane: string }) => L.TileLayer)(
      proxyBase,
      {
        opacity: 0.9,
        attribution: "Agenzia delle Entrate",
        pane: "wmsPane",
        tileSize: 256,
        maxZoom: 19,
      } as L.TileLayerOptions & { pane: string }
    );
    fabbricatiOverlayRef.current = fabbricatiLayer as unknown as L.TileLayer;

    // ── Dynamic WMS layers from ALL_LAYERS definitions ────────
    const dynamicLayers: Record<string, L.TileLayer> = {};
    for (const layerDef of ALL_LAYERS) {
      if (!layerDef.wmsUrl || !layerDef.wmsLayer) continue;
      try {
        const wmsLayer = L.tileLayer.wms(layerDef.wmsUrl, {
          layers: layerDef.wmsLayer,
          format: "image/png",
          transparent: true,
          version: "1.3.0",
          opacity: layerDef.opacity ?? 0.5,
          pane: "wmsPane",
          attribution: "Geoportale Nazionale/ISPRA/MASE",
        } as L.WMSOptions);
        dynamicLayers[layerDef.id] = wmsLayer;
      } catch { /* skip unsupported layers */ }
    }

    wmsLayersRef.current = dynamicLayers;
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

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
      setClickLoading(true);
      try {
        const features = await fetchParcelGeometryByPoint(lat, lng, 0.001);
        if (features.length === 0) {
          setClickLoading(false);
          return;
        }

        // Pick first feature that has localId / label
        const feat = features[0];
        const props = feat.properties ?? {};
        const localId: string = props.localId ?? "";
        const label: string = props.label ?? "";

        // Parse foglio e particella dal localId (formato: IT.AGE.PLA.XXXXX_FFF_PPPPP)
        // oppure dall'etichetta, es. "123/456"
        let foglio = "";
        let particella = label || (localId.split("_").pop() ?? "");

        // Cerca di estrarre foglio dal localId o dal label
        const labelParts = label.split("/");
        if (labelParts.length === 2) {
          foglio = labelParts[0].trim();
          particella = labelParts[1].trim();
        } else {
          const idParts = localId.split("_");
          if (idParts.length >= 2) {
            foglio = idParts[idParts.length - 2] ?? "";
            particella = idParts[idParts.length - 1] ?? "";
          }
        }

        // Cerca comune approssimativo dai comuni nel dizionario (closest coords)
        let bestComune = "Sconosciuto";
        let bestDist = Infinity;
        for (const [nome, [clat, clng]] of Object.entries(COMUNI_COORDS)) {
          const d = Math.hypot(lat - clat, lng - clng);
          if (d < bestDist) { bestDist = d; bestComune = nome; }
        }
        bestComune = bestComune.charAt(0).toUpperCase() + bestComune.slice(1);

      const mq = calcAreaMq(features);
        const currentLen = particelleRef.current.length;
        const newP: Particella = {
          id: crypto.randomUUID(),
          comune: bestComune,
          provincia: "",
          foglio,
          particella,
          color: PARCEL_COLORS[currentLen % PARCEL_COLORS.length],
          superficieMq: mq > 0 ? mq : undefined,
        } as Particella;
        onAddParticellaRef.current(newP);
      } catch (err) {
        console.warn("Click WFS error:", err);
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

  // ── Switch basemap + catasto/fabbricati overlays ──────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    activeBaseRef.current = activeBase;

    if (basemapRef.current) map.removeLayer(basemapRef.current);
    const newBase = makeBaselayer(activeBase);
    newBase.addTo(map);
    basemapRef.current = newBase;

    if ((activeBase === "catasto" || activeBase === "satellite_catasto") && map.getZoom() < 15) {
      map.setZoom(15);
    }

    const catastoWms = catastoOverlayRef.current;
    const fabbricatiWms = fabbricatiOverlayRef.current;

    // Catasto parcel overlay: visible when catasto layer on, or in catasto/satellite_catasto modes
    if (catastoWms) {
      const shouldShow = showCatasto || activeBase === "catasto" || activeBase === "satellite_catasto";
      if (shouldShow) {
        if (!map.hasLayer(catastoWms)) catastoWms.addTo(map);
        catastoWms.bringToFront();
      } else {
        if (map.hasLayer(catastoWms)) map.removeLayer(catastoWms);
      }
    }

    // Fabbricati overlay: only in satellite_catasto mode (the forMaps-style view)
    if (fabbricatiWms) {
      const showFabbricati = activeBase === "satellite_catasto";
      if (showFabbricati) {
        if (!map.hasLayer(fabbricatiWms)) fabbricatiWms.addTo(map);
      } else {
        if (map.hasLayer(fabbricatiWms)) map.removeLayer(fabbricatiWms);
      }
    }
  }, [activeBase, showCatasto]);

  // ── Toggle WMS overlays (vincoli) ─────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const toggleLayer = (layer: L.Layer | undefined | null, active: boolean) => {
      if (!layer) return;
      if (active && !map.hasLayer(layer)) map.addLayer(layer);
      if (!active && map.hasLayer(layer)) map.removeLayer(layer);
    };

    // Toggle all dynamic WMS layers by id
    for (const [id, layer] of Object.entries(wmsLayersRef.current)) {
      toggleLayer(layer, activeLayers[id] ?? false);
    }
  }, [activeLayers]);

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

      // 1. Geocode just for map centering + placeholder position
      let center: [number, number] = [42.8333, 12.8333];
      try {
        const geocodeResult = await geocodeComuneWithBbox(p.comune);
        center = [geocodeResult.lat, geocodeResult.lng];
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

      // 3. Fetch real geometry via Parquet lookup + tiny WFS bbox (mode=parcel)
      try {
        const features = await searchParcelByAttribute(p.comune, p.foglio, p.particella);

        if (features.length === 0) throw new Error("No features returned");

        // Remove placeholder
        try { map.removeLayer(placeholderPoly); } catch {}
        parcelLayersRef.current = parcelLayersRef.current.filter(l => l !== placeholderPoly);

        const realCoords: L.LatLngExpression[][] = [];
        let totalMq = 0;
        let firstPoly: L.Polygon | null = null;

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
        setParcelStatuses(prev => ({ ...prev, [p.id]: "placeholder" }));
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [particelle]);

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

      {/* Click mode toggle button — positioned bottom-left above legend */}
      {onAddParticella && (
        <div className="absolute top-3 left-3 z-[1000]">
          <button
            onClick={() => setClickMode(m => !m)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border shadow-md transition-all",
              clickMode
                ? "bg-primary text-primary-foreground border-primary animate-pulse"
                : "bg-card/95 backdrop-blur text-foreground border-border hover:bg-muted"
            )}
            title="Attiva per cliccare sulla mappa e aggiungere una particella"
          >
            <MousePointer size={12} />
            {clickMode ? "Clicca sulla mappa…" : "Aggiungi da mappa"}
          </button>
        </div>
      )}

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
            {bm.icon === "layers" && <Layers size={12} />}
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
        </div>
      )}
    </div>
  );
}
