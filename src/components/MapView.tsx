import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Particella } from "@/types/vincoli";
import { Satellite, Map, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

// Fix Leaflet icon paths for Vite
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl, shadowUrl: iconShadow });

// ──────────────────────────────────────────────────────────────
// WFS query to Agenzia delle Entrate cadastral service
// Returns GeoJSON features for the given parcel identifiers
// ──────────────────────────────────────────────────────────────
export async function fetchCadastralParcel(
  comune: string,
  foglio: string,
  particella: string
): Promise<GeoJSON.Feature | null> {
  const cqlFilter = encodeURIComponent(
    `nationalCadastralReference LIKE '%${foglio}%${particella}%'`
  );
  const url =
    `https://wms.cartografia.agenziaentrate.gov.it/inspire/wfs/ows01.php` +
    `?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature` +
    `&TYPENAMES=CP:CadastralParcel` +
    `&COUNT=5` +
    `&SRSNAME=EPSG:4326` +
    `&OUTPUTFORMAT=application/json` +
    `&CQL_FILTER=${cqlFilter}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.features && json.features.length > 0) return json.features[0];
    return null;
  } catch {
    return null;
  }
}

// Demo fallback polygons (Rome area)
const DEMO_POLYGONS: [number, number][][] = [
  [[41.896, 12.483], [41.898, 12.483], [41.898, 12.487], [41.896, 12.487]],
  [[41.894, 12.490], [41.896, 12.490], [41.896, 12.494], [41.894, 12.494]],
  [[41.900, 12.480], [41.902, 12.480], [41.902, 12.484], [41.900, 12.484]],
];

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

function makeBaselayer(id: BasemapId): L.TileLayer | L.TileLayer.WMS {
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
          attribution: "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ",
          maxZoom: 19,
        }
      );
    case "catasto":
      // Ortofoto base + catasto overlay
      return L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "Esri + Agenzia delle Entrate",
          maxZoom: 19,
          opacity: 0.7,
        }
      );
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
  const parcelLayerRef = useRef<L.FeatureGroup | null>(null);
  const basemapRef = useRef<L.TileLayer | L.TileLayer.WMS | null>(null);
  const catastoOverlayRef = useRef<L.TileLayer.WMS | null>(null);
  const [activeBase, setActiveBase] = useState<BasemapId>("osm");

  // ── Initialize map once ─────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: CENTER,
      zoom: 13,
      zoomControl: false,
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Custom pane for parcel polygons — always above ALL tile/WMS layers
    map.createPane("parcelsPane");
    const parcelsPane = map.getPane("parcelsPane")!;
    parcelsPane.style.zIndex = "650"; // above overlayPane (400) and shadowPane (500)
    parcelsPane.style.pointerEvents = "none";

    // Custom pane for WMS overlays — below parcels but above basemap
    map.createPane("wmsPane");
    const wmsPane = map.getPane("wmsPane")!;
    wmsPane.style.zIndex = "300";

    // Initial basemap
    const base = makeBaselayer("osm");
    base.addTo(map);
    basemapRef.current = base;

    // Catasto WMS overlay
    const catastoWms = L.tileLayer.wms(
      "https://wms.cartografia.agenziaentrate.gov.it/inspire/wms/ows01.php",
      {
        layers: "CP.CadastralParcel",
        format: "image/png",
        transparent: true,
        opacity: 0.75,
        version: "1.3.0",
        attribution: "Agenzia delle Entrate",
        pane: "wmsPane",
      } as L.WMSOptions & { pane: string }
    );
    catastoOverlayRef.current = catastoWms;

    // Other WMS overlays
    const paesaggio = L.tileLayer.wms("https://geodati.gov.it/inspire/wms", {
      layers: "VP.VincoliPaesaggistici",
      format: "image/png",
      transparent: true,
      opacity: 0.45,
      version: "1.3.0",
      errorTileUrl: "",
      pane: "wmsPane",
    } as L.WMSOptions & { pane: string });

    const pai = L.tileLayer.wms(
      "https://wms.cartografia.agenziaentrate.gov.it/inspire/wms/ows01.php",
      {
        layers: "CP.CadastralZoning",
        format: "image/png",
        transparent: true,
        opacity: 0.35,
        version: "1.3.0",
        pane: "wmsPane",
      } as L.WMSOptions & { pane: string }
    );

    const natura = L.tileLayer.wms(
      "https://wms.cartografia.agenziaentrate.gov.it/inspire/wms/ows01.php",
      {
        layers: "CP.CadastralZoning",
        format: "image/png",
        transparent: true,
        opacity: 0.35,
        version: "1.3.0",
        pane: "wmsPane",
      } as L.WMSOptions & { pane: string }
    );

    wmsLayersRef.current = { paesaggio, pai, natura };

    // Parcel feature group — rendered in parcelsPane, always on top
    const fg = L.featureGroup([], { pane: "parcelsPane" } as L.LayerOptions).addTo(map);
    parcelLayerRef.current = fg;

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

    // Remove old basemap
    if (basemapRef.current) {
      map.removeLayer(basemapRef.current);
    }

    // Add new basemap
    const newBase = makeBaselayer(activeBase);
    newBase.addTo(map);
    // Ensure basemap is below everything
    newBase.setZIndex(0);
    basemapRef.current = newBase;

    // Catasto overlay: show when catasto basemap is selected
    const catastoWms = catastoOverlayRef.current;
    if (catastoWms) {
      if (activeBase === "catasto") {
        if (!map.hasLayer(catastoWms)) {
          catastoWms.addTo(map);
          catastoWms.setZIndex(2);
        }
      }
      // Keep it if showCatasto is true, otherwise respect that toggle
    }

  }, [activeBase]);

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

    // For catasto overlay: show if showCatasto OR catasto basemap selected
    toggle(catastoWms, showCatasto || activeBase === "catasto");
    toggle(paesaggio, showVincoliPaesaggistici);
    toggle(pai, showPAI);
    toggle(natura, showNatura2000);

  }, [showCatasto, showVincoliPaesaggistici, showVincoliIdrogeologici, showNatura2000, showPAI, activeBase]);

  // ── Draw parcels (WFS + demo fallback) ─────────────────────
  useEffect(() => {
    const map = mapRef.current;
    const fg = parcelLayerRef.current;
    if (!map || !fg) return;

    fg.clearLayers();

    if (particelle.length === 0) {
      map.setView(CENTER, 13);
      return;
    }

    const geometries: Record<string, L.LatLngExpression[][]> = {};

    const drawParcel = async (p: Particella, idx: number) => {
      let coords: L.LatLngExpression[][] | null = null;

      // Try real WFS first
      try {
        const feature = await fetchCadastralParcel(p.comune, p.foglio, p.particella);
        if (feature?.geometry) {
          const geom = feature.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon;
          if (geom.type === "Polygon") {
            coords = geom.coordinates.map(ring =>
              ring.map(([lng, lat]) => [lat, lng] as L.LatLngExpression)
            );
          } else if (geom.type === "MultiPolygon") {
            coords = geom.coordinates.flatMap(poly =>
              poly.map(ring => ring.map(([lng, lat]) => [lat, lng] as L.LatLngExpression))
            );
          }
        }
      } catch {
        // fallback below
      }

      // Demo fallback
      if (!coords) {
        const base = DEMO_POLYGONS[idx % DEMO_POLYGONS.length];
        coords = [base.map(([lat, lng]) => [
          lat + idx * 0.003,
          lng + idx * 0.003,
        ] as L.LatLngExpression)];
      }

      const color = p.color || "#3b82f6";
      const polygon = L.polygon(coords, {
        color,
        fillColor: color,
        fillOpacity: 0.3,
        weight: 3,
        pane: "parcelsPane",
      });

      polygon.bindTooltip(
        `<strong>${p.comune}</strong><br>Fg. ${p.foglio} / Part. ${p.particella}`,
        { permanent: false, direction: "center", className: "leaflet-custom-tooltip" }
      );

      polygon.addTo(fg);
      geometries[p.id] = coords;
    };

    Promise.all(particelle.map((p, i) => drawParcel(p, i))).then(() => {
      if (fg.getLayers().length > 0) {
        try {
          map.fitBounds(fg.getBounds(), { padding: [40, 40] });
        } catch {
          map.setView(CENTER, 14);
        }
      }
      onParcelGeometries?.(geometries);
    });
  }, [particelle, onParcelGeometries]);

  return (
    <div className="h-full w-full relative">
      <div ref={containerRef} className="h-full w-full" />

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
        <div className="absolute bottom-8 left-3 z-[1000] bg-card/95 backdrop-blur border border-border rounded-lg p-3 shadow-lg max-w-[200px]">
          <p className="text-xs font-semibold text-foreground mb-2">Particelle</p>
          {particelle.map(p => (
            <div key={p.id} className="flex items-center gap-2 mb-1">
              <div
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: p.color, border: `2px solid ${p.color}` }}
              />
              <span className="text-xs text-muted-foreground truncate">
                {p.comune} {p.foglio}/{p.particella}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
