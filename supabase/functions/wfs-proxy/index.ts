import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Comuni JSON cache ────────────────────────────────────────
const COMUNI_JSON_URL =
  "https://raw.githubusercontent.com/matteocontrini/comuni-json/master/comuni.json";

interface ComuneRecord {
  nome: string;
  codiceCatastale: string;
  regione?: { nome: string };
  coordinate?: { lat: number; lng: number };
}

let comuniCache: ComuneRecord[] | null = null;

async function fetchComuniJson(): Promise<ComuneRecord[]> {
  if (comuniCache) return comuniCache;
  console.log("Fetching comuni-json (first time)...");
  const resp = await fetch(COMUNI_JSON_URL, {
    headers: { "User-Agent": "GeoVincoli/1.0" },
  });
  if (!resp.ok) throw new Error(`Failed to fetch comuni-json: ${resp.status}`);
  const data = await resp.json();
  comuniCache = data as ComuneRecord[];
  console.log(`Loaded ${comuniCache.length} comuni from JSON`);
  return comuniCache;
}

// Lookup comune name → { codiceCatastale, regione, lat, lng }
async function lookupComune(comuneName: string): Promise<{ codice: string; regione: string; lat?: number; lng?: number } | null> {
  const comuni = await fetchComuniJson();
  const normalize = (s: string) => s.toUpperCase().trim().replace(/[-\s]+/g, " ");
  const search = normalize(comuneName);

  let found = comuni.find((c) => normalize(c.nome) === search);
  if (!found) found = comuni.find((c) => normalize(c.nome).includes(search));
  if (!found) found = comuni.find((c) => search.includes(normalize(c.nome)) && c.nome.length > 4);

  if (!found) {
    console.warn("Comune not found in comuni-json:", comuneName);
    return null;
  }

  console.log(`Comune lookup: "${comuneName}" → codice ${found.codiceCatastale}, regione ${found.regione?.nome}, coords ${found.coordinate?.lat},${found.coordinate?.lng}`);
  return {
    codice: found.codiceCatastale,
    regione: found.regione?.nome ?? "",
    lat: found.coordinate?.lat,
    lng: found.coordinate?.lng,
  };
}

// ── Geocode via Nominatim (with retry) ──────────────────────────
async function geocodeViaProxy(
  comuneName: string,
  retries = 3
): Promise<{ lat: number; lon: number; bbox: [number, number, number, number] } | null> {
  for (let attempt = 0; attempt < retries; attempt++) {
    if (attempt > 0) {
      console.log(`Geocode retry ${attempt + 1} for "${comuneName}"...`);
      await new Promise(r => setTimeout(r, 1200 * attempt)); // wait 1.2s, 2.4s
    }
    try {
      const q = encodeURIComponent(`${comuneName}, Italy`);
      const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=it`;
      const resp = await fetch(url, { headers: { "User-Agent": "GeoVincoli/1.0" } });
      if (!resp.ok) {
        console.warn(`Nominatim ${resp.status} on attempt ${attempt + 1}`);
        continue;
      }
      const data = await resp.json();
      if (!data?.length) {
        console.warn(`Nominatim empty on attempt ${attempt + 1}`);
        continue;
      }
      const r = data[0];
      const bbox = r.boundingbox
        ? ([
            parseFloat(r.boundingbox[0]),
            parseFloat(r.boundingbox[1]),
            parseFloat(r.boundingbox[2]),
            parseFloat(r.boundingbox[3]),
          ] as [number, number, number, number])
        : undefined;
      return {
        lat: parseFloat(r.lat),
        lon: parseFloat(r.lon),
        bbox: bbox ?? [parseFloat(r.lat) - 0.05, parseFloat(r.lat) + 0.05, parseFloat(r.lon) - 0.05, parseFloat(r.lon) + 0.05],
      };
    } catch (err) {
      console.warn(`Geocode attempt ${attempt + 1} failed:`, err);
    }
  }
  return null;
}

// ── GML parsing helpers ────────────────────────────────────────
function parseGMLCoordinates(posListStr: string): [number, number][] {
  const nums = posListStr.trim().split(/\s+/).map(Number);
  const coords: [number, number][] = [];
  for (let i = 0; i < nums.length - 1; i += 2) {
    coords.push([nums[i + 1], nums[i]]); // → [lng, lat] for GeoJSON
  }
  return coords;
}

// Parse CadastralZoning GML → features with label and nationalRef
function gmlToGeoJSONZoning(gmlText: string): GeoJSON.Feature[] {
  const features: GeoJSON.Feature[] = [];
  // Try both CP: and cp: namespace prefixes
  const featureRegex = /<(?:CP|cp):CadastralZoning[\s\S]*?<\/(?:CP|cp):CadastralZoning>/gi;
  let featureMatch: RegExpExecArray | null;
  let debugLogged = false;

  while ((featureMatch = featureRegex.exec(gmlText)) !== null) {
    const featureXml = featureMatch[0];
    if (!debugLogged) {
      console.log(`[ZoningGML] First feature sample (500 chars): ${featureXml.substring(0, 500)}`);
      debugLogged = true;
    }
    // Case-insensitive matching for label and nationalRef
    const labelMatch = featureXml.match(/<(?:CP|cp):label>(.*?)<\/(?:CP|cp):label>/i);
    const label = labelMatch ? labelMatch[1] : "";
    const nationalIdMatch = featureXml.match(
      /<(?:CP|cp):nationalCadastralReference>(.*?)<\/(?:CP|cp):nationalCadastralReference>/i
    );
    const nationalRef = nationalIdMatch ? nationalIdMatch[1] : "";
    const levelMatch = featureXml.match(/<(?:CP|cp):level[^>]*>(.*?)<\/(?:CP|cp):level>/i);
    const level = levelMatch ? levelMatch[1] : "";

    const rings: [number, number][][] = [];
    const posListRegex = /<gml:posList[^>]*>([\s\S]*?)<\/gml:posList>/g;
    let posMatch: RegExpExecArray | null;
    while ((posMatch = posListRegex.exec(featureXml)) !== null) {
      const coords = parseGMLCoordinates(posMatch[1]);
      if (coords.length >= 3) rings.push(coords);
    }

    if (rings.length === 0) continue;

    features.push({
      type: "Feature",
      geometry: { type: "Polygon", coordinates: rings },
      properties: { label, nationalRef, level },
    });
  }

  return features;
}

// Compute bbox of a GeoJSON polygon feature → [south, north, west, east]
function featureBbox(feat: GeoJSON.Feature): [number, number, number, number] {
  let south = 90,
    north = -90,
    west = 180,
    east = -180;
  if (feat.geometry?.type === "Polygon") {
    for (const ring of (feat.geometry as GeoJSON.Polygon).coordinates) {
      for (const [lng, lat] of ring) {
        if (lat < south) south = lat;
        if (lat > north) north = lat;
        if (lng < west) west = lng;
        if (lng > east) east = lng;
      }
    }
  }
  return [south, north, west, east];
}

// Decode nationalCadastralReference → { foglio, particella }
function decodeNationalRef(ref: string): { foglio: string; particella: string } | null {
  if (!ref) return null;
  const dotIdx = ref.indexOf(".");
  if (dotIdx < 0) return null;
  const particella = ref.substring(dotIdx + 1);
  const codePart = ref.substring(0, dotIdx);
  if (codePart.length <= 4) return null;
  const foglioEncoded = codePart.substring(4);
  let foglioNum: number;
  if (foglioEncoded.length >= 5 && /^\d{4}$/.test(foglioEncoded.substring(1, 5))) {
    foglioNum = parseInt(foglioEncoded.substring(1, 5), 10);
  } else {
    const digits = foglioEncoded.replace(/[^0-9]/g, "");
    foglioNum = parseInt(digits, 10);
  }
  if (isNaN(foglioNum)) return null;
  return { foglio: String(foglioNum), particella };
}

function gmlToGeoJSON(gmlText: string): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  const featureRegex = /<CP:CadastralParcel[\s\S]*?<\/CP:CadastralParcel>/g;
  let featureMatch: RegExpExecArray | null;

  while ((featureMatch = featureRegex.exec(gmlText)) !== null) {
    const featureXml = featureMatch[0];
    const idMatch = featureXml.match(
      /<(?:base|CP):(?:localId|inspireId_localId)>(.*?)<\/(?:base|CP):(?:localId|inspireId_localId)>/i
    );
    const localId = idMatch ? idMatch[1] : "unknown";
    const labelMatch = featureXml.match(/<CP:label>(.*?)<\/CP:label>/i);
    const label = labelMatch ? labelMatch[1] : "";
    const nationalIdMatch = featureXml.match(
      /<CP:nationalCadastralReference>(.*?)<\/CP:nationalCadastralReference>/i
    );
    const nationalRef = nationalIdMatch ? nationalIdMatch[1] : "";
    const adminMatch = featureXml.match(/<CP:administrativeUnit>(.*?)<\/CP:administrativeUnit>/i);
    const adminUnit = adminMatch ? adminMatch[1] : "";

    const rings: [number, number][][] = [];
    const posListRegex = /<gml:posList[^>]*>([\s\S]*?)<\/gml:posList>/g;
    let posMatch: RegExpExecArray | null;
    while ((posMatch = posListRegex.exec(featureXml)) !== null) {
      const coords = parseGMLCoordinates(posMatch[1]);
      if (coords.length >= 3) rings.push(coords);
    }

    if (rings.length === 0) continue;

    const decoded = decodeNationalRef(nationalRef);
    const props: Record<string, string> = { localId, label, nationalRef, adminUnit };
    if (decoded) {
      props._foglio = decoded.foglio;
      props._particella = decoded.particella;
    }

    features.push({
      type: "Feature",
      geometry: { type: "Polygon", coordinates: rings },
      properties: props,
    });
  }

  return { type: "FeatureCollection", features };
}

function featureMatchesFoglioParticella(
  f: GeoJSON.Feature,
  foglioStr: string,
  particellaStr: string
): boolean {
  const props = f.properties ?? {};
  if (props._foglio && props._particella) {
    if (
      parseInt(props._foglio, 10) === parseInt(foglioStr, 10) &&
      parseInt(props._particella, 10) === parseInt(particellaStr, 10)
    )
      return true;
  }
  const ref: string = props.nationalRef ?? "";
  const decoded = decodeNationalRef(ref);
  if (decoded) {
    if (
      parseInt(decoded.foglio, 10) === parseInt(foglioStr, 10) &&
      parseInt(decoded.particella, 10) === parseInt(particellaStr, 10)
    )
      return true;
  }
  const lbl: string = props.label ?? "";
  const lblParts = lbl.split("/");
  if (lblParts.length === 2) {
    if (
      parseInt(lblParts[0], 10) === parseInt(foglioStr, 10) &&
      parseInt(lblParts[1], 10) === parseInt(particellaStr, 10)
    )
      return true;
  }
  return false;
}

// ── Point-in-polygon (ray casting) ──────────────────────────────
function pointInPolygon(point: [number, number], ring: [number, number][]): boolean {
  const [px, py] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function findFeatureContainingPoint(
  features: GeoJSON.Feature[],
  lat: number,
  lon: number
): GeoJSON.Feature | null {
  const point: [number, number] = [lon, lat];
  for (const feat of features) {
    if (feat.geometry?.type !== "Polygon") continue;
    const rings = (feat.geometry as GeoJSON.Polygon).coordinates;
    if (rings.length > 0 && pointInPolygon(point, rings[0] as [number, number][])) {
      let inHole = false;
      for (let h = 1; h < rings.length; h++) {
        if (pointInPolygon(point, rings[h] as [number, number][])) {
          inHole = true;
          break;
        }
      }
      if (!inHole) return feat;
    }
  }
  return null;
}

// ── WFS queries ────────────────────────────────────────────────
async function wfsQueryZoning(
  lat: number,
  lon: number,
  delta: number
): Promise<GeoJSON.Feature[]> {
  const wfsUrl =
    `https://wfs.cartografia.agenziaentrate.gov.it/inspire/wfs/owfs01.php` +
    `?language=ita&SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature` +
    `&TYPENAMES=CP:CadastralZoning` +
    `&SRSNAME=urn:ogc:def:crs:EPSG::6706` +
    `&BBOX=${lat - delta},${lon - delta},${lat + delta},${lon + delta}` +
    `&COUNT=200`;

  const resp = await fetch(wfsUrl, {
    headers: {
      Accept: "application/xml, text/xml",
      "User-Agent": "Mozilla/5.0 (compatible; LandcheckProxy/1.0)",
    },
  });
  if (!resp.ok) {
    const body = await resp.text();
    console.warn(`WFS zoning ${resp.status} at [${lat.toFixed(4)},${lon.toFixed(4)}]: ${body.substring(0, 200)}`);
    throw new Error(`WFS zoning ${resp.status}`);
  }
  const gml = await resp.text();
  const features = gmlToGeoJSONZoning(gml);
  if (features.length > 0) {
    const refs = features.slice(0, 5).map(f => `${f.properties?.label}(${f.properties?.nationalRef})`).join(", ");
    console.log(`Zoning at [${lat.toFixed(4)},${lon.toFixed(4)}] d=${delta}: ${features.length} found: ${refs}`);
  }
  return features;
}

async function wfsQueryBbox(
  lat: number,
  lon: number,
  delta = 0.0003,
  count = 50
): Promise<GeoJSON.FeatureCollection> {
  const wfsUrl =
    `https://wfs.cartografia.agenziaentrate.gov.it/inspire/wfs/owfs01.php` +
    `?language=ita&SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature` +
    `&TYPENAMES=CP:CadastralParcel` +
    `&SRSNAME=urn:ogc:def:crs:EPSG::6706` +
    `&BBOX=${lat - delta},${lon - delta},${lat + delta},${lon + delta}` +
    `&COUNT=${count}`;

  const resp = await fetch(wfsUrl, {
    headers: {
      Accept: "application/xml, text/xml",
      "User-Agent": "Mozilla/5.0 (compatible; LandcheckProxy/1.0)",
    },
  });
  if (!resp.ok) throw new Error(`WFS ${resp.status}`);
  const gml = await resp.text();
  return gmlToGeoJSON(gml);
}

// ── Zoning + focused WFS parcel search ──────────────────────────
// Step 1: Find the target foglio polygon via CadastralZoning spiral scan
// Step 2: Search CadastralParcel within that foglio's bbox
async function zoningParcelSearch(
  codiceComune: string,
  foglio: string,
  particella: string,
  comuneBbox: [number, number, number, number]
): Promise<GeoJSON.Feature[]> {
  const targetFoglio = parseInt(foglio, 10);
  const foglioPadded = String(targetFoglio).padStart(4, "0");
  const [south, north, west, east] = comuneBbox;
  const centerLat = (south + north) / 2;
  const centerLon = (west + east) / 2;

  console.log(`Zoning search: ${codiceComune} fg=${foglio} part=${particella}`);

  // Phase 1: Find the foglio zoning polygon via expanding bbox from center
  let targetZoning: GeoJSON.Feature | null = null;
  const allZonings = new Map<string, GeoJSON.Feature>();

  // Try progressive deltas from center
  for (const delta of [0.02, 0.04, 0.06, 0.08, 0.1]) {
    try {
      const features = await wfsQueryZoning(centerLat, centerLon, delta);
      for (const f of features) {
        const ref = f.properties?.nationalRef ?? "";
        const label = f.properties?.label ?? "";
        const key = ref || label;
        if (key && !allZonings.has(key)) allZonings.set(key, f);

        // Match foglio by label or nationalRef
        const labelNum = parseInt(label, 10);
        if (labelNum === targetFoglio) {
          targetZoning = f;
          console.log(`Found target foglio ${targetFoglio} via label at delta=${delta}`);
          break;
        }
        // Check nationalRef contains foglio code
        if (ref.includes(`_${foglioPadded}`) || ref.includes(`_${foglioPadded.replace(/^0+/, "")}`)) {
          targetZoning = f;
          console.log(`Found target foglio ${targetFoglio} via nationalRef=${ref} at delta=${delta}`);
          break;
        }
      }
      if (targetZoning) break;
    } catch (err) {
      console.warn(`Zoning query delta=${delta} failed:`, err);
    }
  }

  // If not found from center, try grid scan of the entire bbox
  if (!targetZoning) {
    console.log(`Foglio ${targetFoglio} not near center, scanning full bbox...`);
    const spacing = 0.03;
    const scanPoints: [number, number][] = [];
    for (let lat = south; lat <= north; lat += spacing) {
      for (let lon = west; lon <= east; lon += spacing) {
        scanPoints.push([lat, lon]);
      }
    }
    // Exclude center area (already searched)
    const filtered = scanPoints.filter(([lat, lon]) =>
      Math.abs(lat - centerLat) > 0.05 || Math.abs(lon - centerLon) > 0.05
    );

    const BATCH = 8;
    for (let i = 0; i < filtered.length && !targetZoning; i += BATCH) {
      const batch = filtered.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        batch.map(([lat, lon]) => wfsQueryZoning(lat, lon, 0.015))
      );
      for (const r of results) {
        if (r.status !== "fulfilled") continue;
        for (const f of r.value) {
          const label = f.properties?.label ?? "";
          const ref = f.properties?.nationalRef ?? "";
          if (parseInt(label, 10) === targetFoglio || ref.includes(`_${foglioPadded}`)) {
            targetZoning = f;
            console.log(`Found foglio ${targetFoglio} in grid scan`);
            break;
          }
        }
        if (targetZoning) break;
      }
    }
  }

  if (!targetZoning) {
    console.warn(`Foglio ${targetFoglio} not found in any zoning query`);
    return [];
  }

  // Phase 2: Search for the parcel within the foglio bbox
  const [fSouth, fNorth, fWest, fEast] = featureBbox(targetZoning);
  const fCenterLat = (fSouth + fNorth) / 2;
  const fCenterLon = (fWest + fEast) / 2;
  const fLatSpan = fNorth - fSouth;
  const fLonSpan = fEast - fWest;

  console.log(`Foglio bbox: [${fSouth.toFixed(5)},${fNorth.toFixed(5)},${fWest.toFixed(5)},${fEast.toFixed(5)}]`);
  console.log(`Foglio spans: ${(fLatSpan * 111000).toFixed(0)}m x ${(fLonSpan * 111000 * Math.cos(fCenterLat * Math.PI / 180)).toFixed(0)}m`);

  // Try whole foglio bbox first (if small enough)
  const fMaxDim = Math.max(fLatSpan, fLonSpan);
  if (fMaxDim < 0.03) {
    try {
      const halfLat = fLatSpan / 2 + 0.001;
      const halfLon = fLonSpan / 2 + 0.001;
      const delta = Math.max(halfLat, halfLon);
      const fc = await wfsQueryBbox(fCenterLat, fCenterLon, delta, 200);
      const matched = fc.features.filter(f => featureMatchesFoglioParticella(f, foglio, particella));
      if (matched.length > 0) {
        console.log(`Found parcel in single foglio query`);
        return matched;
      }
    } catch (err) {
      console.warn("Whole foglio query failed:", err);
    }
  }

  // Tile the foglio bbox for larger fogli
  const tileSize = 0.005; // ~500m tiles
  const tilesLat = Math.ceil(fLatSpan / tileSize) + 1;
  const tilesLon = Math.ceil(fLonSpan / tileSize) + 1;
  const tilePoints: [number, number][] = [];

  // Spiral from foglio center
  for (let dy = 0; dy <= Math.max(tilesLat, tilesLon); dy++) {
    for (let dx = -dy; dx <= dy; dx++) {
      for (const [sy, sx] of dy === 0 ? [[0, 0]] : [[dy, dx], [-dy, dx], [dx, dy], [dx, -dy]]) {
        const lat = fCenterLat + sy * tileSize;
        const lon = fCenterLon + sx * tileSize;
        if (lat >= fSouth - tileSize && lat <= fNorth + tileSize &&
            lon >= fWest - tileSize && lon <= fEast + tileSize) {
          const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
          if (!tilePoints.some(([a, b]) => `${a.toFixed(4)},${b.toFixed(4)}` === key)) {
            tilePoints.push([lat, lon]);
          }
        }
      }
    }
  }

  console.log(`Searching ${tilePoints.length} tiles within foglio bbox`);

  const BATCH = 8;
  for (let i = 0; i < tilePoints.length; i += BATCH) {
    const batch = tilePoints.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map(([lat, lon]) => wfsQueryBbox(lat, lon, tileSize, 200))
    );
    for (const r of results) {
      if (r.status !== "fulfilled") continue;
      const matched = r.value.features.filter(f => featureMatchesFoglioParticella(f, foglio, particella));
      if (matched.length > 0) {
        console.log(`Found parcel in foglio tile scan`);
        return matched;
      }
    }
  }

  console.warn(`Parcel ${codiceComune} fg${foglio} pt${particella} not found within foglio bbox`);
  return [];
}

// ── Main handler ───────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") ?? "wfs";

  try {
    // ── mode=parcel: lookup → zoning → WFS parcel ──
    if (mode === "parcel") {
      const comune = url.searchParams.get("comune") ?? "";
      const foglio = url.searchParams.get("foglio") ?? "";
      const particella = url.searchParams.get("particella") ?? "";

      if (!comune || !foglio || !particella) {
        return new Response(
          JSON.stringify({ error: "Missing comune, foglio or particella" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const comuneInfo = await lookupComune(comune);
      if (!comuneInfo) {
        return new Response(
          JSON.stringify({ error: `Comune not found: ${comune}` }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const codiceComune = comuneInfo.codice;
      console.log(`Parcel search: ${comune} (${codiceComune}) Fg.${foglio} Part.${particella}`);

      // Use client-provided bbox first, then Nominatim, then comuni-json
      let comuneBbox: [number, number, number, number];
      const clientBbox = url.searchParams.get("bbox");
      if (clientBbox) {
        const parts = clientBbox.split(",").map(Number);
        if (parts.length === 4 && parts.every(n => !isNaN(n))) {
          comuneBbox = parts as [number, number, number, number];
          console.log(`Using client-provided bbox: [${comuneBbox.join(",")}]`);
        } else {
          comuneBbox = null as any; // fall through
        }
      }
      if (!comuneBbox) {
        const geo = await geocodeViaProxy(comune);
        if (geo) {
          comuneBbox = geo.bbox;
        } else if (comuneInfo.lat && comuneInfo.lng) {
          console.log(`Using comuni-json coords as fallback: ${comuneInfo.lat}, ${comuneInfo.lng}`);
          const d = 0.05;
          comuneBbox = [comuneInfo.lat - d, comuneInfo.lat + d, comuneInfo.lng - d, comuneInfo.lng + d];
        } else {
          return new Response(
            JSON.stringify({ error: `Cannot geocode: ${comune}` }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      const found = await zoningParcelSearch(codiceComune, foglio, particella, comuneBbox);

      found.forEach((f) => {
        if (f.properties) {
          f.properties._comune = comune;
          f.properties._foglio = foglio;
          f.properties._particella = particella;
        }
      });

      return new Response(
        JSON.stringify({ type: "FeatureCollection", features: found }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── mode=geocode ─────────────────────────────────────────
    if (mode === "geocode") {
      const comune = url.searchParams.get("comune") ?? "";
      if (!comune) {
        return new Response(
          JSON.stringify({ error: "Missing 'comune' parameter" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const q = encodeURIComponent(`${comune}, Italy`);
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=3&countrycodes=it&featuretype=city,town,village,municipality`;
      const nomResp = await fetch(nominatimUrl, {
        headers: { "User-Agent": "GeoVincoli/1.0 (info@tuscanyengineering.it)" },
      });

      if (!nomResp.ok) {
        return new Response(
          JSON.stringify({ error: `Nominatim error: ${nomResp.status}` }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const nomData = await nomResp.json();
      if (!nomData || nomData.length === 0) {
        return new Response(
          JSON.stringify({ error: `Comune not found: ${comune}` }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const best = nomData[0];
      const lat = parseFloat(best.lat);
      const lon = parseFloat(best.lon);
      const bb = best.boundingbox ?? [];
      const bbox =
        bb.length === 4
          ? [parseFloat(bb[0]), parseFloat(bb[1]), parseFloat(bb[2]), parseFloat(bb[3])]
          : [lat - 0.05, lat + 0.05, lon - 0.05, lon + 0.05];

      return new Response(
        JSON.stringify({ lat, lng: lon, bbox, displayName: best.display_name }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── mode=wfs_point: bbox + server-side point-in-polygon ──
    if (mode === "wfs_point") {
      const lat = parseFloat(url.searchParams.get("lat") ?? "");
      const lng = parseFloat(url.searchParams.get("lng") ?? "");
      if (isNaN(lat) || isNaN(lng)) {
        return new Response(
          JSON.stringify({ error: "Missing lat/lng" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      for (const delta of [0.0003, 0.001, 0.003]) {
        try {
          const fc = await wfsQueryBbox(lat, lng, delta);
          if (fc.features.length === 0) continue;
          const match = findFeatureContainingPoint(fc.features, lat, lng);
          if (match) {
            return new Response(
              JSON.stringify({ type: "FeatureCollection", features: [match] }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } catch (err) {
          console.warn(`wfs_point bbox delta=${delta} failed:`, err);
        }
      }

      return new Response(
        JSON.stringify({ type: "FeatureCollection", features: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── mode=getfeatureinfo ──────────────────────────────────
    if (mode === "getfeatureinfo") {
      const lat = parseFloat(url.searchParams.get("lat") ?? "");
      const lng = parseFloat(url.searchParams.get("lng") ?? "");
      if (isNaN(lat) || isNaN(lng)) {
        return new Response(
          JSON.stringify({ error: "Missing lat/lng" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const tileSize = 256;
      const delta = 0.0003;
      const south = lat - delta;
      const north = lat + delta;
      const west = lng - delta;
      const east = lng + delta;
      const i = Math.round(((lng - west) / (east - west)) * tileSize);
      const j = Math.round(((north - lat) / (north - south)) * tileSize);

      const gfiParams = new URLSearchParams({
        SERVICE: "WMS",
        VERSION: "1.3.0",
        REQUEST: "GetFeatureInfo",
        LAYERS: "CP.CadastralParcel",
        QUERY_LAYERS: "CP.CadastralParcel",
        INFO_FORMAT: "text/xml",
        CRS: "EPSG:6706",
        WIDTH: String(tileSize),
        HEIGHT: String(tileSize),
        BBOX: `${south},${west},${north},${east}`,
        I: String(i),
        J: String(j),
        FEATURE_COUNT: "1",
      });

      const gfiUrl = `https://wms.cartografia.agenziaentrate.gov.it/inspire/wms/ows01.php?${gfiParams.toString()}`;
      const gfiResp = await fetch(gfiUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; LandcheckProxy/1.0)",
          Accept: "text/xml, application/xml, */*",
          Referer: "https://wms.cartografia.agenziaentrate.gov.it/",
        },
      });

      if (!gfiResp.ok) {
        return new Response(
          JSON.stringify({ error: `GetFeatureInfo HTTP ${gfiResp.status}` }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const text = await gfiResp.text();
      if (text.includes("ServiceException")) {
        return new Response(
          JSON.stringify({ error: "WMS GetFeatureInfo not supported" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const localIdMatch = text.match(/<base:localId>(.*?)<\/base:localId>/);
      const labelMatch = text.match(/<CP:label>(.*?)<\/CP:label>/);
      const natRefMatch = text.match(/<CP:nationalCadastralReference>(.*?)<\/CP:nationalCadastralReference>/);
      const inspireIdMatch = text.match(/<inspire(?:id)?:localId>(.*?)<\/inspire(?:id)?:localId>/i);

      const localId = localIdMatch?.[1] ?? inspireIdMatch?.[1] ?? "";
      const label = labelMatch?.[1] ?? "";
      const nationalRef = natRefMatch?.[1] ?? "";

      if (!localId && !label && !nationalRef) {
        const anyIdMatch = text.match(/(?:localId|INSPIREID_LOCALID|inspireId)[>\s]*([A-Z0-9._]+)/i);
        if (anyIdMatch) {
          return new Response(
            JSON.stringify({ localId: anyIdMatch[1], label: "", nationalRef: "" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ error: "No feature found at click point" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ localId, label, nationalRef }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── mode=wfs_by_id ───────────────────────────────────────
    if (mode === "wfs_by_id") {
      const resourceId = url.searchParams.get("resourceId") ?? "";
      if (!resourceId) {
        return new Response(
          JSON.stringify({ error: "Missing resourceId" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const wfsUrl =
        `https://wfs.cartografia.agenziaentrate.gov.it/inspire/wfs/owfs01.php` +
        `?language=ita&SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature` +
        `&TYPENAMES=CP:CadastralParcel` +
        `&SRSNAME=urn:ogc:def:crs:EPSG::6706` +
        `&RESOURCEID=${encodeURIComponent(resourceId)}`;

      const wfsResp = await fetch(wfsUrl, {
        headers: {
          Accept: "application/xml, text/xml",
          "User-Agent": "Mozilla/5.0 (compatible; LandcheckProxy/1.0)",
        },
      });

      if (!wfsResp.ok) {
        return new Response(
          JSON.stringify({ error: `WFS by ID HTTP ${wfsResp.status}` }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const gml = await wfsResp.text();
      const geojson = gmlToGeoJSON(gml);
      return new Response(JSON.stringify(geojson), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── mode=wms_ext: proxy for external WMS servers ─────────
    if (mode === "wms_ext") {
      const targetUrl = url.searchParams.get("url");
      const skipTls = url.searchParams.get("skipTls") === "true";
      if (!targetUrl) {
        return new Response(JSON.stringify({ error: "Missing url parameter" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const allowedDomains = [
        "wms.pcn.minambiente.it",
        "www.pcn.minambiente.it",
        "geodata.mit.gov.it",
        "wms.cartografia.agenziaentrate.gov.it",
        "idrogeo.isprambiente.it",
        "sinacloud.isprambiente.it",
        "webapps.sit.puglia.it",
        "www502.regione.toscana.it",
        "www.cartografia.servizirl.it",
        "sit2.regione.campania.it",
        "sit.regione.campania.it",
        "www.sitr.regione.sicilia.it",
        "geoportale.regione.lazio.it",
        "idt2.regione.veneto.it",
        "geomap.reteunitaria.piemonte.it",
        "servizimoka.regione.emilia-romagna.it",
        "webgis2.regione.sardegna.it",
        "geoportale.regione.calabria.it",
        "rsdi.regione.basilicata.it",
        "geoserver.regione.abruzzo.it",
        "iperpiano.regione.molise.it",
        "sit.regione.molise.it",
        "sit2.regione.molise.it",
        "geoportale.regione.liguria.it",
        "srvcarto.regione.liguria.it",
        "irdat.regione.fvg.it",
        "geoportale.regione.umbria.it",
        "www.umbriageo.regione.umbria.it",
        "umbriageo.regione.umbria.it",
        "siat.regione.marche.it",
        "sitr.regione.marche.it",
        "webgis.regione.taa.it",
        "mappe.regione.vda.it",
        "siat.provincia.tn.it",
        "siat.provincia.bz.it",
        // MiC / Vincoli in Rete / SITAP
        "wms.minicultura.it",
        "culturaitalia.it",
        "vincoliinrete.beniculturali.it",
        "sitap.cultura.gov.it",
        "sitap.beniculturali.it",
      ];
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(targetUrl);
      } catch {
        return new Response(JSON.stringify({ error: "Invalid url" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const isAllowedDomain = (hostname: string) =>
        allowedDomains.some((d) => hostname === d || hostname.endsWith("." + d));

      if (!isAllowedDomain(parsedUrl.hostname)) {
        return new Response(JSON.stringify({ error: "Domain not allowed" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        const fetchOptions: RequestInit & { client?: unknown } = {
          redirect: "manual",
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; GeoVincoliProxy/1.0)",
            Accept: "image/png,image/*,application/json,text/xml",
          },
        };
        if (skipTls) {
          try {
            const httpClient = (Deno as any).createHttpClient({ caCerts: [] });
            (fetchOptions as any).client = httpClient;
          } catch {
            /* fallback to default if createHttpClient not available */
          }
        }
        let finalResp: Response | null = null;
        let currentUrl = targetUrl;
        const visitedUrls = new Set<string>();

        for (let i = 0; i < 20; i++) {
          let resp: Response;
          try {
            resp = await fetch(currentUrl, fetchOptions);
          } catch (fetchErr) {
            const msg = String(fetchErr);
            const isTls = msg.includes("UnknownIssuer") || msg.includes("certificate") || msg.includes("SSL") || msg.includes("TLS");
            const isDns = msg.includes("dns error") || msg.includes("failed to lookup address information") || msg.includes("Name or service not known");
            return new Response(JSON.stringify(
              isTls
                ? { error: "TLS_INVALID_CERT", detail: msg, userMessage: "Il server ha un certificato TLS non valido. Il layer non può essere caricato in modo sicuro." }
                : isDns
                  ? { error: "UPSTREAM_DNS_FAILURE", detail: msg, userMessage: "Il dominio del server remoto non risponde correttamente via DNS." }
                  : { error: "WMS fetch failed", detail: msg }
            ), {
              status: 502,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          if (resp.status >= 300 && resp.status < 400) {
            const loc = resp.headers.get("location");
            try { await resp.arrayBuffer(); } catch { /* ignore */ }
            if (!loc) {
              return new Response(JSON.stringify({ error: "Redirect without location" }), {
                status: 502,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }

            const nextUrl = new URL(loc, currentUrl).toString();
            const nextHost = new URL(nextUrl).hostname;
            if (!isAllowedDomain(nextHost)) {
              return new Response(JSON.stringify({ error: "Redirect to disallowed domain" }), {
                status: 403,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }

            const looksLikeAuthRedirect = /cassrv\/login|gateway=true/i.test(nextUrl);
            if (visitedUrls.has(nextUrl) || looksLikeAuthRedirect) {
              return new Response(JSON.stringify({
                error: "UPSTREAM_AUTH_REQUIRED",
                detail: `Redirect loop or authentication gateway detected for ${nextUrl}`,
                userMessage: "Il server remoto richiede autenticazione e non espone un endpoint pubblico utilizzabile dal layer.",
              }), {
                status: 502,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }

            visitedUrls.add(currentUrl);
            currentUrl = nextUrl;
            continue;
          }

          finalResp = resp;
          break;
        }

        if (!finalResp) {
          return new Response(JSON.stringify({
            error: "Too many redirects",
            detail: `Exceeded redirect limit for ${targetUrl}`,
          }), {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        try {
          const finalUrl = new URL(finalResp.url);
          if (!isAllowedDomain(finalUrl.hostname)) {
            return new Response(JSON.stringify({ error: "Redirect to disallowed domain" }), {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } catch {
          return new Response(JSON.stringify({ error: "Invalid upstream response URL" }), {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const contentType = finalResp.headers.get("Content-Type") ?? "application/octet-stream";
        if (contentType.includes("text/html")) {
          const html = await finalResp.text();
          const snippet = html.replace(/\s+/g, " ").slice(0, 180);
          const isLoginRedirect = /cassrv\/login|gateway=true/i.test(finalResp.url) || /cas|accedi|login/i.test(snippet);
          return new Response(JSON.stringify({
            error: isLoginRedirect ? "UPSTREAM_AUTH_REQUIRED" : "UPSTREAM_HTML_RESPONSE",
            detail: isLoginRedirect
              ? "The remote GIS service redirected to an authentication page."
              : `Unexpected HTML response from upstream (HTTP ${finalResp.status})`,
            userMessage: isLoginRedirect
              ? "Il server remoto richiede autenticazione e non espone un endpoint pubblico utilizzabile dal layer."
              : "Il server remoto ha risposto con una pagina HTML invece che con dati GIS.",
            snippet,
          }), {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (!finalResp.ok) {
          const detail = await finalResp.text().catch(() => "");
          return new Response(JSON.stringify({
            error: "WMS fetch failed",
            detail: `Upstream returned HTTP ${finalResp.status}${detail ? `: ${detail.slice(0, 180)}` : ""}`,
          }), {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const imageData = await finalResp.arrayBuffer();
        return new Response(imageData, {
          headers: {
            ...corsHeaders,
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=3600",
          },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: "WMS fetch failed", detail: String(err) }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── mode=wms ──────────────────────────────────────────────
    if (mode === "wms") {
      const wmsParams = new URLSearchParams();
      for (const [key, value] of url.searchParams.entries()) {
        if (key !== "mode") wmsParams.set(key, value);
      }
      const wmsUrl = `https://wms.cartografia.agenziaentrate.gov.it/inspire/wms/ows01.php?${wmsParams.toString()}`;
      const resp = await fetch(wmsUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; LandcheckProxy/1.0)",
          Accept: "image/png,image/*",
          Referer: "https://wms.cartografia.agenziaentrate.gov.it/",
        },
      });
      const imageData = await resp.arrayBuffer();
      return new Response(imageData, {
        headers: {
          ...corsHeaders,
          "Content-Type": resp.headers.get("Content-Type") ?? "image/png",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // ── mode=wfs (default): bbox-based WFS query ──────────────
    const minLatParam = url.searchParams.get("minLat");
    const minLngParam = url.searchParams.get("minLng");
    const maxLatParam = url.searchParams.get("maxLat");
    const maxLngParam = url.searchParams.get("maxLng");

    let minLat: number, maxLat: number, minLng: number, maxLng: number;

    if (minLatParam && minLngParam && maxLatParam && maxLngParam) {
      minLat = parseFloat(minLatParam);
      maxLat = parseFloat(maxLatParam);
      minLng = parseFloat(minLngParam);
      maxLng = parseFloat(maxLngParam);
    } else {
      const lat = parseFloat(url.searchParams.get("lat") ?? "");
      const lng = parseFloat(url.searchParams.get("lng") ?? "");
      const radius = parseFloat(url.searchParams.get("radius") ?? "0.01");
      if (isNaN(lat) || isNaN(lng)) {
        return new Response(
          JSON.stringify({ error: "Missing lat/lng parameters" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      minLat = lat - radius;
      maxLat = lat + radius;
      minLng = lng - radius;
      maxLng = lng + radius;
    }

    if ([minLat, maxLat, minLng, maxLng].some(isNaN)) {
      return new Response(
        JSON.stringify({ error: "Invalid bbox parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const foglio = url.searchParams.get("foglio") ?? "";
    const particella = url.searchParams.get("particella") ?? "";

    const wfsUrl =
      `https://wfs.cartografia.agenziaentrate.gov.it/inspire/wfs/owfs01.php` +
      `?language=ita&SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature` +
      `&TYPENAMES=CP:CadastralParcel` +
      `&SRSNAME=urn:ogc:def:crs:EPSG::6706` +
      `&BBOX=${minLat},${minLng},${maxLat},${maxLng}` +
      `&COUNT=100`;

    const response = await fetch(wfsUrl, {
      headers: {
        Accept: "application/xml, text/xml",
        "User-Agent": "Mozilla/5.0 (compatible; LandcheckProxy/1.0)",
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(
        JSON.stringify({ error: `WFS returned ${response.status}`, detail: errText.substring(0, 200) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const gmlText = await response.text();
    const geojson = gmlToGeoJSON(gmlText);

    if (geojson.features.length > 0 && foglio && particella) {
      const matched = geojson.features.filter((f) => featureMatchesFoglioParticella(f, foglio, particella));
      if (matched.length > 0) {
        return new Response(
          JSON.stringify({ type: "FeatureCollection", features: matched }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(JSON.stringify(geojson), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Proxy error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
