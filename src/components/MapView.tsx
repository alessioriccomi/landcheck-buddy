import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, WMSTileLayer, FeatureGroup, Polygon, Tooltip, ZoomControl } from "react-leaflet";
import { LatLngTuple } from "leaflet";
import "leaflet/dist/leaflet.css";
import { Particella } from "@/types/vincoli";

// Fix Leaflet default icon issue with webpack/vite
import L from "leaflet";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
const DefaultIcon = L.icon({ iconUrl, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

// Demo polygons for visual representation
const DEMO_POLYGONS: Record<string, LatLngTuple[]> = {
  "0": [[41.896, 12.483], [41.898, 12.483], [41.898, 12.487], [41.896, 12.487]],
  "1": [[41.894, 12.490], [41.896, 12.490], [41.896, 12.494], [41.894, 12.494]],
  "2": [[41.900, 12.480], [41.902, 12.480], [41.902, 12.484], [41.900, 12.484]],
};

const CENTER_COORDS: LatLngTuple = [41.896, 12.486];

interface MapViewProps {
  particelle: Particella[];
  showCatasto: boolean;
  showVincoliPaesaggistici: boolean;
  showVincoliIdrogeologici: boolean;
  showNatura2000: boolean;
  showPAI: boolean;
}

export function MapView({ particelle, showCatasto, showVincoliPaesaggistici, showVincoliIdrogeologici, showNatura2000, showPAI }: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (particelle.length > 0 && mapRef.current) {
      mapRef.current.setView(CENTER_COORDS, 15);
    }
  }, [particelle]);

  return (
    <div className="h-full w-full relative">
      <MapContainer
        center={CENTER_COORDS}
        zoom={13}
        className="h-full w-full"
        zoomControl={false}
        ref={mapRef}
      >
        <ZoomControl position="bottomright" />

        {/* Base tile layer */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          opacity={0.85}
        />

        {/* Catasto WMS - Agenzia delle Entrate */}
        {showCatasto && (
          <WMSTileLayer
            url="https://wms.cartografia.agenziaentrate.gov.it/inspire/wms/ows01.php"
            layers="CP.CadastralParcel"
            format="image/png"
            transparent={true}
            opacity={0.7}
            version="1.3.0"
            attribution="Agenzia delle Entrate"
          />
        )}

        {/* Vincoli paesaggistici - Geoportale Nazionale */}
        {showVincoliPaesaggistici && (
          <WMSTileLayer
            url="https://wms.cartografia.agenziaentrate.gov.it/inspire/wms/ows01.php"
            layers="CP.CadastralZoning"
            format="image/png"
            transparent={true}
            opacity={0.5}
            version="1.3.0"
          />
        )}

        {/* Parcel polygons */}
        {particelle.map((p, idx) => {
          const coords = DEMO_POLYGONS[String(idx % Object.keys(DEMO_POLYGONS).length)];
          const offsetCoords = coords.map(([lat, lng]: LatLngTuple) => [lat + idx * 0.001, lng + idx * 0.001] as LatLngTuple);
          return (
            <Polygon
              key={p.id}
              positions={offsetCoords}
              pathOptions={{
                color: p.color || "#3b82f6",
                fillColor: p.color || "#3b82f6",
                fillOpacity: 0.2,
                weight: 2.5,
                dashArray: undefined,
              }}
            >
              <Tooltip permanent direction="center" className="leaflet-parcel-tooltip">
                <span className="font-semibold text-xs">{p.comune}<br />Fg. {p.foglio} / Part. {p.particella}</span>
              </Tooltip>
            </Polygon>
          );
        })}
      </MapContainer>

      {/* Map legend */}
      {particelle.length > 0 && (
        <div className="absolute bottom-8 left-3 z-[1000] bg-card/95 backdrop-blur border border-border rounded-lg p-3 shadow-lg max-w-[200px]">
          <p className="text-xs font-semibold text-foreground mb-2">Particelle selezionate</p>
          {particelle.map(p => (
            <div key={p.id} className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: p.color, opacity: 0.8, border: `2px solid ${p.color}` }} />
              <span className="text-xs text-muted-foreground truncate">{p.comune} {p.foglio}/{p.particella}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
