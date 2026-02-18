import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Parse GML coordinates string → [lng, lat][] (GML uses lat,lng order in EPSG:6706)
function parseGMLCoordinates(posListStr: string): [number, number][] {
  const nums = posListStr.trim().split(/\s+/).map(Number);
  const coords: [number, number][] = [];
  for (let i = 0; i < nums.length - 1; i += 2) {
    // EPSG:6706 = RDN2008 geographic → axis order is lat, lng
    const lat = nums[i];
    const lng = nums[i + 1];
    coords.push([lng, lat]); // GeoJSON uses [lng, lat]
  }
  return coords;
}

// Extract all <gml:posList> blocks from a GML FeatureCollection
function gmlToGeoJSON(gmlText: string): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];

  // Find each CadastralParcel feature
  const featureRegex = /<CP:CadastralParcel[\s\S]*?<\/CP:CadastralParcel>/g;
  let featureMatch: RegExpExecArray | null;

  while ((featureMatch = featureRegex.exec(gmlText)) !== null) {
    const featureXml = featureMatch[0];

    // Extract inspireid
    const idMatch = featureXml.match(/<base:localId>(.*?)<\/base:localId>/);
    const localId = idMatch ? idMatch[1] : "unknown";

    // Extract label (foglio/particella)
    const labelMatch = featureXml.match(/<CP:label>(.*?)<\/CP:label>/);
    const label = labelMatch ? labelMatch[1] : "";

    // Find all rings (exterior + interior)
    const rings: [number, number][][] = [];
    const posListRegex = /<gml:posList[^>]*>([\s\S]*?)<\/gml:posList>/g;
    let posMatch: RegExpExecArray | null;

    while ((posMatch = posListRegex.exec(featureXml)) !== null) {
      const coords = parseGMLCoordinates(posMatch[1]);
      if (coords.length >= 3) {
        rings.push(coords);
      }
    }

    if (rings.length === 0) continue;

    features.push({
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: rings,
      },
      properties: {
        localId,
        label,
      },
    });
  }

  return {
    type: "FeatureCollection",
    features,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const lat = parseFloat(url.searchParams.get("lat") ?? "");
    const lng = parseFloat(url.searchParams.get("lng") ?? "");
    const radius = parseFloat(url.searchParams.get("radius") ?? "0.005");

    if (isNaN(lat) || isNaN(lng)) {
      return new Response(
        JSON.stringify({ error: "Missing lat/lng parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build BBOX query — WFS AdE uses EPSG:6706 (RDN2008) which is lat/lng
    // BBOX order for WFS 2.0 with EPSG:6706: minLat,minLng,maxLat,maxLng
    const minLat = lat - radius;
    const maxLat = lat + radius;
    const minLng = lng - radius;
    const maxLng = lng + radius;

    const wfsUrl =
      `https://wfs.cartografia.agenziaentrate.gov.it/inspire/wfs/owfs01.php` +
      `?language=ita&SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature` +
      `&TYPENAMES=CP:CadastralParcel` +
      `&SRSNAME=urn:ogc:def:crs:EPSG::6706` +
      `&BBOX=${minLat},${minLng},${maxLat},${maxLng}` +
      `&COUNT=50`;

    console.log("WFS request:", wfsUrl);

    const response = await fetch(wfsUrl, {
      headers: {
        "Accept": "application/xml, text/xml",
        "User-Agent": "Mozilla/5.0 (compatible; LandcheckProxy/1.0)",
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("WFS error:", response.status, errText.substring(0, 500));
      return new Response(
        JSON.stringify({ error: `WFS returned ${response.status}`, detail: errText.substring(0, 200) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const gmlText = await response.text();
    console.log("GML response length:", gmlText.length, "chars");

    const geojson = gmlToGeoJSON(gmlText);
    console.log("Parsed features:", geojson.features.length);

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
