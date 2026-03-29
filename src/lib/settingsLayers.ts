// Utility to load custom layers/groups from localStorage and merge with built-in layers
import { ALL_LAYERS, LAYER_GROUPS, type LayerDef, type LayerGroup } from "@/lib/layerDefinitions";

const CUSTOM_LAYERS_KEY = "lc_custom_layers";
const OVERRIDES_KEY = "lc_layer_url_overrides";
const CUSTOM_GROUPS_KEY = "lc_custom_groups";
const TLS_BYPASS_KEY = "lc_tls_bypass";

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

interface CustomGroupData {
  id: string;
  label: string;
  icon: string;
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

function loadCustomGroups(): CustomGroupData[] {
  try { return JSON.parse(localStorage.getItem(CUSTOM_GROUPS_KEY) || "[]"); } catch { return []; }
}

/** Returns TLS bypass settings per layer id */
export function getTlsBypassSettings(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(TLS_BYPASS_KEY) || "{}"); } catch { return {}; }
}

/** Returns ALL_LAYERS merged with custom layers from Settings, excluding soft-deleted ones */
export function getMergedLayers(): LayerDef[] {
  const overrides = loadOverrides();
  const custom = loadCustomLayers();
  const tlsBypass = getTlsBypassSettings();

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
    tlsBypass: tlsBypass[cl.id] ?? false,
  }));

  // Apply tlsBypass to built-in layers
  const builtInWithTls = builtIn.map(l => ({
    ...l,
    tlsBypass: tlsBypass[l.id] ?? false,
  }));

  return [...builtInWithTls, ...customDefs];
}

/** Returns LAYER_GROUPS merged with custom layers and custom groups, excluding soft-deleted */
export function getMergedGroups(): LayerGroup[] {
  const overrides = loadOverrides();
  const custom = loadCustomLayers();
  const customGroupsData = loadCustomGroups();
  const tlsBypass = getTlsBypassSettings();

  const toLayerDef = (cl: CustomLayerData): LayerDef => ({
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
    tlsBypass: tlsBypass[cl.id] ?? false,
  });

  // Built-in groups
  const groups: LayerGroup[] = LAYER_GROUPS.map(g => ({
    ...g,
    layers: [
      ...g.layers.filter(l => !overrides[l.id]?.deleted).map(l => ({ ...l, tlsBypass: tlsBypass[l.id] ?? false })),
      ...custom.filter(cl => cl.groupId === g.id).map(toLayerDef),
    ],
  }));

  // Custom groups
  for (const cg of customGroupsData) {
    groups.push({
      id: cg.id,
      label: cg.label,
      icon: cg.icon,
      layers: custom.filter(cl => cl.groupId === cg.id).map(toLayerDef),
    });
  }

  // Orphan custom layers (group doesn't exist in built-in or custom)
  const allGroupIds = new Set([...LAYER_GROUPS.map(g => g.id), ...customGroupsData.map(g => g.id)]);
  const orphans = custom.filter(cl => !allGroupIds.has(cl.groupId));
  if (orphans.length > 0) {
    groups.push({
      id: "_custom",
      label: "Vincoli personalizzati",
      icon: "🔧",
      layers: orphans.map(toLayerDef),
    });
  }

  return groups;
}
