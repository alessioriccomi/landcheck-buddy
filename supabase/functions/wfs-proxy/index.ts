import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Parse GML coordinates string → [lng, lat][]
function parseGMLCoordinates(posListStr: string): [number, number][] {
  const nums = posListStr.trim().split(/\s+/).map(Number);
  const coords: [number, number][] = [];
  for (let i = 0; i < nums.length - 1; i += 2) {
    // EPSG:6706 axis order: lat, lng
    coords.push([nums[i + 1], nums[i]]); // → [lng, lat] for GeoJSON
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

    const nationalIdMatch = featureXml.match(/<CP:nationalCadastralReference>(.*?)<\/CP:nationalCadastralReference>/);
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

// Check if a feature matches the requested foglio and particella
function featureMatchesFoglioParticella(
  f: GeoJSON.Feature,
  foglioStr: string,
  particellaStr: string
): boolean {
  const ref: string = f.properties?.nationalRef ?? "";
  const lbl: string = f.properties?.label ?? "";

  // nationalRef format: IT.AGE.PLA.CODCOMUNE_FOGLIO_PARTICELLA
  // Both foglio and particella padded with zeros
  const refParts = ref.split("_");
  if (refParts.length >= 3) {
    const refFoglio = refParts[refParts.length - 2];
    const refParticella = refParts[refParts.length - 1];
    // Compare as integers to ignore zero-padding differences
    const refFoglioInt = parseInt(refFoglio, 10);
    const refParcellaInt = parseInt(refParticella, 10);
    const reqFoglioInt = parseInt(foglioStr, 10);
    const reqParcellaInt = parseInt(particellaStr, 10);
    if (refFoglioInt === reqFoglioInt && refParcellaInt === reqParcellaInt) {
      return true;
    }
  }

  // Try label (e.g. "1/1" or "0001/00001")
  const lblParts = lbl.split("/");
  if (lblParts.length === 2) {
    const lblFoglioInt = parseInt(lblParts[0], 10);
    const lblParcellaInt = parseInt(lblParts[1], 10);
    const reqFoglioInt = parseInt(foglioStr, 10);
    const reqParcellaInt = parseInt(particellaStr, 10);
    if (lblFoglioInt === reqFoglioInt && lblParcellaInt === reqParcellaInt) {
      return true;
    }
  }

  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") ?? "wfs";

  try {
    // ── Geocode mode: returns commune center + full bounding box ─────────
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
      console.log("Nominatim results:", nomData.length, nomData[0]);

      if (!nomData || nomData.length === 0) {
        return new Response(
          JSON.stringify({ error: `Comune not found: ${comune}` }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Prefer results with type = city, town, village, administrative
      const best = nomData[0];
      const lat = parseFloat(best.lat);
      const lon = parseFloat(best.lon);
      // Nominatim boundingbox: [south, north, west, east]
      const bb = best.boundingbox ?? [];
      const bbox = bb.length === 4
        ? [parseFloat(bb[0]), parseFloat(bb[1]), parseFloat(bb[2]), parseFloat(bb[3])]
        : [lat - 0.05, lat + 0.05, lon - 0.05, lon + 0.05];

      return new Response(
        JSON.stringify({ lat, lng: lon, bbox, displayName: best.display_name }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── WMS tile proxy mode ──────────────────────────────────
    if (mode === "wms") {
      const wmsParams = new URLSearchParams();
      for (const [key, value] of url.searchParams.entries()) {
        if (key !== "mode") wmsParams.set(key, value);
      }

      const wmsUrl = `https://wms.cartografia.agenziaentrate.gov.it/inspire/wms/ows01.php?${wmsParams.toString()}`;
      console.log("WMS tile request:", wmsUrl.substring(0, 120));

      const resp = await fetch(wmsUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; LandcheckProxy/1.0)",
          "Accept": "image/png,image/*",
          "Referer": "https://wms.cartografia.agenziaentrate.gov.it/",
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

    // ── WFS feature proxy mode (default) ────────────────────
    // Support both:
    //   - New bbox mode: minLat, minLng, maxLat, maxLng (full commune bbox)
    //   - Legacy mode: lat, lng, radius
    const minLatParam = url.searchParams.get("minLat");
    const minLngParam = url.searchParams.get("minLng");
    const maxLatParam = url.searchParams.get("maxLat");
    const maxLngParam = url.searchParams.get("maxLng");

    let minLat: number, maxLat: number, minLng: number, maxLng: number;

    if (minLatParam && minLngParam && maxLatParam && maxLngParam) {
      // New bbox mode
      minLat = parseFloat(minLatParam);
      maxLat = parseFloat(maxLatParam);
      minLng = parseFloat(minLngParam);
      maxLng = parseFloat(maxLngParam);
    } else {
      // Legacy lat/lng/radius mode
      const lat = parseFloat(url.searchParams.get("lat") ?? "");
      const lng = parseFloat(url.searchParams.get("lng") ?? "");
      const radius = parseFloat(url.searchParams.get("radius") ?? "0.01");

      if (isNaN(lat) || isNaN(lng)) {
        return new Response(
          JSON.stringify({ error: "Missing lat/lng or minLat/minLng/maxLat/maxLng parameters" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      minLat = lat - radius;
      maxLat = lat + radius;
      minLng = lng - radius;
      maxLng = lng + radius;
    }

    // Validate
    if ([minLat, maxLat, minLng, maxLng].some(isNaN)) {
      return new Response(
        JSON.stringify({ error: "Invalid bbox parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Optional foglio/particella filters
    const foglio = url.searchParams.get("foglio") ?? "";
    const particella = url.searchParams.get("particella") ?? "";

    // Build CQL_FILTER — pad foglio to 4 digits and particella to 5 digits
    let cqlFilter = "";
    if (foglio && particella) {
      const foglioStr = foglio.padStart(4, "0");
      const particellaStr = particella.padStart(5, "0");
      cqlFilter = `&CQL_FILTER=CP.nationalCadastralReference LIKE '%_${foglioStr}_${particellaStr}'`;
    } else if (foglio) {
      const foglioStr = foglio.padStart(4, "0");
      cqlFilter = `&CQL_FILTER=CP.nationalCadastralReference LIKE '%_${foglioStr}_%'`;
    }

    const wfsUrl =
      `https://wfs.cartografia.agenziaentrate.gov.it/inspire/wfs/owfs01.php` +
      `?language=ita&SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature` +
      `&TYPENAMES=CP:CadastralParcel` +
      `&SRSNAME=urn:ogc:def:crs:EPSG::6706` +
      `&BBOX=${minLat},${minLng},${maxLat},${maxLng}` +
      `&COUNT=100` +
      cqlFilter;

    console.log("WFS request:", wfsUrl.substring(0, 300));

    const response = await fetch(wfsUrl, {
      headers: {
        "Accept": "application/xml, text/xml",
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
    console.log("GML response length:", gmlText.length, "chars");
    const geojson = gmlToGeoJSON(gmlText);
    console.log("Parsed features:", geojson.features.length);

    // If CQL filter returned results, do additional client-side filtering for accuracy
    if (geojson.features.length > 0 && foglio && particella) {
      const matched = geojson.features.filter(f =>
        featureMatchesFoglioParticella(f, foglio, particella)
      );
      if (matched.length > 0) {
        console.log("CQL + client-side filter matched:", matched.length, "features");
        return new Response(JSON.stringify({ type: "FeatureCollection", features: matched }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // CQL returned some features but none matched — fall through to fallback
      console.log("CQL returned features but none matched client-side filter, trying fallback...");
    }

    // If CQL filter returned nothing, fallback to bbox-only and filter client-side
    if (geojson.features.length === 0 && cqlFilter) {
      console.log("CQL filter returned 0 features, trying without filter...");
      const wfsUrlFallback =
        `https://wfs.cartografia.agenziaentrate.gov.it/inspire/wfs/owfs01.php` +
        `?language=ita&SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature` +
        `&TYPENAMES=CP:CadastralParcel` +
        `&SRSNAME=urn:ogc:def:crs:EPSG::6706` +
        `&BBOX=${minLat},${minLng},${maxLat},${maxLng}` +
        `&COUNT=100`;

      const resp2 = await fetch(wfsUrlFallback, {
        headers: {
          "Accept": "application/xml, text/xml",
          "User-Agent": "Mozilla/5.0 (compatible; LandcheckProxy/1.0)",
        },
      });

      if (resp2.ok) {
        const gml2 = await resp2.text();
        const gj2 = gmlToGeoJSON(gml2);
        console.log("Fallback parsed features:", gj2.features.length);

        // Filter client-side by foglio AND particella
        if (foglio && particella && gj2.features.length > 0) {
          const matched = gj2.features.filter(f =>
            featureMatchesFoglioParticella(f, foglio, particella)
          );
          if (matched.length > 0) {
            console.log("Client-side fallback matched:", matched.length, "features");
            return new Response(JSON.stringify({ type: "FeatureCollection", features: matched }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }

        return new Response(JSON.stringify(gj2), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify(geojson), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Proxy error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
