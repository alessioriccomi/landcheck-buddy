import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Parquet cache (persists for the warm instance lifetime) ────
const parquetCache = new Map<string, ArrayBuffer>();

async function fetchCached(url: string): Promise<ArrayBuffer> {
  if (parquetCache.has(url)) return parquetCache.get(url)!;
  console.log("Fetching (uncached):", url);
  const resp = await fetch(url, {
    headers: { "User-Agent": "GeoVincoli/1.0 (info@tuscanyengineering.it)" },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} fetching ${url}`);
  const buf = await resp.arrayBuffer();
  parquetCache.set(url, buf);
  return buf;
}

// ── Parquet reader with ZSTD support via hyparquet + hyparquet-compressors ──
// Known column orders from onData/dati_catastali (CC BY 4.0):
// index.parquet: comune, file, CODISTAT, DENOMINAZIONE_IT
// regional: INSPIREID_LOCALID, comune, foglio, particella, x, y
const INDEX_COLUMNS = ["comune", "file", "CODISTAT", "DENOMINAZIONE_IT"];
const REGIONAL_COLUMNS = ["INSPIREID_LOCALID", "comune", "foglio", "particella", "x", "y"];

// deno-lint-ignore no-explicit-any
type ParquetRow = Record<string, any>;

async function readParquet(buf: ArrayBuffer, knownColumns: string[]): Promise<ParquetRow[]> {
  // @ts-ignore esm.sh import
  const { parquetRead, parquetMetadata } = await import("https://esm.sh/hyparquet@1.9.1");
  // @ts-ignore esm.sh import
  const { compressors } = await import("https://esm.sh/hyparquet-compressors@1.1.0");

  const metadata = await parquetMetadata(buf);

  const rawRows: unknown[] = [];
  await parquetRead({
    file: buf,
    metadata,
    compressors,
    onComplete: (data: unknown[]) => rawRows.push(...data),
  });

  if (rawRows.length === 0) return [];

  const firstRow = rawRows[0];

  // If rows are objects with numeric keys ("0","1","2"…) remap to column names
  if (firstRow && typeof firstRow === "object" && !Array.isArray(firstRow)) {
    const keys = Object.keys(firstRow as object);
    const areNumeric = keys.length > 0 && keys.every((k) => !isNaN(Number(k)));
    if (areNumeric && knownColumns.length > 0) {
      console.log("Remapping numeric keys to:", knownColumns);
      return rawRows.map((row) => {
        const obj: ParquetRow = {};
        const r = row as Record<string, unknown>;
        knownColumns.forEach((colName, i) => {
          obj[colName] = r[String(i)];
        });
        return obj;
      });
    }
    // Already properly named
    return rawRows as ParquetRow[];
  }

  // Rows are plain arrays
  if (Array.isArray(firstRow) && knownColumns.length > 0) {
    return rawRows.map((row) => {
      const obj: ParquetRow = {};
      const r = row as unknown[];
      knownColumns.forEach((colName, i) => {
        obj[colName] = r[i];
      });
      return obj;
    });
  }

  return rawRows as ParquetRow[];
}

// ── onData Parquet URLs ────────────────────────────────────────
// Correct repo: ondata/dati_catastali (underscore), path: S_0000_ITALIA/anagrafica/
const PARQUET_BASE =
  "https://raw.githubusercontent.com/ondata/dati_catastali/main/S_0000_ITALIA/anagrafica/";
const INDEX_PARQUET_URL = PARQUET_BASE + "index.parquet";

// ── Step 1: map comune name → codice catastale + regionale file ──
async function lookupComune(comuneName: string): Promise<{
  codiceComune: string;
  regioneFile: string;
} | null> {
  const buf = await fetchCached(INDEX_PARQUET_URL);
  const rows = await readParquet(buf, INDEX_COLUMNS);

  if (rows.length > 0) {
    console.log("Index sample:", JSON.stringify(rows[0]));
  }

  const searchName = comuneName.toUpperCase().trim();
  console.log(`Total index rows: ${rows.length}, searching: "${searchName}"`);

  // Debug: log sample of Toscana rows
  const toscanaRows = rows.filter(r => String(r.file ?? "").includes("Toscana")).slice(0, 3);
  console.log("Toscana sample rows:", JSON.stringify(toscanaRows));

  // Debug: log any row containing search term parts
  const partialMatch = rows.filter(r => String(r.DENOMINAZIONE_IT ?? "").toUpperCase().includes("MONTEC")).slice(0, 5);
  console.log("MONTEC matches:", JSON.stringify(partialMatch));

  // Normalize: remove hyphens and extra spaces for fuzzy comparison
  const normalize = (s: string) => s.toUpperCase().trim().replace(/[-\s]+/g, " ");
  const normalizedSearch = normalize(searchName);

  // Exact match
  let found = rows.find((r) => normalize(String(r.DENOMINAZIONE_IT ?? "")) === normalizedSearch);
  // Includes match
  if (!found) found = rows.find((r) => normalize(String(r.DENOMINAZIONE_IT ?? "")).includes(normalizedSearch));
  // Reverse includes (stored value is longer, e.g. "MONTECATINI TERME" found in "MONTECATINI TERME VAL DI CECINA")
  if (!found) found = rows.find((r) => normalizedSearch.includes(normalize(String(r.DENOMINAZIONE_IT ?? ""))) && String(r.DENOMINAZIONE_IT ?? "").length > 4);

  if (!found) {
    console.warn("Comune not found in index.parquet:", comuneName);
    return null;
  }

  console.log("Found comune row:", JSON.stringify(found));

  const codiceComune = String(found.comune ?? "").trim();
  const regioneFile = String(found.file ?? "").trim();

  if (!codiceComune || !regioneFile) {
    console.warn("Missing codiceComune or regioneFile:", JSON.stringify(found));
    return null;
  }

  return { codiceComune, regioneFile };
}

// ── Step 2: find coordinates via Nominatim (lightweight fallback) ──
// The regional parquets are 3-5MB and cause edge function compute limits.
// We use Nominatim to get the commune center, then search via WFS grid.
async function geocodeViaProxy(comuneName: string): Promise<{ lat: number; lon: number; bbox?: [number, number, number, number] } | null> {
  const q = encodeURIComponent(`${comuneName}, Italy`);
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=it`;
  const resp = await fetch(url, { headers: { "User-Agent": "GeoVincoli/1.0" } });
  if (!resp.ok) return null;
  const data = await resp.json();
  if (!data?.length) return null;
  const r = data[0];
  const bbox = r.boundingbox ? [
    parseFloat(r.boundingbox[0]), // south
    parseFloat(r.boundingbox[1]), // north
    parseFloat(r.boundingbox[2]), // west
    parseFloat(r.boundingbox[3]), // east
  ] as [number, number, number, number] : undefined;
  return { lat: parseFloat(r.lat), lon: parseFloat(r.lon), bbox };
}

// ── Progressive search: Comune center → Foglio (CadastralZoning) → Particella ──
// Step 1: WFS CadastralZoning around comune center to find the specific foglio sheet
// Step 2: Use foglio bbox to search CadastralParcel for the target particella
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
  if (!resp.ok) throw new Error(`WFS zoning ${resp.status}`);
  const gml = await resp.text();
  return gmlToGeoJSONZoning(gml);
}

// Parse CadastralZoning GML → features with label (foglio number) and geometry
function gmlToGeoJSONZoning(gmlText: string): GeoJSON.Feature[] {
  const features: GeoJSON.Feature[] = [];
  const featureRegex = /<CP:CadastralZoning[\s\S]*?<\/CP:CadastralZoning>/g;
  let featureMatch: RegExpExecArray | null;

  while ((featureMatch = featureRegex.exec(gmlText)) !== null) {
    const featureXml = featureMatch[0];
    const labelMatch = featureXml.match(/<CP:label>(.*?)<\/CP:label>/);
    const label = labelMatch ? labelMatch[1] : "";
    const nationalIdMatch = featureXml.match(
      /<CP:nationalCadastralReference>(.*?)<\/CP:nationalCadastralReference>/
    );
    const nationalRef = nationalIdMatch ? nationalIdMatch[1] : "";
    const levelMatch = featureXml.match(/<CP:level[^>]*>(.*?)<\/CP:level>/);
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
  let south = 90, north = -90, west = 180, east = -180;
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

// Compute centroid of a GeoJSON polygon feature
function featureCentroid(feat: GeoJSON.Feature): [number, number] {
  const [south, north, west, east] = featureBbox(feat);
  return [(south + north) / 2, (west + east) / 2]; // [lat, lon]
}

// ── Lookup parcel coordinates from regional parquet ──────────
// The onData parquets contain pre-computed x,y (lon,lat) for every parcel in Italy
async function lookupParcelCoordsFromParquet(
  codiceComune: string,
  regioneFile: string,
  foglio: string,
  particella: string,
): Promise<{ lat: number; lon: number } | null> {
  const url = PARQUET_BASE + regioneFile;
  try {
    const buf = await fetchCached(url);
    const rows = await readParquet(buf, REGIONAL_COLUMNS);
    console.log(`Regional parquet ${regioneFile}: ${rows.length} rows loaded`);

    const foglioNum = parseInt(foglio, 10);
    const partNum = parseInt(particella, 10);

    // Find matching row: comune + foglio + particella
    const match = rows.find(r => {
      if (String(r.comune ?? "").trim() !== codiceComune) return false;
      if (parseInt(String(r.foglio ?? ""), 10) !== foglioNum) return false;
      if (parseInt(String(r.particella ?? ""), 10) !== partNum) return false;
      return true;
    });

    if (!match) {
      console.warn(`Parcel not found in parquet: ${codiceComune} Fg.${foglio} Part.${particella}`);
      return null;
    }

    const x = parseFloat(String(match.x ?? ""));
    const y = parseFloat(String(match.y ?? ""));
    if (isNaN(x) || isNaN(y)) {
      console.warn("Invalid x,y in parquet row:", match);
      return null;
    }

    console.log(`Parquet lookup found: ${codiceComune} Fg.${foglio} Part.${particella} → x=${x}, y=${y}`);
    return { lat: y, lon: x };
  } catch (err) {
    console.warn(`Failed to read regional parquet ${regioneFile}:`, err);
    return null;
  }
}

// Progressive parcel search: parquet coords → WFS bbox at exact location
async function progressiveParcelSearch(
  centerLat: number,
  centerLon: number,
  foglio: string,
  particella: string,
  codiceComune?: string,
  communeBbox?: [number, number, number, number],
  regioneFile?: string,
): Promise<GeoJSON.Feature[]> {
  console.log(`Progressive search: center=${centerLat},${centerLon} foglio=${foglio} particella=${particella} codice=${codiceComune} regione=${regioneFile}`);

  // ── Strategy 0: Parquet coordinates (like formaps/urbismap) ──
  // Use the pre-indexed x,y from onData parquets to locate the parcel precisely
  if (codiceComune && regioneFile) {
    const parcelCoords = await lookupParcelCoordsFromParquet(codiceComune, regioneFile, foglio, particella);
    if (parcelCoords) {
      console.log(`Using parquet coords: lat=${parcelCoords.lat}, lon=${parcelCoords.lon}`);
      // Search with progressively larger bbox around the exact parcel location
      for (const delta of [0.0005, 0.001, 0.003, 0.006]) {
        try {
          const fc = await wfsQueryBbox(parcelCoords.lat, parcelCoords.lon, delta);
          console.log(`WFS bbox at parquet coords delta=${delta} → ${fc.features.length} features`);
          const matched = fc.features.filter(f => featureMatchesFoglioParticella(f, foglio, particella));
          if (matched.length > 0) {
            console.log(`✓ Found particella via parquet coords at delta=${delta}`);
            return matched;
          }
        } catch (err) {
          console.warn(`WFS query at parquet coords failed (delta=${delta}):`, err);
        }
      }
      console.warn("Parquet coords found but WFS returned no matching parcel");
    }
  }

  // ── Strategy 1: CadastralZoning around center (fallback) ──
  const foglioNum = parseInt(foglio, 10);
  let foglioFeature: GeoJSON.Feature | null = null;
  for (const delta of [0.02, 0.05]) {
    try {
      const zonings = await wfsQueryZoning(centerLat, centerLon, delta);
      console.log(`Zoning center delta=${delta} → ${zonings.length} features`);
      const match = zonings.find(z => {
        const lbl = String(z.properties?.label ?? "");
        const ref = String(z.properties?.nationalRef ?? "");
        // Try label first, then extract from nationalRef
        if (lbl && parseInt(lbl, 10) === foglioNum) return true;
        if (ref && codiceComune && ref.startsWith(codiceComune)) {
          const afterCode = ref.substring(codiceComune.length);
          const digits = afterCode.replace(/[^0-9]/g, "").substring(0, 4);
          if (digits && parseInt(digits, 10) === foglioNum) return true;
        }
        return false;
      });
      if (match) {
        foglioFeature = match;
        console.log(`Found foglio ${foglio} at center delta=${delta}`);
        break;
      }
      if (zonings.length === 0 && delta >= 0.05) break;
    } catch (err) {
      console.warn(`Zoning query failed at delta=${delta}:`, err);
    }
  }

  if (!foglioFeature) {
    console.warn("Foglio not found, falling back to direct bbox search around center");
    for (const delta of [0.003, 0.01, 0.03]) {
      const fc = await wfsQueryBbox(centerLat, centerLon, delta);
      const matched = fc.features.filter(f => featureMatchesFoglioParticella(f, foglio, particella));
      if (matched.length > 0) return matched;
    }
    return [];
  }

  // ── Found foglio: search parcels within its bbox ──
  const [south, north, west, east] = featureBbox(foglioFeature);
  const foglioCenterLat = (south + north) / 2;
  const foglioCenterLon = (west + east) / 2;
  const foglioDeltaLat = (north - south) / 2 + 0.001;
  const foglioDeltaLon = (east - west) / 2 + 0.001;
  const foglioDelta = Math.max(foglioDeltaLat, foglioDeltaLon);

  console.log(`Foglio bbox: ${south.toFixed(4)},${west.toFixed(4)} → ${north.toFixed(4)},${east.toFixed(4)}, delta=${foglioDelta.toFixed(4)}`);

  if (foglioDelta <= 0.01) {
    const fc = await wfsQueryBbox(foglioCenterLat, foglioCenterLon, foglioDelta);
    console.log(`Parcel search within foglio → ${fc.features.length} features`);
    const matched = fc.features.filter(f => featureMatchesFoglioParticella(f, foglio, particella));
    if (matched.length > 0) return matched;
    return [];
  }

  const STEP = 0.006;
  for (let lat = south; lat <= north; lat += STEP) {
    for (let lon = west; lon <= east; lon += STEP) {
      try {
        const fc = await wfsQueryBbox(lat + STEP / 2, lon + STEP / 2, STEP / 2);
        const matched = fc.features.filter(f => featureMatchesFoglioParticella(f, foglio, particella));
        if (matched.length > 0) {
          console.log(`Found particella in foglio subdivision at ${lat.toFixed(4)},${lon.toFixed(4)}`);
          return matched;
        }
      } catch { /* continue */ }
    }
  }

  return [];
}

// ── GML → GeoJSON ─────────────────────────────────────────────
function parseGMLCoordinates(posListStr: string): [number, number][] {
  const nums = posListStr.trim().split(/\s+/).map(Number);
  const coords: [number, number][] = [];
  for (let i = 0; i < nums.length - 1; i += 2) {
    coords.push([nums[i + 1], nums[i]]); // → [lng, lat] for GeoJSON
  }
  return coords;
}

// Decode nationalCadastralReference → { foglio, particella }
// e.g. "H501A0352B0.1018" → { foglio: "352", particella: "1018" }
function decodeNationalRef(ref: string): { foglio: string; particella: string } | null {
  if (!ref) return null;
  const dotIdx = ref.indexOf(".");
  if (dotIdx < 0) return null;
  const particella = ref.substring(dotIdx + 1);
  const codePart = ref.substring(0, dotIdx);
  // Remove first 4 chars (codice catastale comune)
  if (codePart.length <= 4) return null;
  const foglioEncoded = codePart.substring(4); // e.g. "A0017B0"
  // Positional parsing: pos 0 = sezione (letter), pos 1-4 = foglio (4 digits), pos 5+ = allegato/sviluppo
  let foglioNum: number;
  if (foglioEncoded.length >= 5 && /^\d{4}$/.test(foglioEncoded.substring(1, 5))) {
    foglioNum = parseInt(foglioEncoded.substring(1, 5), 10);
  } else {
    // Fallback: extract all digits
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

  // Log first 500 chars of GML for diagnostics
  console.log("GML raw (first 500):", gmlText.substring(0, 500));

  while ((featureMatch = featureRegex.exec(gmlText)) !== null) {
    const featureXml = featureMatch[0];
    // Support both <base:localId> and <CP:inspireId_localId>
    const idMatch = featureXml.match(/<(?:base|CP):(?:localId|inspireId_localId)>(.*?)<\/(?:base|CP):(?:localId|inspireId_localId)>/i);
    const localId = idMatch ? idMatch[1] : "unknown";
    const labelMatch = featureXml.match(/<CP:label>(.*?)<\/CP:label>/i);
    const label = labelMatch ? labelMatch[1] : "";
    const nationalIdMatch = featureXml.match(
      /<CP:nationalCadastralReference>(.*?)<\/CP:nationalCadastralReference>/i
    );
    const nationalRef = nationalIdMatch ? nationalIdMatch[1] : "";
    // Extract administrativeUnit (codice catastale comune)
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

    // Decode foglio and particella from nationalRef
    const decoded = decodeNationalRef(nationalRef);

    const props: Record<string, string> = {
      localId, label, nationalRef, adminUnit,
    };
    if (decoded) {
      props._foglio = decoded.foglio;
      props._particella = decoded.particella;
    }

    console.log("Parsed feature:", { localId, label, nationalRef, _foglio: decoded?.foglio, _particella: decoded?.particella });

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

  // Priority 1: decoded fields from proxy
  if (props._foglio && props._particella) {
    if (
      parseInt(props._foglio, 10) === parseInt(foglioStr, 10) &&
      parseInt(props._particella, 10) === parseInt(particellaStr, 10)
    ) return true;
  }

  // Priority 2: decode from nationalRef
  const ref: string = props.nationalRef ?? "";
  const decoded = decodeNationalRef(ref);
  if (decoded) {
    if (
      parseInt(decoded.foglio, 10) === parseInt(foglioStr, 10) &&
      parseInt(decoded.particella, 10) === parseInt(particellaStr, 10)
    ) return true;
  }

  // Priority 3: old underscore format
  const refParts = ref.split("_");
  if (refParts.length >= 3) {
    if (
      parseInt(refParts[refParts.length - 2], 10) === parseInt(foglioStr, 10) &&
      parseInt(refParts[refParts.length - 1], 10) === parseInt(particellaStr, 10)
    ) return true;
  }

  // Priority 4: label "foglio/particella"
  const lbl: string = props.label ?? "";
  const lblParts = lbl.split("/");
  if (lblParts.length === 2) {
    if (
      parseInt(lblParts[0], 10) === parseInt(foglioStr, 10) &&
      parseInt(lblParts[1], 10) === parseInt(particellaStr, 10)
    ) return true;
  }

  return false;
}

// ── Point-in-polygon (ray casting) ──────────────────────────────
// Returns true if point [lng, lat] is inside the polygon ring [[lng,lat], ...]
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

// Find the single feature whose polygon contains the given point
function findFeatureContainingPoint(
  features: GeoJSON.Feature[],
  lat: number,
  lon: number
): GeoJSON.Feature | null {
  const point: [number, number] = [lon, lat]; // GeoJSON is [lng, lat]
  for (const feat of features) {
    if (feat.geometry?.type !== "Polygon") continue;
    const rings = (feat.geometry as GeoJSON.Polygon).coordinates;
    // Check outer ring (first ring)
    if (rings.length > 0 && pointInPolygon(point, rings[0] as [number, number][])) {
      // Check not inside any hole (subsequent rings)
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

// ── WFS query with tiny bbox (used for grid search, NOT for click) ──
async function wfsQueryBbox(
  lat: number,
  lon: number,
  delta = 0.0003
): Promise<GeoJSON.FeatureCollection> {
  const wfsUrl =
    `https://wfs.cartografia.agenziaentrate.gov.it/inspire/wfs/owfs01.php` +
    `?language=ita&SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature` +
    `&TYPENAMES=CP:CadastralParcel` +
    `&SRSNAME=urn:ogc:def:crs:EPSG::6706` +
    `&BBOX=${lat - delta},${lon - delta},${lat + delta},${lon + delta}` +
    `&COUNT=50`;

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") ?? "wfs";

  try {
    // ── mode=parcel: Parquet lookup → tiny WFS bbox ──────────
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
          JSON.stringify({ error: `Comune not found in cadastral index: ${comune}` }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { codiceComune, regioneFile } = comuneInfo;
      console.log(`Looking up parcel via grid search: ${comune} (${codiceComune}/${regioneFile}) Fg.${foglio} Part.${particella}`);

      // Step 1: geocode commune center via Nominatim
      const center = await geocodeViaProxy(comune);
      if (!center) {
        return new Response(
          JSON.stringify({ error: `Cannot geocode comune: ${comune}` }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Step 2: Progressive search — Parquet coords → Foglio (CadastralZoning) → Particella
      const found = await progressiveParcelSearch(center.lat, center.lon, foglio, particella, codiceComune, center.bbox, regioneFile);

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

    // ── mode=wfs_point: bbox + server-side point-in-polygon for precise click ──
    if (mode === "wfs_point") {
      const lat = parseFloat(url.searchParams.get("lat") ?? "");
      const lng = parseFloat(url.searchParams.get("lng") ?? "");
      if (isNaN(lat) || isNaN(lng)) {
        return new Response(
          JSON.stringify({ error: "Missing lat/lng" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch parcels in a small bbox around the click point
      // Try progressively larger bbox until we find a containing polygon
      for (const delta of [0.0003, 0.001, 0.003]) {
        try {
          const fc = await wfsQueryBbox(lat, lng, delta);
          console.log(`wfs_point bbox delta=${delta} → ${fc.features.length} features`);
          
          if (fc.features.length === 0) continue;

          // Server-side point-in-polygon: find exactly which parcel contains the click
          const match = findFeatureContainingPoint(fc.features, lat, lng);
          if (match) {
            console.log(`Point-in-polygon match: ${match.properties?.label ?? match.properties?.localId}`);
            return new Response(
              JSON.stringify({ type: "FeatureCollection", features: [match] }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } catch (err) {
          console.warn(`wfs_point bbox delta=${delta} failed:`, err);
        }
      }

      // No match found
      return new Response(
        JSON.stringify({ type: "FeatureCollection", features: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── mode=getfeatureinfo: WMS GetFeatureInfo per click preciso ──
    if (mode === "getfeatureinfo") {
      const lat = parseFloat(url.searchParams.get("lat") ?? "");
      const lng = parseFloat(url.searchParams.get("lng") ?? "");
      const zoom = parseInt(url.searchParams.get("zoom") ?? "17", 10);

      if (isNaN(lat) || isNaN(lng)) {
        return new Response(
          JSON.stringify({ error: "Missing lat/lng" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Convert lat/lng to tile pixel coordinates for GetFeatureInfo
      // Use a fixed 256x256 tile, compute the pixel position of the clicked point
      const tileSize = 256;
      // Build a small bbox centered on click point (±~25m at zoom 17)
      const delta = 0.0003;
      const south = lat - delta;
      const north = lat + delta;
      const west = lng - delta;
      const east = lng + delta;

      // Pixel position of clicked point within the bbox
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
      console.log("GetFeatureInfo URL:", gfiUrl.substring(0, 300));

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
      console.log("GFI raw response (first 800):", text.substring(0, 800));

      // Check for ServiceException (error from WMS)
      if (text.includes("ServiceException")) {
        console.warn("GFI ServiceException:", text.substring(0, 300));
        return new Response(
          JSON.stringify({ error: "WMS GetFeatureInfo not supported for this layer", raw: text.substring(0, 200) }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Parse XML/GML response to extract localId, label, nationalCadastralReference
      const localIdMatch = text.match(/<base:localId>(.*?)<\/base:localId>/);
      const labelMatch = text.match(/<CP:label>(.*?)<\/CP:label>/);
      const natRefMatch = text.match(/<CP:nationalCadastralReference>(.*?)<\/CP:nationalCadastralReference>/);
      
      // Also try INSPIRE ID pattern: <inspire:localId> or <gml:identifier>
      const inspireIdMatch = text.match(/<inspire(?:id)?:localId>(.*?)<\/inspire(?:id)?:localId>/i);
      const gmlIdMatch = text.match(/gml:id="([^"]+)"/);

      const localId = localIdMatch?.[1] ?? inspireIdMatch?.[1] ?? "";
      const label = labelMatch?.[1] ?? "";
      const nationalRef = natRefMatch?.[1] ?? "";

      if (!localId && !label && !nationalRef) {
        // Try to extract any identifier from the XML
        const anyIdMatch = text.match(/(?:localId|INSPIREID_LOCALID|inspireId)[>\s]*([A-Z0-9._]+)/i);
        if (anyIdMatch) {
          return new Response(
            JSON.stringify({ localId: anyIdMatch[1], label: "", nationalRef: "" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ error: "No feature found at click point", raw: text.substring(0, 200) }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ localId, label, nationalRef }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── mode=wfs_by_id: WFS GetFeature by RESOURCEID (exact parcel geometry) ──
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

      console.log("WFS by RESOURCEID:", wfsUrl.substring(0, 300));

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
      console.log(`WFS by RESOURCEID found ${geojson.features.length} features`);

      return new Response(
        JSON.stringify(geojson),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── mode=wms_ext: proxy for external WMS servers (PCN, ISPRA, MiC, etc.) ──
    if (mode === "wms_ext") {
      const targetUrl = url.searchParams.get("url");
      if (!targetUrl) {
        return new Response(JSON.stringify({ error: "Missing url parameter" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Allowlist of trusted WMS domains
      const allowedDomains = [
        "wms.pcn.minambiente.it",
        "www.pcn.minambiente.it",
        "geodata.mit.gov.it",
        "wms.cartografia.agenziaentrate.gov.it",
        "idrogeo.isprambiente.it",
        // Regional geoportals
        "webapps.sit.puglia.it",
        "www502.regione.toscana.it",
        "www.cartografia.servizirl.it",
        "sit2.regione.campania.it",
        "www.sitr.regione.sicilia.it",
        "geoportale.regione.lazio.it",
        "idt2.regione.veneto.it",
        "geomap.reteunitaria.piemonte.it",
        "servizimoka.regione.emilia-romagna.it",
        "webgis2.regione.sardegna.it",
        "geoportale.regione.calabria.it",
      ];
      let parsedUrl: URL;
      try { parsedUrl = new URL(targetUrl); } catch {
        return new Response(JSON.stringify({ error: "Invalid url" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!allowedDomains.some(d => parsedUrl.hostname === d || parsedUrl.hostname.endsWith("." + d))) {
        return new Response(JSON.stringify({ error: "Domain not allowed" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        const resp = await fetch(targetUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; GeoVincoliProxy/1.0)",
            Accept: "image/png,image/*",
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
      } catch (err) {
        return new Response(JSON.stringify({ error: "WMS fetch failed", detail: String(err) }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
    console.log("Parsed features:", geojson.features.length);

    if (geojson.features.length > 0 && foglio && particella) {
      const matched = geojson.features.filter((f) =>
        featureMatchesFoglioParticella(f, foglio, particella)
      );
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
