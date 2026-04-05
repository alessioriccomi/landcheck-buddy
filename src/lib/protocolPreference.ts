// Per-layer protocol preference: which endpoint to use for rendering
export type LayerProtocol = "auto" | "wms" | "wfs" | "arcgis";

const STORAGE_KEY = "lc_layer_protocol";

export function getProtocolPreferences(): Record<string, LayerProtocol> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
}

export function getProtocolForLayer(layerId: string): LayerProtocol {
  return getProtocolPreferences()[layerId] || "auto";
}

export function setProtocolForLayer(layerId: string, protocol: LayerProtocol) {
  const prefs = getProtocolPreferences();
  if (protocol === "auto") {
    delete prefs[layerId];
  } else {
    prefs[layerId] = protocol;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}
