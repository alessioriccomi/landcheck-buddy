// Utility to load custom layers/groups from localStorage and merge with built-in layers
import { ALL_LAYERS, LAYER_GROUPS, type LayerDef, type LayerGroup } from "@/lib/layerDefinitions";

const CUSTOM_LAYERS_KEY = "lc_custom_layers";
const OVERRIDES_KEY = "lc_layer_url_overrides";
const CUSTOM_GROUPS_KEY = "lc_custom_groups";
const TLS_BYPASS_KEY = "lc_tls_bypass";
const GROUP_OVERRIDES_KEY = "lc_group_overrides";

interface CustomLayerData {
  id: string;
  groupId: string;
  label: string;
  color: string;
  wmsUrl?: string;
  wmsLayer?: string;
  wfsUrl?: string;
  wfsLayer?: string;
  arcgisUrl?: string;
  arcgisLayers?: string;
  srid?: string;
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
  wmsLayer?: string;
  wfsUrl?: string;
  wfsLayer?: string;
  arcgisUrl?: string;
  arcgisLayers?: string;
  srid?: string;
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

type GroupOverride = { label?: string; icon?: string; deleted?: boolean };
function loadGroupOverrides(): Record<string, GroupOverride> {
  try { return JSON.parse(localStorage.getItem(GROUP_OVERRIDES_KEY) || "{}"); } catch { return {}; }
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
    wfsUrl: cl.wfsUrl,
    wfsLayer: cl.wfsLayer,
    arcgisUrl: cl.arcgisUrl,
    arcgisLayers: cl.arcgisLayers,
    srid: cl.srid,
    fallbackUrls: cl.fallbackUrls?.filter(Boolean),
    description: cl.description,
    opacity: 0.5,
    tlsBypass: tlsBypass[cl.id] ?? false,
  }));

  // Apply overrides + tlsBypass to built-in layers
  const builtInWithOverrides = builtIn.map(l => {
    const ov = overrides[l.id];
    return {
      ...l,
      ...(ov?.wmsUrl !== undefined && { wmsUrl: ov.wmsUrl }),
      ...(ov?.wmsLayer !== undefined && { wmsLayer: ov.wmsLayer }),
      ...(ov?.wfsUrl !== undefined && { wfsUrl: ov.wfsUrl }),
      ...(ov?.wfsLayer !== undefined && { wfsLayer: ov.wfsLayer }),
      ...(ov?.arcgisUrl !== undefined && { arcgisUrl: ov.arcgisUrl }),
      ...(ov?.arcgisLayers !== undefined && { arcgisLayers: ov.arcgisLayers }),
      ...(ov?.srid !== undefined && { srid: ov.srid }),
      ...(ov?.fallbackUrls !== undefined && { fallbackUrls: ov.fallbackUrls }),
      tlsBypass: tlsBypass[l.id] ?? false,
    };
  });

  return [...builtInWithOverrides, ...customDefs];
}

/** Returns LAYER_GROUPS merged with custom layers and custom groups, excluding soft-deleted */
export function getMergedGroups(): LayerGroup[] {
  const overrides = loadOverrides();
  const custom = loadCustomLayers();
  const customGroupsData = loadCustomGroups();
  const tlsBypass = getTlsBypassSettings();
  const grpOverrides = loadGroupOverrides();

  const toLayerDef = (cl: CustomLayerData): LayerDef => ({
    id: cl.id,
    label: cl.label,
    color: cl.color,
    defaultOn: false,
    wmsUrl: cl.wmsUrl,
    wmsLayer: cl.wmsLayer,
    wfsUrl: cl.wfsUrl,
    wfsLayer: cl.wfsLayer,
    arcgisUrl: cl.arcgisUrl,
    arcgisLayers: cl.arcgisLayers,
    srid: cl.srid,
    fallbackUrls: cl.fallbackUrls?.filter(Boolean),
    description: cl.description,
    opacity: 0.5,
    tlsBypass: tlsBypass[cl.id] ?? false,
  });

  const applyOverrides = (l: LayerDef): LayerDef => {
    const ov = overrides[l.id];
    return {
      ...l,
      ...(ov?.wmsUrl !== undefined && { wmsUrl: ov.wmsUrl }),
      ...(ov?.wmsLayer !== undefined && { wmsLayer: ov.wmsLayer }),
      ...(ov?.wfsUrl !== undefined && { wfsUrl: ov.wfsUrl }),
      ...(ov?.wfsLayer !== undefined && { wfsLayer: ov.wfsLayer }),
      ...(ov?.arcgisUrl !== undefined && { arcgisUrl: ov.arcgisUrl }),
      ...(ov?.arcgisLayers !== undefined && { arcgisLayers: ov.arcgisLayers }),
      ...(ov?.srid !== undefined && { srid: ov.srid }),
      ...(ov?.fallbackUrls !== undefined && { fallbackUrls: ov.fallbackUrls }),
      tlsBypass: tlsBypass[l.id] ?? false,
    };
  };

  // Built-in groups (apply group overrides, skip soft-deleted groups)
  const groups: LayerGroup[] = LAYER_GROUPS
    .filter(g => !grpOverrides[g.id]?.deleted)
    .map(g => {
      const gov = grpOverrides[g.id];
      return {
        ...g,
        label: gov?.label || g.label,
        icon: gov?.icon || g.icon,
        layers: [
          ...g.layers.filter(l => !overrides[l.id]?.deleted).map(applyOverrides),
          ...custom.filter(cl => cl.groupId === g.id).map(toLayerDef),
        ],
      };
    });

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
