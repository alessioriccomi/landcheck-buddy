import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Parquet cache (persists for the warm instance lifetime) ────
const parquetCache = new Map<string, ArrayBuffer>();

// Fetch a file (with in-memory cache) and return its ArrayBuffer
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

// ── Minimal Parquet reader (row-group scan, no external deps) ──
// We use hyparquet via esm.sh — pure JS, no native bindings needed.
// deno-lint-ignore no-explicit-any
type ParquetRow = Record<string, any>;

async function readParquet(buf: ArrayBuffer): Promise<ParquetRow[]> {
  // @ts-ignore dynamic import from esm.sh
  const { parquetRead, parquetMetadata } = await import("https://esm.sh/hyparquet@1.9.1");
  const rows: ParquetRow[] = [];
  const metadata = await parquetMetadata(buf);
  await parquetRead({
    file: buf,
    metadata,
    onComplete: (data: ParquetRow[]) => rows.push(...data),
  });
  return rows;
}

// ── onData Parquet URLs (CC BY 4.0) ───────────────────────────
const INDEX_PARQUET_URL =
  "https://raw.githubusercontent.com/ondata/dati-catasto/main/dati/index.parquet";

// Map codice_regione → parquet filename on GitHub
// Ref: https://github.com/ondata/dati-catasto/tree/main/dati
const REGIONI_FILES: Record<string, string> = {
  "01": "01_Piemonte.parquet",
  "02": "02_Valle_d_Aosta.parquet",
  "03": "03_Lombardia.parquet",
  "04": "04_Trentino-Alto_Adige.parquet",
  "05": "05_Veneto.parquet",
  "06": "06_Friuli-Venezia_Giulia.parquet",
  "07": "07_Liguria.parquet",
  "08": "08_Emilia-Romagna.parquet",
  "09": "09_Toscana.parquet",
  "10": "10_Umbria.parquet",
  "11": "11_Marche.parquet",
  "12": "12_Lazio.parquet",
  "13": "13_Abruzzo.parquet",
  "14": "14_Molise.parquet",
  "15": "15_Campania.parquet",
  "16": "16_Puglia.parquet",
  "17": "17_Basilicata.parquet",
  "18": "18_Calabria.parquet",
  "19": "19_Sicilia.parquet",
  "20": "20_Sardegna.parquet",
};

const PARQUET_BASE =
  "https://raw.githubusercontent.com/ondata/dati-catasto/main/dati/";

// ── Step 1: lookup index.parquet to find codice_comune + regione file ──
async function lookupComune(comuneName: string): Promise<{
  codiceComune: string;
  regioneFile: string;
} | null> {
  const buf = await fetchCached(INDEX_PARQUET_URL);
  const rows = await readParquet(buf);
  const name = comuneName.toUpperCase().trim();
  // Try exact match first, then includes
  let found = rows.find(
    (r) =>
      String(r.DENOMINAZIONE_IT ?? r.denominazione_it ?? r.nome ?? "")
        .toUpperCase()
        .trim() === name
  );
  if (!found) {
    found = rows.find(
      (r) =>
        String(r.DENOMINAZIONE_IT ?? r.denominazione_it ?? r.nome ?? "")
          .toUpperCase()
          .trim()
          .includes(name)
    );
  }
  if (!found) {
    console.warn("Comune not found in index.parquet:", comuneName);
    console.log("Sample index row keys:", rows[0] ? Object.keys(rows[0]) : []);
    return null;
  }

  console.log("Found comune row:", JSON.stringify(found));

  // Extract codice comune and region code
  const codiceComune: string = String(
    found.codice_comune ??
    found.CODICE_COMUNE ??
    found.cod_comune ??
    ""
  );
  const codiceRegione: string = String(
    found.codice_regione ??
    found.CODICE_REGIONE ??
    found.cod_regione ??
    ""
  ).padStart(2, "0");

  const regioneFile = REGIONI_FILES[codiceRegione];
  if (!regioneFile) {
    console.warn("No regione file for code:", codiceRegione, "row:", JSON.stringify(found));
    return null;
  }

  return { codiceComune, regioneFile };
}

// ── Step 2: lookup regionale parquet to find x, y of particella ──
async function lookupParticella(
  regioneFile: string,
  codiceComune: string,
  foglio: string,
  particella: string
): Promise<{ lon: number; lat: number } | null> {
  const url = PARQUET_BASE + regioneFile;
  const buf = await fetchCached(url);
  const rows = await readParquet(buf);

  console.log(
    `Searching in ${regioneFile}: comune=${codiceComune} foglio=${foglio} particella=${particella}`
  );
  if (rows.length > 0) {
    console.log("Sample regional row keys:", Object.keys(rows[0]));
    console.log("Sample regional row:", JSON.stringify(rows[0]));
  }

  const foglioInt = parseInt(foglio, 10);
  const particellaInt = parseInt(particella, 10);
  const foglioStr4 = foglio.padStart(4, "0");

  const found = rows.find((r) => {
    const rComune = String(r.comune ?? r.codice_comune ?? r.COMUNE ?? "").trim();
    const rFoglio = String(r.foglio ?? r.FOGLIO ?? "").trim();
    const rParticella = String(r.particella ?? r.PARTICELLA ?? r.numero ?? "").trim();

    const comuneMatch =
      rComune === codiceComune ||
      rComune.toUpperCase() === codiceComune.toUpperCase();
    const foglioMatch =
      parseInt(rFoglio, 10) === foglioInt || rFoglio === foglioStr4;
    const particellaMatch = parseInt(rParticella, 10) === particellaInt;

    return comuneMatch && foglioMatch && particellaMatch;
  });

  if (!found) {
    console.warn("Particella not found in regional parquet");
    return null;
  }

  console.log("Found particella row:", JSON.stringify(found));

  // Coordinates are stored in centesimi di secondo (divide by 1e6 to get degrees)
  // or as degrees directly — check magnitude to decide
  const rawX = Number(found.x ?? found.lon ?? found.longitude ?? 0);
  const rawY = Number(found.y ?? found.lat ?? found.latitude ?? 0);

  let lon: number, lat: number;
  if (Math.abs(rawX) > 1000) {
    // Stored as centesimi di secondo (×1e-5 or ×1e-6)
    // onData uses EPSG:4326 × 10^6
    lon = rawX / 1_000_000;
    lat = rawY / 1_000_000;
  } else {
    lon = rawX;
    lat = rawY;
  }

  console.log(`Particella coordinates: lon=${lon}, lat=${lat}`);
  return { lon, lat };
}

// ── GML parser ────────────────────────────────────────────────
function parseGMLCoordinates(posListStr: string): [number, number][] {
  const nums = posListStr.trim().split(/\s+/).map(Number);
  const coords: [number, number][] = [];
  for (let i = 0; i < nums.length - 1; i += 2) {
    coords.push([nums[i + 1], nums[i]]); // [lng, lat] for GeoJSON
  }
  return coords;
}

function gmlToGeoJSON(gmlText: string): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  const featureRegex = /<CP:CadastralParcel[\s\S]*?<\/CP:CadastralParcel>/g;
  let featureMatch: RegExpExecArray | null;

  while ((featureMatch = featureRegex.exec(gmlText)) !== null) {
    const featureXml = featureMatch[0];
    const idMatch = featureXml.match(/<base:localId>(.*?)<\/base:localId>/);
    const localId = idMatch ? idMatch[1] : "unknown";
    const labelMatch = featureXml.match(/<CP:label>(.*?)<\/CP:label>/);
    const label = labelMatch ? labelMatch[1] : "";
    const nationalIdMatch = featureXml.match(
      /<CP:nationalCadastralReference>(.*?)<\/CP:nationalCadastralReference>/
    );
    const nationalRef = nationalIdMatch ? nationalIdMatch[1] : "";

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
      properties: { localId, label, nationalRef },
    });
  }

  return { type: "FeatureCollection", features };
}

function featureMatchesFoglioParticella(
  f: GeoJSON.Feature,
  foglioStr: string,
  particellaStr: string
): boolean {
  const ref: string = f.properties?.nationalRef ?? "";
  const lbl: string = f.properties?.label ?? "";

  const refParts = ref.split("_");
  if (refParts.length >= 3) {
    const refFoglioInt = parseInt(refParts[refParts.length - 2], 10);
    const refParcellaInt = parseInt(refParts[refParts.length - 1], 10);
    if (
      refFoglioInt === parseInt(foglioStr, 10) &&
      refParcellaInt === parseInt(particellaStr, 10)
    ) {
      return true;
    }
  }

  const lblParts = lbl.split("/");
  if (lblParts.length === 2) {
    if (
      parseInt(lblParts[0], 10) === parseInt(foglioStr, 10) &&
      parseInt(lblParts[1], 10) === parseInt(particellaStr, 10)
    ) {
      return true;
    }
  }

  return false;
}

// ── WFS query with tiny bbox ──────────────────────────────────
async function wfsQueryBbox(
  lat: number,
  lon: number,
  delta = 0.0003
): Promise<GeoJSON.FeatureCollection> {
  const minLat = lat - delta;
  const maxLat = lat + delta;
  const minLng = lon - delta;
  const maxLng = lon + delta;

  const wfsUrl =
    `https://wfs.cartografia.agenziaentrate.gov.it/inspire/wfs/owfs01.php` +
    `?language=ita&SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature` +
    `&TYPENAMES=CP:CadastralParcel` +
    `&SRSNAME=urn:ogc:def:crs:EPSG::6706` +
    `&BBOX=${minLat},${minLng},${maxLat},${maxLng}` +
    `&COUNT=50`;

  console.log("WFS tiny bbox:", wfsUrl.substring(0, 200));

  const resp = await fetch(wfsUrl, {
    headers: {
      Accept: "application/xml, text/xml",
      "User-Agent": "Mozilla/5.0 (compatible; LandcheckProxy/1.0)",
    },
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`WFS ${resp.status}: ${errText.substring(0, 100)}`);
  }

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

      // Step 1 — find codice_comune + file regionale
      const comuneInfo = await lookupComune(comune);
      if (!comuneInfo) {
        return new Response(
          JSON.stringify({ error: `Comune not found in cadastral index: ${comune}` }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { codiceComune, regioneFile } = comuneInfo;

      // Step 2 — find coordinates of the specific parcel
      const coords = await lookupParticella(regioneFile, codiceComune, foglio, particella);
      if (!coords) {
        return new Response(
          JSON.stringify({
            error: `Parcel not found: ${comune} Fg.${foglio} Part.${particella}`,
          }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Step 3 — tiny WFS query (±0.0003°, ~33m) around the known point
      // If that returns nothing, try ±0.001° (110m) then ±0.003° (330m)
      let geojson: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };
      for (const delta of [0.0003, 0.001, 0.003]) {
        geojson = await wfsQueryBbox(coords.lat, coords.lon, delta);
        console.log(`WFS delta=${delta} → ${geojson.features.length} features`);
        if (geojson.features.length > 0) break;
      }

      // Try to isolate the exact parcel (properties are populated at small bbox)
      const matched = geojson.features.filter((f) =>
        featureMatchesFoglioParticella(f, foglio, particella)
      );
      const result = matched.length > 0 ? matched : geojson.features;

      // Enrich properties with our lookup data so MapView knows foglio/particella/comune
      result.forEach((f) => {
        if (f.properties) {
          f.properties._comune = comune;
          f.properties._foglio = foglio;
          f.properties._particella = particella;
        }
      });

      return new Response(
        JSON.stringify({ type: "FeatureCollection", features: result }),
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
      console.log("Nominatim geocode:", nominatimUrl);

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
          ? [
              parseFloat(bb[0]),
              parseFloat(bb[1]),
              parseFloat(bb[2]),
              parseFloat(bb[3]),
            ]
          : [lat - 0.05, lat + 0.05, lon - 0.05, lon + 0.05];

      return new Response(
        JSON.stringify({ lat, lng: lon, bbox, displayName: best.display_name }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
          JSON.stringify({
            error: "Missing lat/lng or minLat/minLng/maxLat/maxLng parameters",
          }),
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

    console.log("WFS bbox request:", wfsUrl.substring(0, 200));

    const response = await fetch(wfsUrl, {
      headers: {
        Accept: "application/xml, text/xml",
        "User-Agent": "Mozilla/5.0 (compatible; LandcheckProxy/1.0)",
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(
        JSON.stringify({
          error: `WFS returned ${response.status}`,
          detail: errText.substring(0, 200),
        }),
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
