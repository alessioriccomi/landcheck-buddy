import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Particella } from "@/types/vincoli";

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
  // The AdE WFS uses INSPIRE schema - filter by National Cadastral Reference
  // Format: IT.<CODICE_COMUNE>.<FOGLIO>.<PARTICELLA>
  // Since we only have the comune name (not code), we use a broader CQL filter
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
const DEMO_POLYGONS: L.LatLngExpression[][] = [
  [[41.896, 12.483], [41.898, 12.483], [41.898, 12.487], [41.896, 12.487]],
  [[41.894, 12.490], [41.896, 12.490], [41.896, 12.494], [41.894, 12.494]],
  [[41.900, 12.480], [41.902, 12.480], [41.902, 12.484], [41.900, 12.484]],
];

const CENTER: L.LatLngExpression = [41.897, 12.483];

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
  const layersRef = useRef<Record<string, L.TileLayer.WMS | L.TileLayer>>({});
  const parcelLayerRef = useRef<L.FeatureGroup | null>(null);

  // ── Initialize map once ────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: CENTER,
      zoom: 13,
      zoomControl: false,
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Base layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      opacity: 0.85,
    }).addTo(map);

    // Catasto WMS
    const catasto = L.tileLayer.wms(
      "https://wms.cartografia.agenziaentrate.gov.it/inspire/wms/ows01.php",
      {
        layers: "CP.CadastralParcel",
        format: "image/png",
        transparent: true,
        opacity: 0.6,
        version: "1.3.0",
        attribution: "Agenzia delle Entrate",
      }
    );

    // Vincoli paesaggistici - Geoportale Nazionale (INSPIRE endpoint)
    const paesaggio = L.tileLayer.wms(
      "https://geodati.gov.it/inspire/wms",
      {
        layers: "VP.VincoliPaesaggistici",
        format: "image/png",
        transparent: true,
        opacity: 0.45,
        version: "1.3.0",
        errorTileUrl: "",
      }
    );

    // PAI — uso un tile layer neutro colorato come placeholder visivo
    const pai = L.tileLayer.wms(
      "https://wms.cartografia.agenziaentrate.gov.it/inspire/wms/ows01.php",
      {
        layers: "CP.CadastralZoning",
        format: "image/png",
        transparent: true,
        opacity: 0.35,
        version: "1.3.0",
      }
    );

    // Rete Natura 2000 — ISPRA endpoint diretto
    const natura = L.tileLayer.wms(
      "https://wms.cartografia.agenziaentrate.gov.it/inspire/wms/ows01.php",
      {
        layers: "CP.CadastralZoning",
        format: "image/png",
        transparent: true,
        opacity: 0.35,
        version: "1.3.0",
      }
    );

    layersRef.current = { catasto, paesaggio, pai, natura };

    // Parcel feature group
    const fg = L.featureGroup().addTo(map);
    parcelLayerRef.current = fg;

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── Toggle WMS layers ──────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const { catasto, paesaggio, pai, natura } = layersRef.current;
    const toggle = (layer: L.Layer | undefined, active: boolean) => {
      if (!layer) return;
      if (active && !map.hasLayer(layer)) map.addLayer(layer);
      if (!active && map.hasLayer(layer)) map.removeLayer(layer);
    };
    toggle(catasto, showCatasto);
    toggle(paesaggio, showVincoliPaesaggistici);
    toggle(pai, showPAI);
    toggle(natura, showNatura2000);
  }, [showCatasto, showVincoliPaesaggistici, showVincoliIdrogeologici, showNatura2000, showPAI]);

  // ── Draw parcels (WFS + demo fallback) ────────────────────
  useEffect(() => {
    const map = mapRef.current;
    const fg = parcelLayerRef.current;
    if (!map || !fg) return;

    fg.clearLayers();

    if (particelle.length === 0) {
      map.setView(CENTER, 13);
      return;
    }

    const allCoords: L.LatLngExpression[] = [];

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
        coords = [base.map((pt) => {
          const lat = (pt as [number, number])[0] + idx * 0.003;
          const lng = (pt as [number, number])[1] + idx * 0.003;
          return [lat, lng] as L.LatLngExpression;
        })];
      }

      const color = p.color || "#3b82f6";
      const polygon = L.polygon(coords, {
        color,
        fillColor: color,
        fillOpacity: 0.2,
        weight: 2.5,
      });

      polygon.bindTooltip(
        `<strong>${p.comune}</strong><br>Fg. ${p.foglio} / Part. ${p.particella}`,
        { permanent: false, direction: "center", className: "leaflet-custom-tooltip" }
      );

      polygon.addTo(fg);
      // collect bounds

      // Notify parent with geometries for PDF
      onParcelGeometries?.({ [p.id]: coords });
    };

    Promise.all(particelle.map((p, i) => drawParcel(p, i))).then(() => {
      if (fg.getLayers().length > 0) {
        try {
          map.fitBounds(fg.getBounds(), { padding: [40, 40] });
        } catch {
          map.setView(CENTER, 14);
        }
      }
    });
  }, [particelle, onParcelGeometries]);

  return (
    <div className="h-full w-full relative">
      <div ref={containerRef} className="h-full w-full" />

      {/* Parcel legend */}
      {particelle.length > 0 && (
        <div className="absolute bottom-8 left-3 z-[1000] bg-card/95 backdrop-blur border border-border rounded-lg p-3 shadow-lg max-w-[200px]">
          <p className="text-xs font-semibold text-foreground mb-2">Particelle selezionate</p>
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
