// Utility to load custom layers from localStorage and merge with built-in layers
import { ALL_LAYERS, LAYER_GROUPS, type LayerDef, type LayerGroup } from "@/lib/layerDefinitions";

const CUSTOM_LAYERS_KEY = "lc_custom_layers";
const OVERRIDES_KEY = "lc_layer_url_overrides";

interface CustomLayerData {
  id: string;
  groupId: string;
  label: string;
  color: string;
  wmsUrl?: string;
  wmsLayer?: string;
  arcgisUrl?: string;
  arcgisLayers?: string;
  fallbackUrls?: string[];
  description?: string;
}

type Override = {
  wmsUrl?: string;
  arcgisUrl?: string;
  wmsLayer?: string;
  arcgisLayers?: string;
  fallbackUrls?: string[];
  deleted?: boolean;
};

function loadCustomLayers(): CustomLayerData[] {
  try { return JSON.parse(localStorage.getItem(CUSTOM_LAYERS_KEY) || "[]"); } catch { return []; }
}

function loadOverrides(): Record<string, Override> {
  try { return JSON.parse(localStorage.getItem(OVERRIDES_KEY) || "{}"); } catch { return {}; }
}

/** Returns ALL_LAYERS merged with custom layers from Settings, excluding soft-deleted ones */
export function getMergedLayers(): LayerDef[] {
  const overrides = loadOverrides();
  const custom = loadCustomLayers();

  // Filter out soft-deleted built-in layers
  const builtIn = ALL_LAYERS.filter(l => !overrides[l.id]?.deleted);

  // Convert custom layers to LayerDef
  const customDefs: LayerDef[] = custom.map(cl => ({
    id: cl.id,
    label: cl.label,
    color: cl.color,
    defaultOn: false,
    wmsUrl: cl.wmsUrl,
    wmsLayer: cl.wmsLayer,
    arcgisUrl: cl.arcgisUrl,
    arcgisLayers: cl.arcgisLayers,
    fallbackUrls: cl.fallbackUrls?.filter(Boolean),
    description: cl.description,
    opacity: 0.5,
  }));

  return [...builtIn, ...customDefs];
}

/** Returns LAYER_GROUPS merged with custom layers, excluding soft-deleted */
export function getMergedGroups(): LayerGroup[] {
  const overrides = loadOverrides();
  const custom = loadCustomLayers();

  const groups: LayerGroup[] = LAYER_GROUPS.map(g => ({
    ...g,
    layers: [
      ...g.layers.filter(l => !overrides[l.id]?.deleted),
      ...custom.filter(cl => cl.groupId === g.id).map(cl => ({
        id: cl.id,
        label: cl.label,
        color: cl.color,
        defaultOn: false,
        wmsUrl: cl.wmsUrl,
        wmsLayer: cl.wmsLayer,
        arcgisUrl: cl.arcgisUrl,
        arcgisLayers: cl.arcgisLayers,
        fallbackUrls: cl.fallbackUrls?.filter(Boolean),
        description: cl.description,
        opacity: 0.5,
      } as LayerDef)),
    ],
  }));

  // Orphan custom layers (group doesn't exist)
  const orphans = custom.filter(cl => !LAYER_GROUPS.some(g => g.id === cl.groupId));
  if (orphans.length > 0) {
    groups.push({
      id: "_custom",
      label: "Vincoli personalizzati",
      icon: "🔧",
      layers: orphans.map(cl => ({
        id: cl.id,
        label: cl.label,
        color: cl.color,
        defaultOn: false,
        wmsUrl: cl.wmsUrl,
        wmsLayer: cl.wmsLayer,
        arcgisUrl: cl.arcgisUrl,
        arcgisLayers: cl.arcgisLayers,
        fallbackUrls: cl.fallbackUrls?.filter(Boolean),
        description: cl.description,
        opacity: 0.5,
      } as LayerDef)),
    });
  }

  return groups;
}
