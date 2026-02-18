import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Particella } from "@/types/vincoli";
import { Satellite, Map, Layers, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Fix Leaflet icon paths for Vite
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl, shadowUrl: iconShadow });

// ── Supabase project config ────────────────────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

// ──────────────────────────────────────────────────────────────
// Dizionario coordinate capoluoghi e comuni italiani principali
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
  "giugliano in campania": [40.9308, 14.1946],
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
};

function getComuneCoords(comune: string): [number, number] {
  const key = comune.toLowerCase().trim();
  return COMUNI_COORDS[key] ?? [41.9028, 12.4964];
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

// Fetch real parcel geometries from the WFS proxy edge function
async function fetchParcelGeometry(
  lat: number,
  lng: number,
  radius = 0.003
): Promise<GeoJSON.Feature[]> {
  const url =
    `${SUPABASE_URL}/functions/v1/wfs-proxy` +
    `?lat=${lat}&lng=${lng}&radius=${radius}`;

  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  if (!resp.ok) throw new Error(`WFS proxy error: ${resp.status}`);
  const geojson: GeoJSON.FeatureCollection = await resp.json();
  return geojson.features ?? [];
}

const CENTER: L.LatLngExpression = [41.897, 12.483];

// ── Basemap definitions ────────────────────────────────────────
type BasemapId = "osm" | "satellite" | "catasto";

interface BasemapDef {
  id: BasemapId;
  label: string;
  icon: "map" | "satellite" | "layers";
}

const BASEMAPS: BasemapDef[] = [
  { id: "osm", label: "Mappa", icon: "map" },
  { id: "satellite", label: "Satellite", icon: "satellite" },
  { id: "catasto", label: "Catasto", icon: "layers" },
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
    case "catasto":
      // OSM as base + catasto WMS overlay added separately
      return L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
        opacity: 0.55,
      });
  }
}

interface MapViewProps {
  particelle: Particella[];
  showCatasto: boolean;
  showVincoliPaesaggistici: boolean;
  showVincoliIdrogeologici: boolean;
  showNatura2000: boolean;
  showPAI: boolean;
  onParcelGeometries?: (geoms: Record<string, L.LatLngExpression[][]>) => void;
}

type ParcelStatus = "idle" | "loading" | "real" | "placeholder";

export function MapView({
  particelle,
  showCatasto,
  showVincoliPaesaggistici,
  showVincoliIdrogeologici,
  showNatura2000,
  showPAI,
  onParcelGeometries,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const wmsLayersRef = useRef<Record<string, L.TileLayer.WMS | L.TileLayer>>({});
  const parcelLayersRef = useRef<L.Layer[]>([]);
  const basemapRef = useRef<L.TileLayer | null>(null);
  const catastoOverlayRef = useRef<L.TileLayer.WMS | null>(null);
  const [activeBase, setActiveBase] = useState<BasemapId>("osm");
  const [parcelStatuses, setParcelStatuses] = useState<Record<string, ParcelStatus>>({});

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

    // ── Catasto WMS overlay ──────────────────────────────────
    // No crossOrigin set → browser loads tiles as plain <img>, no CORS block
    const catastoWms = L.tileLayer.wms(
      "https://wms.cartografia.agenziaentrate.gov.it/inspire/wms/ows01.php",
      {
        ...wmsCommonOptions,
        layers: "CP.CadastralParcel",
        opacity: 0.85,
        attribution: "Agenzia delle Entrate",
      } as L.WMSOptions & { pane: string }
    );
    catastoOverlayRef.current = catastoWms;

    const zoningOpts = { ...wmsCommonOptions, layers: "CP.CadastralZoning", opacity: 0.35 };
    const paesaggio = L.tileLayer.wms(
      "https://wms.cartografia.agenziaentrate.gov.it/inspire/wms/ows01.php",
      zoningOpts as L.WMSOptions & { pane: string }
    );
    const pai = L.tileLayer.wms(
      "https://wms.cartografia.agenziaentrate.gov.it/inspire/wms/ows01.php",
      zoningOpts as L.WMSOptions & { pane: string }
    );
    const natura = L.tileLayer.wms(
      "https://wms.cartografia.agenziaentrate.gov.it/inspire/wms/ows01.php",
      zoningOpts as L.WMSOptions & { pane: string }
    );

    wmsLayersRef.current = { paesaggio, pai, natura };
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── Switch basemap ──────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (basemapRef.current) map.removeLayer(basemapRef.current);

    const newBase = makeBaselayer(activeBase);
    newBase.addTo(map);
    basemapRef.current = newBase;

    const catastoWms = catastoOverlayRef.current;
    if (catastoWms) {
      const shouldShow = showCatasto || activeBase === "catasto";
      if (shouldShow && !map.hasLayer(catastoWms)) catastoWms.addTo(map);
      else if (!shouldShow && map.hasLayer(catastoWms)) map.removeLayer(catastoWms);
    }
  }, [activeBase, showCatasto]);

  // ── Toggle WMS overlays ─────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const catastoWms = catastoOverlayRef.current;
    const { paesaggio, pai, natura } = wmsLayersRef.current;

    const toggle = (layer: L.Layer | undefined | null, active: boolean) => {
      if (!layer) return;
      if (active && !map.hasLayer(layer)) map.addLayer(layer);
      if (!active && map.hasLayer(layer)) map.removeLayer(layer);
    };

    toggle(catastoWms, showCatasto || activeBase === "catasto");
    toggle(paesaggio, showVincoliPaesaggistici);
    toggle(pai, showPAI);
    toggle(natura, showNatura2000);
  }, [showCatasto, showVincoliPaesaggistici, showVincoliIdrogeologici, showNatura2000, showPAI, activeBase]);

  // ── Draw parcels ────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove previous layers
    parcelLayersRef.current.forEach(layer => { try { map.removeLayer(layer); } catch {} });
    parcelLayersRef.current = [];

    if (particelle.length === 0) {
      map.setView(CENTER, 13);
      return;
    }

    const geometries: Record<string, L.LatLngExpression[][]> = {};
    const allPlaceholderPolygons: L.Polygon[] = [];

    // 1. Draw placeholder polygons immediately (one per parcel)
    particelle.forEach((p, idx) => {
      const center = getComuneCoords(p.comune);
      const rawCoords = makePlaceholderPolygon(center, idx);
      const coords: L.LatLngExpression[][] = [
        rawCoords.map(([lat, lng]) => [lat, lng] as L.LatLngExpression),
      ];

      const color = p.color || "#3b82f6";

      const polygon = L.polygon(coords, {
        color,
        fillColor: color,
        fillOpacity: 0.35,
        weight: 3,
        opacity: 0.8,
        pane: "parcelsPane",
        dashArray: "8 5",
      });

      polygon.bindTooltip(
        `<strong>${p.comune}</strong><br>` +
        `Fg. ${p.foglio} / Part. ${p.particella}<br>` +
        `<em style="font-size:10px;opacity:0.7">⚠ Perimetro stimato</em>`,
        { permanent: false, direction: "top", className: "leaflet-custom-tooltip" }
      );

      polygon.addTo(map);
      geometries[p.id] = coords;
      allPlaceholderPolygons.push(polygon);
    });

    parcelLayersRef.current = [...allPlaceholderPolygons];

    // Center on placeholders immediately
    try {
      const group = L.featureGroup(allPlaceholderPolygons);
      const bounds = group.getBounds();
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
    } catch {
      map.setView(CENTER, 14);
    }

    onParcelGeometries?.(geometries);

    // Mark all as loading
    const loadingStatuses: Record<string, ParcelStatus> = {};
    particelle.forEach(p => { loadingStatuses[p.id] = "loading"; });
    setParcelStatuses(loadingStatuses);

    // 2. Fetch real geometries from WFS proxy for each parcel
    particelle.forEach(async (p, idx) => {
      const [lat, lng] = getComuneCoords(p.comune);
      const color = p.color || "#3b82f6";
      const placeholderPoly = allPlaceholderPolygons[idx];

      try {
        const features = await fetchParcelGeometry(lat, lng, 0.005);

        if (features.length === 0) throw new Error("No features returned");

        // Remove placeholder for this parcel
        try { map.removeLayer(placeholderPoly); } catch {}
        parcelLayersRef.current = parcelLayersRef.current.filter(l => l !== placeholderPoly);

        const realCoords: L.LatLngExpression[][] = [];

        features.forEach(feat => {
          if (!feat.geometry || feat.geometry.type !== "Polygon") return;
          const rings = (feat.geometry as GeoJSON.Polygon).coordinates;

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

          poly.bindTooltip(
            `<strong>${p.comune}</strong><br>` +
            `Fg. ${p.foglio} / Part. ${p.particella}<br>` +
            `<em style="font-size:10px;color:var(--color-green-500)">✓ Perimetro reale (WFS)</em>`,
            { permanent: false, direction: "top", className: "leaflet-custom-tooltip" }
          );

          poly.addTo(map);
          parcelLayersRef.current.push(poly);
        });

        geometries[p.id] = realCoords;
        onParcelGeometries?.(geometries);
        setParcelStatuses(prev => ({ ...prev, [p.id]: "real" }));
      } catch (err) {
        console.warn(`WFS fetch failed for ${p.comune}:`, err);
        setParcelStatuses(prev => ({ ...prev, [p.id]: "placeholder" }));
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [particelle]);

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

      {/* Parcel legend */}
      {particelle.length > 0 && (
        <div className="absolute bottom-8 left-3 z-[1000] bg-card/95 backdrop-blur border border-border rounded-lg p-3 shadow-lg max-w-[220px]">
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
                <span className="text-xs text-muted-foreground truncate flex-1">
                  {p.comune} {p.foglio}/{p.particella}
                </span>
                {status === "loading" && <Loader2 size={10} className="animate-spin text-primary flex-shrink-0" />}
                {status === "real" && <span className="text-[10px] text-green-500 flex-shrink-0">✓</span>}
              </div>
            );
          })}
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
