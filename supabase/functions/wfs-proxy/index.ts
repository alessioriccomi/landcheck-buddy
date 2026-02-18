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

    // Extract national cadastral reference (foglio/particella)
    // Format: IT.AGE.PLA.CODCOMUNE_FOGLIO_PARTICELLA
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") ?? "wfs";

  try {
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
    const lat = parseFloat(url.searchParams.get("lat") ?? "");
    const lng = parseFloat(url.searchParams.get("lng") ?? "");
    const radius = parseFloat(url.searchParams.get("radius") ?? "0.005");
    // Optional foglio/particella filters
    const foglio = url.searchParams.get("foglio") ?? "";
    const particella = url.searchParams.get("particella") ?? "";

    if (isNaN(lat) || isNaN(lng)) {
      return new Response(
        JSON.stringify({ error: "Missing lat/lng parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const minLat = lat - radius;
    const maxLat = lat + radius;
    const minLng = lng - radius;
    const maxLng = lng + radius;

    // Build CQL_FILTER for foglio and particella if provided
    // The nationalCadastralReference format is: IT.AGE.PLA.CODCOMUNE_FOGLIO_PARTICELLA
    // We filter using LIKE patterns on the reference
    let cqlFilter = "";
    if (foglio && particella) {
      // Pad foglio to 4 digits and particella to 5 digits as used in the cadastral system
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
      `&COUNT=50` +
      cqlFilter;

    console.log("WFS request:", wfsUrl.substring(0, 200));

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

    // If CQL filter was used but returned nothing, fallback to bbox-only results
    // (some municipalities may not support CQL_FILTER)
    if (geojson.features.length === 0 && cqlFilter) {
      console.log("CQL filter returned 0 features, trying without filter...");
      const wfsUrlFallback =
        `https://wfs.cartografia.agenziaentrate.gov.it/inspire/wfs/owfs01.php` +
        `?language=ita&SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature` +
        `&TYPENAMES=CP:CadastralParcel` +
        `&SRSNAME=urn:ogc:def:crs:EPSG::6706` +
        `&BBOX=${minLat},${minLng},${maxLat},${maxLng}` +
        `&COUNT=50`;

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
        
        // Try to find the best matching feature by label
        if (foglio && particella && gj2.features.length > 0) {
          const foglioNum = parseInt(foglio, 10).toString();
          const particellaNum = parseInt(particella, 10).toString();
          const matched = gj2.features.filter(f => {
            const lbl: string = f.properties?.label ?? "";
            // label can be "FG/PART" or similar
            return lbl.includes(particellaNum) || 
              (f.properties?.nationalRef ?? "").includes(particellaNum);
          });
          if (matched.length > 0) {
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
