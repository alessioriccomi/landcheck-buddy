import { useState } from "react";
import { ArrowLeft, Save, RotateCcw, Search, Plus, Trash2, ChevronDown, ChevronRight, X, Download, Upload, Wifi, WifiOff, Loader2, ShieldAlert, ShieldCheck, Edit2, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { LAYER_GROUPS, type LayerDef, type LayerGroup } from "@/lib/layerDefinitions";
import { toast } from "sonner";
import { getKnownEndpointIssue } from "@/lib/wmsEndpointIssues";

const OVERRIDES_KEY = "lc_layer_url_overrides";
const CUSTOM_LAYERS_KEY = "lc_custom_layers";
const CUSTOM_GROUPS_KEY = "lc_custom_groups";
const TLS_BYPASS_KEY = "lc_tls_bypass";
const GROUP_OVERRIDES_KEY = "lc_group_overrides";

type GroupOverride = {
  label?: string;
  icon?: string;
  deleted?: boolean;
};
type GroupOverrides = Record<string, GroupOverride>;

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
type Overrides = Record<string, Override>;

interface CustomLayer {
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

interface CustomGroup {
  id: string;
  label: string;
  icon: string;
}

function loadOverrides(): Overrides {
  try { return JSON.parse(localStorage.getItem(OVERRIDES_KEY) || "{}"); } catch { return {}; }
}
function loadCustomLayers(): CustomLayer[] {
  try { return JSON.parse(localStorage.getItem(CUSTOM_LAYERS_KEY) || "[]"); } catch { return []; }
}
function loadCustomGroups(): CustomGroup[] {
  try { return JSON.parse(localStorage.getItem(CUSTOM_GROUPS_KEY) || "[]"); } catch { return []; }
}
function loadTlsBypass(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(TLS_BYPASS_KEY) || "{}"); } catch { return {}; }
}
function loadGroupOverrides(): GroupOverrides {
  try { return JSON.parse(localStorage.getItem(GROUP_OVERRIDES_KEY) || "{}"); } catch { return {}; }
}

function generateId() {
  return "custom_" + Math.random().toString(36).slice(2, 10);
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export default function Settings() {
  const navigate = useNavigate();
  const [overrides, setOverrides] = useState<Overrides>(loadOverrides);
  const [customLayers, setCustomLayers] = useState<CustomLayer[]>(loadCustomLayers);
  const [customGroups, setCustomGroups] = useState<CustomGroup[]>(loadCustomGroups);
  const [tlsBypass, setTlsBypass] = useState<Record<string, boolean>>(loadTlsBypass);
  const [groupOverrides, setGroupOverrides] = useState<GroupOverrides>(loadGroupOverrides);
  const [search, setSearch] = useState("");
  const [dirty, setDirty] = useState(false);
  const [expandedFallbacks, setExpandedFallbacks] = useState<Set<string>>(new Set());
  const [addingToGroup, setAddingToGroup] = useState<string | null>(null);
  const [newLayer, setNewLayer] = useState<Partial<CustomLayer>>({});
  const [testingUrls, setTestingUrls] = useState<Record<string, "checking" | "online" | "offline">>({});
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [editGroupData, setEditGroupData] = useState<{ label: string; icon: string }>({ label: "", icon: "" });
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroup, setNewGroup] = useState<{ label: string; icon: string }>({ label: "", icon: "📌" });

  // GetCapabilities Explorer state
  const [explorerUrl, setExplorerUrl] = useState("");
  const [explorerLoading, setExplorerLoading] = useState(false);
  const [explorerResults, setExplorerResults] = useState<{ name: string; id: string; title?: string }[]>([]);
  const [explorerError, setExplorerError] = useState("");
  const [explorerType, setExplorerType] = useState<"wms" | "arcgis" | null>(null);
  const [showExplorer, setShowExplorer] = useState(false);

  // ── GetCapabilities Explorer logic ──
  const exploreServer = async () => {
    if (!explorerUrl.trim()) return;
    setExplorerLoading(true);
    setExplorerResults([]);
    setExplorerError("");
    setExplorerType(null);
    try {
      const url = explorerUrl.trim();
      const isArcgis = url.includes("/MapServer") || url.includes("/rest/services/");
      setExplorerType(isArcgis ? "arcgis" : "wms");

      let probeUrl: string;
      if (isArcgis) {
        probeUrl = `${url}${url.includes("?") ? "&" : "?"}f=json`;
      } else {
        probeUrl = `${url}${url.includes("?") ? "&" : "?"}SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities`;
      }

      const resp = await fetch(
        `${SUPABASE_URL}/functions/v1/wfs-proxy?mode=wms_ext&url=${encodeURIComponent(probeUrl)}`,
        { headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` }, signal: AbortSignal.timeout(20000) }
      );
      const text = await resp.text();

      if (!resp.ok) {
        try {
          const err = JSON.parse(text);
          setExplorerError(err.userMessage || err.detail || err.error || "Errore sconosciuto");
        } catch { setExplorerError(`HTTP ${resp.status}`); }
        return;
      }

      if (isArcgis) {
        const json = JSON.parse(text);
        const layers = json.layers || json.services || [];
        if (layers.length === 0) {
          setExplorerError("Nessun layer trovato nel servizio ArcGIS");
          return;
        }
        setExplorerResults(layers.map((l: any) => ({
          name: l.name || l.mapName || `Layer ${l.id}`,
          id: String(l.id ?? ""),
          title: l.name,
        })));
      } else {
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, "text/xml");
        const layerEls = xml.querySelectorAll("Layer");
        const results: { name: string; id: string; title?: string }[] = [];
        layerEls.forEach(el => {
          const nameEl = el.querySelector(":scope > Name");
          const titleEl = el.querySelector(":scope > Title");
          if (nameEl?.textContent) {
            results.push({
              name: nameEl.textContent,
              id: nameEl.textContent,
              title: titleEl?.textContent || undefined,
            });
          }
        });
        if (results.length === 0) {
          setExplorerError("Nessun layer con <Name> trovato nella risposta WMS GetCapabilities");
          return;
        }
        setExplorerResults(results);
      }
    } catch (err: any) {
      setExplorerError(err.message || "Errore di connessione");
    } finally {
      setExplorerLoading(false);
    }
  };

  const addExplorerLayerAsCustom = (layerName: string, layerId: string, title?: string) => {
    const url = explorerUrl.trim();
    const isArcgis = explorerType === "arcgis";
    const id = generateId();
    const label = title || layerName;
    const cl: CustomLayer = {
      id,
      groupId: customGroups.length > 0 ? customGroups[0].id : "custom_explorer",
      label,
      color: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0"),
      description: `Scoperto via GetCapabilities Explorer da ${new URL(url).hostname}`,
    };
    if (isArcgis) {
      cl.arcgisUrl = url;
      cl.arcgisLayers = `show:${layerId}`;
    } else {
      cl.wmsUrl = url;
      cl.wmsLayer = layerName;
    }
    // Ensure a custom group exists
    if (!customGroups.some(g => g.id === cl.groupId)) {
      const explorerGroup: CustomGroup = { id: "custom_explorer", label: "🔍 Layer scoperti (Explorer)", icon: "🔍" };
      const newGroups = [...customGroups, explorerGroup];
      setCustomGroups(newGroups);
      localStorage.setItem(CUSTOM_GROUPS_KEY, JSON.stringify(newGroups));
      cl.groupId = "custom_explorer";
    }
    const updated = [...customLayers, cl];
    setCustomLayers(updated);
    localStorage.setItem(CUSTOM_LAYERS_KEY, JSON.stringify(updated));
    markDirty();
    toast.success(`Layer "${label}" aggiunto ai vincoli personalizzati`);
  };

  const markDirty = () => setDirty(true);

  // ── Test connection with auto-fill ──
  const testUrl = async (url: string, layerId?: string, urlType?: "wms" | "wfs" | "arcgis", isCustom?: boolean) => {
    if (!url) return;
    setTestingUrls(prev => ({ ...prev, [url]: "checking" }));
    const knownIssue = getKnownEndpointIssue(url);
    if (knownIssue) {
      setTestingUrls(prev => ({ ...prev, [url]: "offline" }));
      toast.error(knownIssue.message);
      return;
    }
    try {
      const skip = layerId ? (tlsBypass[layerId] ?? false) : false;
      const isArcgis = urlType === "arcgis" || url.includes("/rest/services/") || url.includes("/MapServer");
      const isWfs = urlType === "wfs";
      let probeUrl: string;
      if (isArcgis) {
        probeUrl = `${url}${url.includes("?") ? "&" : "?"}f=json`;
      } else if (isWfs) {
        probeUrl = `${url}${url.includes("?") ? "&" : "?"}SERVICE=WFS&VERSION=2.0.0&REQUEST=GetCapabilities`;
      } else {
        probeUrl = `${url}${url.includes("?") ? "&" : "?"}SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities`;
      }
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/wfs-proxy?mode=wms_ext&probe=true&url=${encodeURIComponent(probeUrl)}${skip ? "&skipTls=true" : ""}`, {
        headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        signal: AbortSignal.timeout(15000),
      });
      const text = await resp.text();
      let hasProxyError = false;
      try {
        const maybeJson = JSON.parse(text);
        hasProxyError = !!maybeJson?.error;
      } catch {
        hasProxyError = false;
      }
      const ok = resp.ok && !hasProxyError && !text.includes("503 Service") && !text.includes("Pagina non trovata") && !text.includes("<title>40");
      setTestingUrls(prev => ({ ...prev, [url]: ok ? "online" : "offline" }));

      // Auto-fill sub-fields from capabilities response
      if (ok && layerId) {
        try {
          if (isArcgis) {
            const json = JSON.parse(text);
            // Try to extract SRID from spatialReference
            const srid = json.spatialReference?.wkid || json.spatialReference?.latestWkid;
            if (srid && layerId) {
              autoFillField(layerId, "srid", String(srid), isCustom);
            }
            // Try to extract layers list for arcgisLayers
            if (json.layers && json.layers.length > 0) {
              const layerIds = json.layers.map((l: any) => l.id).join(",");
              // Only auto-fill if currently empty
              autoFillField(layerId, "arcgisLayers", `show:${layerIds}`, isCustom, true);
            }
          } else {
            // Parse WMS/WFS capabilities XML for layers and SRS
            const parser = new DOMParser();
            const xml = parser.parseFromString(text, "text/xml");
            // Try to get SRID from CRS/SRS elements
            const crsEls = xml.querySelectorAll("CRS, SRS");
            if (crsEls.length > 0) {
              const crsText = crsEls[0].textContent || "";
              const match = crsText.match(/EPSG:(\d+)/);
              if (match) {
                autoFillField(layerId, "srid", match[1], isCustom);
              }
            }
            // Try to get layer names
            const layerEls = xml.querySelectorAll("Layer > Name");
            if (layerEls.length > 0 && layerId) {
              const firstLayerName = layerEls[0].textContent || "";
              if (firstLayerName) {
                const fieldName = isWfs ? "wfsLayer" : "wmsLayer";
                autoFillField(layerId, fieldName, firstLayerName, isCustom, true);
              }
            }
          }
        } catch {
          // Silent fail on auto-fill parsing
        }
      }
    } catch {
      setTestingUrls(prev => ({ ...prev, [url]: "offline" }));
    }
  };

  // Auto-fill a field (only if empty when onlyIfEmpty is true)
  const autoFillField = (layerId: string, field: string, value: string, isCustom?: boolean, onlyIfEmpty?: boolean) => {
    if (isCustom) {
      setCustomLayers(prev => prev.map(l => {
        if (l.id !== layerId) return l;
        if (onlyIfEmpty && (l as any)[field]) return l;
        return { ...l, [field]: value };
      }));
    } else {
      setOverrides(prev => {
        const ov = prev[layerId] || {};
        if (onlyIfEmpty && (ov as any)[field]) return prev;
        return { ...prev, [layerId]: { ...ov, [field]: value } };
      });
    }
    markDirty();
  };

  // ── TLS bypass toggle ──
  const toggleTlsBypass = (layerId: string) => {
    setTlsBypass(prev => ({ ...prev, [layerId]: !prev[layerId] }));
    markDirty();
  };

  // ── Export/Import ──
  const exportConfig = () => {
    const config = { overrides, customLayers, customGroups, tlsBypass, groupOverrides, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `geovincoli-config-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("Configurazione esportata");
  };

  const importConfig = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const config = JSON.parse(text);
        if (config.overrides) setOverrides(config.overrides);
        if (config.customLayers) setCustomLayers(config.customLayers);
        if (config.customGroups) setCustomGroups(config.customGroups);
        if (config.tlsBypass) setTlsBypass(config.tlsBypass);
        if (config.groupOverrides) setGroupOverrides(config.groupOverrides);
        markDirty();
        toast.success("Configurazione importata. Premi Salva per applicare.");
      } catch { toast.error("File non valido"); }
    };
    input.click();
  };

  // ── Layer overrides ──
  const updateField = (layerId: string, field: string, value: string) => {
    setOverrides(prev => ({ ...prev, [layerId]: { ...prev[layerId], [field]: value } }));
    markDirty();
  };

  const updateFallback = (layerId: string, index: number, value: string) => {
    setOverrides(prev => {
      const ov = { ...prev[layerId] };
      const fbs = [...(ov.fallbackUrls || [])];
      fbs[index] = value;
      ov.fallbackUrls = fbs;
      return { ...prev, [layerId]: ov };
    });
    markDirty();
  };

  const addFallback = (layerId: string, existingFallbacks: string[]) => {
    setOverrides(prev => {
      const ov = { ...prev[layerId] };
      ov.fallbackUrls = [...(ov.fallbackUrls || existingFallbacks), ""];
      return { ...prev, [layerId]: ov };
    });
    setExpandedFallbacks(prev => new Set(prev).add(layerId));
    markDirty();
  };

  const removeFallback = (layerId: string, index: number) => {
    setOverrides(prev => {
      const ov = { ...prev[layerId] };
      const fbs = [...(ov.fallbackUrls || [])];
      fbs.splice(index, 1);
      ov.fallbackUrls = fbs;
      return { ...prev, [layerId]: ov };
    });
    markDirty();
  };

  const softDeleteLayer = (layerId: string) => {
    setOverrides(prev => ({ ...prev, [layerId]: { ...prev[layerId], deleted: true } }));
    markDirty();
  };

  const restoreLayer = (layerId: string) => {
    setOverrides(prev => {
      const next = { ...prev };
      if (next[layerId]) {
        delete next[layerId].deleted;
        if (Object.keys(next[layerId]).length === 0) delete next[layerId];
      }
      return next;
    });
    markDirty();
  };

  const resetLayer = (layerId: string) => {
    setOverrides(prev => { const next = { ...prev }; delete next[layerId]; return next; });
    markDirty();
  };

  // ── Custom layer CRUD ──
  const addCustomLayer = (groupId: string) => {
    if (!newLayer.label) { toast.error("Inserisci un nome per il vincolo"); return; }
    if (!newLayer.wmsUrl && !newLayer.wfsUrl && !newLayer.arcgisUrl) { toast.error("Inserisci almeno un URL (WMS, WFS o ArcGIS)"); return; }
    const cl: CustomLayer = {
      id: generateId(),
      groupId,
      label: newLayer.label || "Nuovo vincolo",
      color: newLayer.color || "#ff6b6b",
      wmsUrl: newLayer.wmsUrl,
      wmsLayer: newLayer.wmsLayer,
      wfsUrl: newLayer.wfsUrl,
      wfsLayer: newLayer.wfsLayer,
      arcgisUrl: newLayer.arcgisUrl,
      arcgisLayers: newLayer.arcgisLayers,
      srid: newLayer.srid,
      fallbackUrls: newLayer.fallbackUrls?.filter(Boolean),
      description: newLayer.description,
    };
    setCustomLayers(prev => [...prev, cl]);
    setNewLayer({});
    setAddingToGroup(null);
    markDirty();
  };

  const updateCustomLayer = (id: string, field: string, value: string) => {
    setCustomLayers(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
    markDirty();
  };

  const deleteCustomLayer = (id: string) => {
    setCustomLayers(prev => prev.filter(l => l.id !== id));
    markDirty();
  };

  const updateCustomFallback = (id: string, index: number, value: string) => {
    setCustomLayers(prev => prev.map(l => {
      if (l.id !== id) return l;
      const fbs = [...(l.fallbackUrls || [])];
      fbs[index] = value;
      return { ...l, fallbackUrls: fbs };
    }));
    markDirty();
  };

  const addCustomFallback = (id: string) => {
    setCustomLayers(prev => prev.map(l =>
      l.id !== id ? l : { ...l, fallbackUrls: [...(l.fallbackUrls || []), ""] }
    ));
    setExpandedFallbacks(prev => new Set(prev).add(id));
    markDirty();
  };

  const removeCustomFallback = (id: string, index: number) => {
    setCustomLayers(prev => prev.map(l => {
      if (l.id !== id) return l;
      const fbs = [...(l.fallbackUrls || [])];
      fbs.splice(index, 1);
      return { ...l, fallbackUrls: fbs };
    }));
    markDirty();
  };

  // ── Group CRUD (custom + built-in overrides) ──
  const addNewGroup = () => {
    if (!newGroup.label) { toast.error("Inserisci un nome per il gruppo"); return; }
    const grp: CustomGroup = { id: "grp_" + Math.random().toString(36).slice(2, 8), label: newGroup.label, icon: newGroup.icon || "📌" };
    setCustomGroups(prev => [...prev, grp]);
    setNewGroup({ label: "", icon: "📌" });
    setShowAddGroup(false);
    markDirty();
  };

  const updateGroup = (groupId: string) => {
    const isCustom = customGroups.some(g => g.id === groupId);
    if (isCustom) {
      setCustomGroups(prev => prev.map(g => g.id === groupId ? { ...g, label: editGroupData.label, icon: editGroupData.icon } : g));
    } else {
      setGroupOverrides(prev => ({ ...prev, [groupId]: { ...prev[groupId], label: editGroupData.label, icon: editGroupData.icon } }));
    }
    setEditingGroup(null);
    markDirty();
  };

  const deleteGroup = (groupId: string) => {
    const isCustom = customGroups.some(g => g.id === groupId);
    if (isCustom) {
      setCustomLayers(prev => prev.map(l => l.groupId === groupId ? { ...l, groupId: "_orphan" } : l));
      setCustomGroups(prev => prev.filter(g => g.id !== groupId));
    } else {
      setGroupOverrides(prev => ({ ...prev, [groupId]: { ...prev[groupId], deleted: true } }));
    }
    markDirty();
  };

  const restoreGroup = (groupId: string) => {
    setGroupOverrides(prev => {
      const next = { ...prev };
      if (next[groupId]) {
        delete next[groupId].deleted;
        if (Object.keys(next[groupId]).length === 0) delete next[groupId];
      }
      return next;
    });
    markDirty();
  };

  const resetGroupOverride = (groupId: string) => {
    setGroupOverrides(prev => { const next = { ...prev }; delete next[groupId]; return next; });
    markDirty();
  };

  // ── Save/Reset ──
  const saveAll = () => {
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
    localStorage.setItem(CUSTOM_LAYERS_KEY, JSON.stringify(customLayers));
    localStorage.setItem(CUSTOM_GROUPS_KEY, JSON.stringify(customGroups));
    localStorage.setItem(TLS_BYPASS_KEY, JSON.stringify(tlsBypass));
    localStorage.setItem(GROUP_OVERRIDES_KEY, JSON.stringify(groupOverrides));
    setDirty(false);
    toast.success("Configurazione salvata. Ricarica la mappa per applicare.");
  };

  const resetAll = () => {
    setOverrides({});
    setCustomLayers([]);
    setCustomGroups([]);
    setTlsBypass({});
    setGroupOverrides({});
    localStorage.removeItem(OVERRIDES_KEY);
    localStorage.removeItem(CUSTOM_LAYERS_KEY);
    localStorage.removeItem(CUSTOM_GROUPS_KEY);
    localStorage.removeItem(TLS_BYPASS_KEY);
    localStorage.removeItem(GROUP_OVERRIDES_KEY);
    setDirty(false);
    toast.success("Tutto ripristinato ai valori predefiniti.");
  };

  const toggleFallbacks = (id: string) => {
    setExpandedFallbacks(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const lowerSearch = search.toLowerCase();

  // Build full group list
  const allGroups: (LayerGroup & { isCustomGroup?: boolean; isDeletedGroup?: boolean; hasGroupOverride?: boolean })[] = [
    ...LAYER_GROUPS.map(g => {
      const ov = groupOverrides[g.id];
      return {
        ...g,
        label: ov?.label || g.label,
        icon: ov?.icon || g.icon,
        isCustomGroup: false,
        isDeletedGroup: ov?.deleted === true,
        hasGroupOverride: !!ov && !ov.deleted,
      };
    }),
    ...customGroups.map(cg => ({
      ...cg,
      layers: [] as LayerDef[],
      isCustomGroup: true,
      isDeletedGroup: false,
      hasGroupOverride: false,
    })),
  ];

  const groupsWithCustom = allGroups.map(g => ({
    ...g,
    layers: [
      ...g.layers,
      ...customLayers.filter(cl => cl.groupId === g.id),
    ],
  }));

  const allGroupIds = new Set([...LAYER_GROUPS.map(g => g.id), ...customGroups.map(g => g.id)]);
  const orphanCustom = customLayers.filter(cl => !allGroupIds.has(cl.groupId));

  const TestBtn = ({ url, layerId, urlType, isCustom }: { url: string; layerId?: string; urlType?: "wms" | "wfs" | "arcgis"; isCustom?: boolean }) => {
    const st = testingUrls[url];
    return (
      <button onClick={() => testUrl(url, layerId, urlType, isCustom)} className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded border border-border hover:bg-muted" title="Test connessione (auto-compila campi)">
        {st === "checking" ? <Loader2 size={8} className="animate-spin" /> : st === "online" ? <Wifi size={8} className="text-green-500" /> : st === "offline" ? <WifiOff size={8} className="text-destructive" /> : <Wifi size={8} />}
        <span>{st === "checking" ? "..." : st === "online" ? "OK" : st === "offline" ? "KO" : "Test"}</span>
      </button>
    );
  };

  // Render the 3 URL sections for a layer
  const renderUrlSections = (layer: LayerDef | CustomLayer, isCustom: boolean) => {
    const ov = overrides[layer.id] || {};
    const isTlsBypassed = tlsBypass[layer.id] ?? false;

    const getVal = (field: string) => {
      if (isCustom) return (layer as any)[field] || "";
      return (ov as any)[field] ?? (layer as any)[field] ?? "";
    };

    const setVal = (field: string, value: string) => {
      if (isCustom) updateCustomLayer(layer.id, field, value);
      else updateField(layer.id, field, value);
    };

    const wmsUrl = getVal("wmsUrl");
    const wfsUrl = getVal("wfsUrl");
    const arcgisUrl = getVal("arcgisUrl");
    const srid = getVal("srid");
    const hasAnyUrl = wmsUrl || wfsUrl || arcgisUrl;

    return (
      <div className="space-y-2">
        {/* SRID */}
        <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 items-center">
          <span className="text-[9px] text-muted-foreground font-mono">SRID</span>
          <Input value={srid} onChange={e => setVal("srid", e.target.value)} placeholder="es. 32632, 4326, 3003" className="h-6 text-[10px] font-mono w-40" />
        </div>

        {/* WMS Section */}
        <div className="border border-border/50 rounded p-2 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">WMS</span>
            {wmsUrl && <TestBtn url={wmsUrl} layerId={layer.id} urlType="wms" isCustom={isCustom} />}
          </div>
          <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 items-center">
            <span className="text-[9px] text-muted-foreground font-mono">URL</span>
            <Input value={wmsUrl} onChange={e => setVal("wmsUrl", e.target.value)} placeholder="https://..." className="h-6 text-[10px] font-mono" />
            <span className="text-[9px] text-muted-foreground font-mono">Layer</span>
            <Input value={getVal("wmsLayer")} onChange={e => setVal("wmsLayer", e.target.value)} placeholder="nome layer WMS" className="h-6 text-[10px] font-mono" />
          </div>
        </div>

        {/* WFS Section */}
        <div className="border border-border/50 rounded p-2 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">WFS</span>
            {wfsUrl && <TestBtn url={wfsUrl} layerId={layer.id} urlType="wfs" isCustom={isCustom} />}
          </div>
          <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 items-center">
            <span className="text-[9px] text-muted-foreground font-mono">URL</span>
            <Input value={wfsUrl} onChange={e => setVal("wfsUrl", e.target.value)} placeholder="https://..." className="h-6 text-[10px] font-mono" />
            <span className="text-[9px] text-muted-foreground font-mono">Layer</span>
            <Input value={getVal("wfsLayer")} onChange={e => setVal("wfsLayer", e.target.value)} placeholder="nome layer WFS" className="h-6 text-[10px] font-mono" />
          </div>
        </div>

        {/* ArcGIS REST Section */}
        <div className="border border-border/50 rounded p-2 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">ArcGIS REST</span>
            {arcgisUrl && <TestBtn url={arcgisUrl} layerId={layer.id} urlType="arcgis" isCustom={isCustom} />}
          </div>
          <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 items-center">
            <span className="text-[9px] text-muted-foreground font-mono">URL</span>
            <Input value={arcgisUrl} onChange={e => setVal("arcgisUrl", e.target.value)} placeholder="https://..." className="h-6 text-[10px] font-mono" />
            <span className="text-[9px] text-muted-foreground font-mono">Layers</span>
            <Input value={getVal("arcgisLayers")} onChange={e => setVal("arcgisLayers", e.target.value)} placeholder="show:0,1,2" className="h-6 text-[10px] font-mono" />
          </div>
        </div>

        {/* TLS bypass */}
        {hasAnyUrl && (
          <div className="flex items-center gap-2">
            <Switch
              checked={isTlsBypassed}
              onCheckedChange={() => toggleTlsBypass(layer.id)}
              className="h-3.5 w-7"
            />
            <span className="text-[9px] text-muted-foreground flex items-center gap-1">
              {isTlsBypassed ? (
                <><ShieldAlert size={9} className="text-amber-500" /> Bypass TLS attivo</>
              ) : (
                <><ShieldCheck size={9} className="text-green-600" /> Verifica TLS</>
              )}
            </span>
          </div>
        )}
      </div>
    );
  };

  const renderLayerRow = (layer: LayerDef | CustomLayer, isCustom: boolean) => {
    const ov = overrides[layer.id] || {};
    const hasOverride = !!overrides[layer.id];
    const isDeleted = ov.deleted;
    const effectiveFallbacks = ov.fallbackUrls || (layer as LayerDef).fallbackUrls || [];
    const fbExpanded = expandedFallbacks.has(layer.id);

    if (isDeleted && search) return null;

    return (
      <div key={layer.id} className={`px-3 py-2.5 space-y-1.5 ${isDeleted ? "opacity-40" : ""}`}>
        {/* System-managed layer note */}
        {layer.id === "catasto" && !isCustom && (
          <div className="flex items-center gap-1.5 bg-primary/5 border border-primary/20 rounded px-2 py-1 mb-1">
            <span className="text-[9px]">🔒</span>
            <span className="text-[9px] text-primary font-medium">Layer gestito dal sistema — gli endpoint catastali sono integrati nel motore di ricerca WFS interno</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: layer.color }} />
          <span className={`text-[11px] font-medium flex-1 ${isDeleted ? "line-through" : ""}`}>
            {layer.label}
            {isCustom && <span className="ml-1 text-[9px] bg-primary/10 text-primary px-1 rounded">custom</span>}
          </span>
          <div className="flex items-center gap-1">
            {isDeleted ? (
              <button onClick={() => restoreLayer(layer.id)} className="text-[9px] text-primary hover:underline">Ripristina</button>
            ) : (
              <>
                {hasOverride && !isCustom && (
                  <button onClick={() => resetLayer(layer.id)} className="text-[9px] text-primary hover:underline">Reset</button>
                )}
                {isCustom ? (
                  <button onClick={() => deleteCustomLayer(layer.id)} className="p-0.5 text-muted-foreground hover:text-destructive">
                    <Trash2 size={11} />
                  </button>
                ) : (
                  <button onClick={() => softDeleteLayer(layer.id)} className="p-0.5 text-muted-foreground hover:text-destructive" title="Nascondi vincolo">
                    <X size={11} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {!isDeleted && (
          <>
            {isCustom && (
              <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 items-center mb-2">
                <span className="text-[9px] text-muted-foreground">Nome</span>
                <Input value={layer.label} onChange={e => updateCustomLayer(layer.id, "label", e.target.value)} className="h-6 text-[10px]" />
                <span className="text-[9px] text-muted-foreground">Colore</span>
                <div className="flex gap-1 items-center">
                  <input type="color" value={layer.color} onChange={e => updateCustomLayer(layer.id, "color", e.target.value)} className="w-6 h-6 rounded cursor-pointer border-0" />
                  <Input value={layer.color} onChange={e => updateCustomLayer(layer.id, "color", e.target.value)} className="h-6 text-[10px] font-mono w-24" />
                </div>
              </div>
            )}

            {/* 3 URL sections (WMS, WFS, ArcGIS) + SRID */}
            {renderUrlSections(layer, isCustom)}

            {/* Fallback URLs */}
            <div className="mt-1">
              <button onClick={() => toggleFallbacks(layer.id)} className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground">
                {fbExpanded ? <ChevronDown size={9} /> : <ChevronRight size={9} />}
                Fallback ({effectiveFallbacks.length})
              </button>
              {fbExpanded && (
                <div className="ml-3 mt-1 space-y-1">
                  {effectiveFallbacks.map((fb, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <span className="text-[9px] text-muted-foreground">↳</span>
                      {isCustom ? (
                        <Input value={fb} onChange={e => updateCustomFallback(layer.id, i, e.target.value)} className="h-5 text-[9px] font-mono flex-1" />
                      ) : (
                        <Input value={fb} onChange={e => updateFallback(layer.id, i, e.target.value)} className="h-5 text-[9px] font-mono flex-1" />
                      )}
                      {fb && <TestBtn url={fb} layerId={layer.id} />}
                      <button onClick={() => isCustom ? removeCustomFallback(layer.id, i) : removeFallback(layer.id, i)} className="text-muted-foreground hover:text-destructive">
                        <X size={9} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => isCustom ? addCustomFallback(layer.id) : addFallback(layer.id, (layer as LayerDef).fallbackUrls || [])}
                    className="text-[9px] text-primary hover:underline flex items-center gap-0.5"
                  >
                    <Plus size={8} /> Aggiungi fallback
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  const renderAddForm = (groupId: string) => (
    <div className="px-3 py-3 bg-primary/5 border-t border-border space-y-2">
      <p className="text-[10px] font-semibold text-foreground">Nuovo vincolo</p>
      <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 items-center">
        <span className="text-[9px] text-muted-foreground">Nome *</span>
        <Input value={newLayer.label || ""} onChange={e => setNewLayer(p => ({ ...p, label: e.target.value }))} placeholder="es. Vincolo idrogeologico" className="h-6 text-[10px]" />
        <span className="text-[9px] text-muted-foreground">Colore</span>
        <div className="flex gap-1 items-center">
          <input type="color" value={newLayer.color || "#ff6b6b"} onChange={e => setNewLayer(p => ({ ...p, color: e.target.value }))} className="w-6 h-6 rounded cursor-pointer border-0" />
          <Input value={newLayer.color || "#ff6b6b"} onChange={e => setNewLayer(p => ({ ...p, color: e.target.value }))} className="h-6 text-[10px] font-mono w-24" />
        </div>
        <span className="text-[9px] text-muted-foreground">SRID</span>
        <Input value={newLayer.srid || ""} onChange={e => setNewLayer(p => ({ ...p, srid: e.target.value }))} placeholder="es. 32632" className="h-6 text-[10px] font-mono w-24" />
      </div>
      <div className="space-y-2 mt-2">
        <div className="border border-border/50 rounded p-2 space-y-1">
          <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">WMS</span>
          <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 items-center">
            <span className="text-[9px] text-muted-foreground font-mono">URL</span>
            <Input value={newLayer.wmsUrl || ""} onChange={e => setNewLayer(p => ({ ...p, wmsUrl: e.target.value }))} placeholder="https://..." className="h-6 text-[10px] font-mono" />
            <span className="text-[9px] text-muted-foreground font-mono">Layer</span>
            <Input value={newLayer.wmsLayer || ""} onChange={e => setNewLayer(p => ({ ...p, wmsLayer: e.target.value }))} className="h-6 text-[10px] font-mono" />
          </div>
        </div>
        <div className="border border-border/50 rounded p-2 space-y-1">
          <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">WFS</span>
          <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 items-center">
            <span className="text-[9px] text-muted-foreground font-mono">URL</span>
            <Input value={newLayer.wfsUrl || ""} onChange={e => setNewLayer(p => ({ ...p, wfsUrl: e.target.value }))} placeholder="https://..." className="h-6 text-[10px] font-mono" />
            <span className="text-[9px] text-muted-foreground font-mono">Layer</span>
            <Input value={newLayer.wfsLayer || ""} onChange={e => setNewLayer(p => ({ ...p, wfsLayer: e.target.value }))} className="h-6 text-[10px] font-mono" />
          </div>
        </div>
        <div className="border border-border/50 rounded p-2 space-y-1">
          <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">ArcGIS REST</span>
          <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 items-center">
            <span className="text-[9px] text-muted-foreground font-mono">URL</span>
            <Input value={newLayer.arcgisUrl || ""} onChange={e => setNewLayer(p => ({ ...p, arcgisUrl: e.target.value }))} placeholder="https://..." className="h-6 text-[10px] font-mono" />
            <span className="text-[9px] text-muted-foreground font-mono">Layers</span>
            <Input value={newLayer.arcgisLayers || ""} onChange={e => setNewLayer(p => ({ ...p, arcgisLayers: e.target.value }))} placeholder="show:0" className="h-6 text-[10px] font-mono" />
          </div>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={() => { setAddingToGroup(null); setNewLayer({}); }} className="h-6 text-[10px]">Annulla</Button>
        <Button size="sm" onClick={() => addCustomLayer(groupId)} className="h-6 text-[10px]">Aggiungi</Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="h-8 w-8">
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 className="text-sm font-bold">Impostazioni Vincoli</h1>
            <p className="text-[10px] text-muted-foreground">Gestisci gruppi, vincoli, URL (WMS/WFS/ArcGIS), SRID e fallback</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={importConfig} className="h-7 text-[10px] gap-1">
            <Upload size={10} /> Importa
          </Button>
          <Button variant="ghost" size="sm" onClick={exportConfig} className="h-7 text-[10px] gap-1">
            <Download size={10} /> Esporta
          </Button>
          <Button variant="outline" size="sm" onClick={resetAll} className="h-7 text-[10px] gap-1">
            <RotateCcw size={10} /> Reset
          </Button>
          <Button size="sm" onClick={saveAll} disabled={!dirty} className="h-7 text-[10px] gap-1">
            <Save size={10} /> Salva
          </Button>
        </div>
      </div>

      {/* Search + Add Group */}
      <div className="px-4 py-2 border-b border-border flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Cerca vincolo..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 pl-8 text-xs" />
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowAddGroup(!showAddGroup)} className="h-8 text-[10px] gap-1">
          <FolderPlus size={12} /> Nuovo gruppo
        </Button>
      </div>

      {/* Add Group form */}
      {showAddGroup && (
        <div className="px-4 py-3 border-b border-border bg-primary/5">
          <div className="max-w-md flex items-center gap-2">
            <Input
              value={newGroup.icon}
              onChange={e => setNewGroup(p => ({ ...p, icon: e.target.value }))}
              className="h-7 text-sm w-12 text-center"
              placeholder="📌"
            />
            <Input
              value={newGroup.label}
              onChange={e => setNewGroup(p => ({ ...p, label: e.target.value }))}
              className="h-7 text-xs flex-1"
              placeholder="Nome del gruppo..."
            />
            <Button size="sm" onClick={addNewGroup} className="h-7 text-[10px]">Crea</Button>
            <Button variant="ghost" size="sm" onClick={() => setShowAddGroup(false)} className="h-7 text-[10px]">Annulla</Button>
          </div>
        </div>
      )}

      {/* GetCapabilities Explorer */}
      <div className="px-4 py-2 border-b border-border">
        <button
          onClick={() => setShowExplorer(!showExplorer)}
          className="flex items-center gap-2 text-xs font-semibold text-foreground hover:text-primary transition-colors"
        >
          <Search size={14} />
          <span>GetCapabilities Explorer — Scopri layer da qualsiasi server GIS</span>
          {showExplorer ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
        {showExplorer && (
          <div className="mt-3 space-y-3 max-w-3xl">
            <div className="flex gap-2">
              <Input
                value={explorerUrl}
                onChange={e => setExplorerUrl(e.target.value)}
                placeholder="https://wms.example.it/geoserver/wms  oppure  https://.../MapServer"
                className="h-8 text-xs font-mono flex-1"
                onKeyDown={e => e.key === "Enter" && exploreServer()}
              />
              <Button size="sm" onClick={exploreServer} disabled={explorerLoading || !explorerUrl.trim()} className="h-8 text-[10px] gap-1">
                {explorerLoading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                Interroga server
              </Button>
            </div>
            <p className="text-[9px] text-muted-foreground">
              Inserisci un URL WMS o ArcGIS REST MapServer. Il sistema interrogherà il GetCapabilities e mostrerà tutti i layer disponibili.
            </p>
            {explorerError && (
              <div className="bg-destructive/10 border border-destructive/30 rounded px-3 py-2 text-[10px] text-destructive">
                {explorerError}
              </div>
            )}
            {explorerResults.length > 0 && (
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-3 py-1.5 border-b border-border flex items-center justify-between">
                  <span className="text-[10px] font-semibold">
                    {explorerResults.length} layer trovati ({explorerType === "arcgis" ? "ArcGIS REST" : "WMS"})
                  </span>
                </div>
                <div className="max-h-[300px] overflow-y-auto divide-y divide-border">
                  {explorerResults.map((layer, i) => (
                    <div key={`${layer.name}-${i}`} className="px-3 py-1.5 flex items-center justify-between gap-2 hover:bg-muted/30">
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-mono text-foreground truncate block">{layer.name}</span>
                        {layer.title && layer.title !== layer.name && (
                          <span className="text-[9px] text-muted-foreground truncate block">{layer.title}</span>
                        )}
                      </div>
                      {explorerType === "arcgis" && (
                        <span className="text-[9px] text-muted-foreground font-mono shrink-0">ID: {layer.id}</span>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addExplorerLayerAsCustom(layer.name, layer.id, layer.title)}
                        className="h-5 text-[9px] gap-1 shrink-0"
                      >
                        <Plus size={9} /> Aggiungi
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Layer groups */}
      <div className="max-w-5xl mx-auto p-4 space-y-6">
        {groupsWithCustom.map(group => {
          const isDeletedGroup = (group as any).isDeletedGroup === true;
          const isCustomGroup = (group as any).isCustomGroup === true;
          const hasGroupOverride = (group as any).hasGroupOverride === true;

          const customInGroup = customLayers.filter(cl => cl.groupId === group.id);
          const allLayers = [
            ...group.layers.filter(l => !customLayers.some(cl => cl.id === l.id)),
            ...customInGroup,
          ];
          const filteredLayers = allLayers.filter(l =>
            !search || l.label.toLowerCase().includes(lowerSearch) ||
            l.id.toLowerCase().includes(lowerSearch) ||
            ((l as LayerDef).wmsUrl || "").toLowerCase().includes(lowerSearch) ||
            ((l as LayerDef).wfsUrl || "").toLowerCase().includes(lowerSearch) ||
            ((l as LayerDef).arcgisUrl || "").toLowerCase().includes(lowerSearch)
          );
          if (filteredLayers.length === 0 && addingToGroup !== group.id && !isCustomGroup && !isDeletedGroup) return null;

          const isEditingThis = editingGroup === group.id;

          return (
            <div key={group.id} className={`border border-border rounded-lg overflow-hidden ${isDeletedGroup ? "opacity-50" : ""}`}>
              <div className="bg-muted/50 px-3 py-2 border-b border-border flex items-center justify-between gap-2">
                {isEditingThis ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={editGroupData.icon}
                      onChange={e => setEditGroupData(p => ({ ...p, icon: e.target.value }))}
                      className="h-6 text-sm w-10 text-center"
                    />
                    <Input
                      value={editGroupData.label}
                      onChange={e => setEditGroupData(p => ({ ...p, label: e.target.value }))}
                      className="h-6 text-xs flex-1"
                    />
                    <Button size="sm" onClick={() => updateGroup(group.id)} className="h-6 text-[10px]">OK</Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditingGroup(null)} className="h-6 text-[10px]">Annulla</Button>
                  </div>
                ) : (
                  <h2 className={`text-xs font-semibold flex items-center gap-2 ${isDeletedGroup ? "line-through" : ""}`}>
                    <span>{group.icon}</span> {group.label}
                    {!isDeletedGroup && <span className="text-[10px] text-muted-foreground font-normal">({filteredLayers.length})</span>}
                    {isDeletedGroup && <span className="text-[10px] text-destructive font-normal">(nascosto)</span>}
                    {hasGroupOverride && !isDeletedGroup && <span className="text-[9px] bg-primary/10 text-primary px-1 rounded">modificato</span>}
                  </h2>
                )}
                {!isEditingThis && (
                  <div className="flex items-center gap-1">
                    {isDeletedGroup ? (
                      <button onClick={() => restoreGroup(group.id)} className="text-[10px] text-primary hover:underline">Ripristina</button>
                    ) : (
                      <>
                        <button
                          onClick={() => { setEditingGroup(group.id); setEditGroupData({ label: group.label, icon: group.icon }); }}
                          className="p-1 text-muted-foreground hover:text-foreground"
                          title="Modifica gruppo"
                        >
                          <Edit2 size={11} />
                        </button>
                        {hasGroupOverride && !isCustomGroup && (
                          <button onClick={() => resetGroupOverride(group.id)} className="text-[9px] text-primary hover:underline" title="Reset nome/icona originale">Reset</button>
                        )}
                        {isCustomGroup ? (
                          <button
                            onClick={() => deleteGroup(group.id)}
                            className="p-1 text-muted-foreground hover:text-destructive"
                            title="Elimina gruppo"
                          >
                            <Trash2 size={11} />
                          </button>
                        ) : (
                          <button
                            onClick={() => deleteGroup(group.id)}
                            className="p-1 text-muted-foreground hover:text-destructive"
                            title="Nascondi gruppo"
                          >
                            <X size={11} />
                          </button>
                        )}
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => { setAddingToGroup(addingToGroup === group.id ? null : group.id); setNewLayer({}); }}
                          className="h-6 text-[10px] gap-1"
                        >
                          <Plus size={10} /> Aggiungi
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
              {!isDeletedGroup && (
                <>
                  <div className="divide-y divide-border">
                    {filteredLayers.map(l => {
                      const isCustom = customLayers.some(cl => cl.id === l.id);
                      return renderLayerRow(l, isCustom);
                    })}
                    {filteredLayers.length === 0 && (
                      <p className="px-3 py-4 text-[10px] text-muted-foreground text-center italic">Nessun vincolo in questo gruppo. Usa "Aggiungi" per crearne uno.</p>
                    )}
                  </div>
                  {addingToGroup === group.id && renderAddForm(group.id)}
                </>
              )}
            </div>
          );
        })}

        {/* Orphan custom layers */}
        {orphanCustom.length > 0 && (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="bg-muted/50 px-3 py-2 border-b border-border">
              <h2 className="text-xs font-semibold">🔧 Vincoli senza gruppo</h2>
            </div>
            <div className="divide-y divide-border">
              {orphanCustom.map(l => renderLayerRow(l, true))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
