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

// Lookup comune name → { codiceCatastale, regione }
async function lookupComune(comuneName: string): Promise<{ codice: string; regione: string } | null> {
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

  console.log(`Comune lookup: "${comuneName}" → codice ${found.codiceCatastale}, regione ${found.regione?.nome}`);
  return { codice: found.codiceCatastale, regione: found.regione?.nome ?? "" };
}

// ── onData parquet coordinate lookup ─────────────────────────
// Maps region name → parquet filename on onData GitHub
const REGION_FILE_MAP: Record<string, string> = {
  "Piemonte": "01_Piemonte.parquet",
  "Valle d'Aosta": "02_Valle_dAosta.parquet",
  "Lombardia": "03_Lombardia.parquet",
  "Trentino-Alto Adige": "04_Trentino_Alto_Adige.parquet",
  "Veneto": "05_Veneto.parquet",
  "Friuli-Venezia Giulia": "06_Friuli_Venezia_Giulia.parquet",
  "Liguria": "07_Liguria.parquet",
  "Emilia-Romagna": "08_Emilia_Romagna.parquet",
  "Toscana": "09_Toscana.parquet",
  "Umbria": "10_Umbria.parquet",
  "Marche": "11_Marche.parquet",
  "Lazio": "12_Lazio.parquet",
  "Abruzzo": "13_Abruzzo.parquet",
  "Molise": "14_Molise.parquet",
  "Campania": "15_Campania.parquet",
  "Puglia": "16_Puglia.parquet",
  "Basilicata": "17_Basilicata.parquet",
  "Calabria": "18_Calabria.parquet",
  "Sicilia": "19_Sicilia.parquet",
  "Sardegna": "20_Sardegna.parquet",
};

const ONDATA_BASE = "https://raw.githubusercontent.com/ondata/dati_catastali/main/S_0000_ITALIA/anagrafica";

// Lookup coordinates from onData parquet (HTTP range requests, no full download)
async function lookupParcelCoords(
  codiceComune: string,
  foglio: string,
  particella: string,
  regione: string
): Promise<{ lat: number; lon: number } | null> {
  const fileName = REGION_FILE_MAP[regione];
  if (!fileName) {
    console.warn(`No parquet file mapping for region: ${regione}`);
    return null;
  }

  const foglioPadded = foglio.padStart(4, "0");
  const url = `${ONDATA_BASE}/${fileName}`;
  console.log(`Querying onData parquet: ${fileName} for ${codiceComune}/${foglioPadded}/${particella}`);

  try {
    // Use hyparquet with HTTP range requests (only fetches needed bytes)
    const { asyncBufferFromUrl, parquetRead } = await import(
      "https://cdn.jsdelivr.net/npm/hyparquet@1.7.1/src/hyparquet.min.js"
    );

    const file = await asyncBufferFromUrl({ url });
    let result: { lat: number; lon: number } | null = null;

    await parquetRead({
      file,
      columns: ["comune", "foglio", "particella", "x", "y"],
      rowFormat: "object",
      onComplete: (rows: any[]) => {
        for (const row of rows) {
          if (
            row.comune === codiceComune &&
            row.foglio === foglioPadded &&
            String(row.particella) === String(particella)
          ) {
            // Coordinates are stored as integers: lon*1e6, lat*1e6
            result = {
              lon: Number(row.x) / 1_000_000,
              lat: Number(row.y) / 1_000_000,
            };
            break;
          }
        }
      },
    });

    if (result) {
      console.log(`onData found coords: lat=${result.lat}, lon=${result.lon}`);
    } else {
      console.warn("Parcel not found in onData parquet");
    }
    return result;
  } catch (err) {
    console.warn("onData parquet lookup failed:", err);
    return null;
  }
}

// Keep backward-compatible function name
async function lookupCodiceComune(comuneName: string): Promise<string | null> {
  const result = await lookupComune(comuneName);
  return result?.codice ?? null;
}

// ── Geocode via Nominatim ──────────────────────────────────────
async function geocodeViaProxy(
  comuneName: string
): Promise<{ lat: number; lon: number; bbox: [number, number, number, number] } | null> {
  const q = encodeURIComponent(`${comuneName}, Italy`);
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=it`;
  const resp = await fetch(url, { headers: { "User-Agent": "GeoVincoli/1.0" } });
  if (!resp.ok) return null;
  const data = await resp.json();
  if (!data?.length) return null;
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
  if (!resp.ok) throw new Error(`WFS zoning ${resp.status}`);
  const gml = await resp.text();
  return gmlToGeoJSONZoning(gml);
}

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

// ── Parcel search: onData parquet coords → tiny bbox WFS ───────
async function directParcelSearch(
  codiceComune: string,
  foglio: string,
  particella: string,
  regione: string
): Promise<GeoJSON.Feature[]> {
  // Step 1: Get coordinates from onData parquet (HTTP range requests)
  const coords = await lookupParcelCoords(codiceComune, foglio, particella, regione);
  if (coords) {
    console.log(`Using onData coords: lat=${coords.lat}, lon=${coords.lon}`);
    // Step 2: Tiny bbox WFS query around the known point
    for (const delta of [0.0003, 0.001, 0.003]) {
      try {
        const fc = await wfsQueryBbox(coords.lat, coords.lon, delta);
        const matched = fc.features.filter(f => featureMatchesFoglioParticella(f, foglio, particella));
        if (matched.length > 0) {
          console.log(`Found ${matched.length} features via onData+WFS at delta=${delta}`);
          return matched;
        }
        // Try point-in-polygon if we got features but none matched by name
        if (fc.features.length > 0) {
          const pip = findFeatureContainingPoint(fc.features, coords.lat, coords.lon);
          if (pip) return [pip];
        }
      } catch { /* continue */ }
    }
  }
  return [];
}
  foglio: string,
  particella: string
): Promise<GeoJSON.Feature[]> {
  console.log(`Direct parcel search: codice=${codiceComune} foglio=${foglio} particella=${particella}`);
  const fc = await wfsQueryByNationalRef(codiceComune, foglio, particella);
  return fc.features;
}

// ── Main handler ───────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") ?? "wfs";

  try {
    // ── mode=parcel: JSON lookup → CadastralZoning grid → parcel ──
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

      // Step 1: Get codice catastale from lightweight JSON
      const codiceComune = await lookupCodiceComune(comune);
      if (!codiceComune) {
        return new Response(
          JSON.stringify({ error: `Comune not found: ${comune}` }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Parcel search: ${comune} (${codiceComune}) Fg.${foglio} Part.${particella}`);

      // Step 2: Direct WFS query by nationalCadastralReference (no geocoding needed)
      const found = await directParcelSearch(codiceComune, foglio, particella);

      // If direct query failed and we have no results, try geocoding for bbox fallback
      if (found.length === 0) {
        console.log("Direct query failed, trying geocode + bbox fallback");
        const center = await geocodeViaProxy(comune);
        if (center) {
          for (const delta of [0.003, 0.01, 0.02]) {
            try {
              const bboxFc = await wfsQueryBbox(center.lat, center.lon, delta);
              const matched = bboxFc.features.filter(f => featureMatchesFoglioParticella(f, foglio, particella));
              if (matched.length > 0) {
                matched.forEach(f => { if (f.properties) { f.properties._comune = comune; f.properties._foglio = foglio; f.properties._particella = particella; }});
                return new Response(
                  JSON.stringify({ type: "FeatureCollection", features: matched }),
                  { headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
              }
            } catch { /* continue */ }
          }
        }
      }

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
      try {
        parsedUrl = new URL(targetUrl);
      } catch {
        return new Response(JSON.stringify({ error: "Invalid url" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!allowedDomains.some((d) => parsedUrl.hostname === d || parsedUrl.hostname.endsWith("." + d))) {
        return new Response(JSON.stringify({ error: "Domain not allowed" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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
