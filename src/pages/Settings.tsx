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
  arcgisUrl?: string;
  wmsLayer?: string;
  arcgisLayers?: string;
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
  arcgisUrl?: string;
  arcgisLayers?: string;
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

  const markDirty = () => setDirty(true);

  // ── Test connection ──
  const testUrl = async (url: string, layerId?: string) => {
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
      const isArcgis = url.includes("/rest/services/") || url.includes("/MapServer");
      const probeUrl = isArcgis ? `${url}${url.includes("?") ? "&" : "?"}f=json` : `${url}${url.includes("?") ? "&" : "?"}SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities`;
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/wfs-proxy?mode=wms_ext&url=${encodeURIComponent(probeUrl)}${skip ? "&skipTls=true" : ""}`, {
        headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        signal: AbortSignal.timeout(15000),
      });
      const text = await resp.text();
      const ok = resp.ok && !text.includes("503 Service") && !text.includes("Pagina non trovata") && !text.includes("<title>40");
      setTestingUrls(prev => ({ ...prev, [url]: ok ? "online" : "offline" }));
    } catch {
      setTestingUrls(prev => ({ ...prev, [url]: "offline" }));
    }
  };

  // ── TLS bypass toggle ──
  const toggleTlsBypass = (layerId: string) => {
    setTlsBypass(prev => ({ ...prev, [layerId]: !prev[layerId] }));
    markDirty();
  };

  // ── Export/Import ──
  const exportConfig = () => {
    const config = { overrides, customLayers, customGroups, tlsBypass, exportedAt: new Date().toISOString() };
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
    if (!newLayer.wmsUrl && !newLayer.arcgisUrl) { toast.error("Inserisci almeno un URL (WMS o ArcGIS)"); return; }
    const cl: CustomLayer = {
      id: generateId(),
      groupId,
      label: newLayer.label || "Nuovo vincolo",
      color: newLayer.color || "#ff6b6b",
      wmsUrl: newLayer.wmsUrl,
      wmsLayer: newLayer.wmsLayer,
      arcgisUrl: newLayer.arcgisUrl,
      arcgisLayers: newLayer.arcgisLayers,
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
      // Built-in group: store override
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
      // Built-in group: soft-delete via override
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

  // Build full group list: built-in (with overrides applied, excluding soft-deleted) + custom groups
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

  // Merge custom layers into their respective groups
  const groupsWithCustom = allGroups.map(g => ({
    ...g,
    layers: [
      ...g.layers,
      ...customLayers.filter(cl => cl.groupId === g.id),
    ],
  }));

  // Orphan custom layers (group doesn't exist in built-in or custom groups)
  const allGroupIds = new Set([...LAYER_GROUPS.map(g => g.id), ...customGroups.map(g => g.id)]);
  const orphanCustom = customLayers.filter(cl => !allGroupIds.has(cl.groupId));

  const TestBtn = ({ url, layerId }: { url: string; layerId?: string }) => {
    const st = testingUrls[url];
    return (
      <button onClick={() => testUrl(url, layerId)} className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded border border-border hover:bg-muted" title="Test connessione">
        {st === "checking" ? <Loader2 size={8} className="animate-spin" /> : st === "online" ? <Wifi size={8} className="text-green-500" /> : st === "offline" ? <WifiOff size={8} className="text-destructive" /> : <Wifi size={8} />}
        <span>{st === "checking" ? "..." : st === "online" ? "OK" : st === "offline" ? "KO" : "Test"}</span>
      </button>
    );
  };

  const renderLayerRow = (layer: LayerDef | CustomLayer, isCustom: boolean) => {
    const ov = overrides[layer.id] || {};
    const hasOverride = !!overrides[layer.id];
    const isDeleted = ov.deleted;
    const isWms = !!(isCustom ? (layer as CustomLayer).wmsUrl : layer.wmsUrl);
    const isArcgis = !!(isCustom ? (layer as CustomLayer).arcgisUrl : layer.arcgisUrl);
    const noUrl = !isWms && !isArcgis;
    const effectiveFallbacks = ov.fallbackUrls || (layer as LayerDef).fallbackUrls || [];
    const fbExpanded = expandedFallbacks.has(layer.id);
    const primaryUrl = isCustom
      ? ((layer as CustomLayer).wmsUrl || (layer as CustomLayer).arcgisUrl || "")
      : (ov.wmsUrl || ov.arcgisUrl || layer.wmsUrl || layer.arcgisUrl || "");
    const isTlsBypassed = tlsBypass[layer.id] ?? false;

    if (isDeleted && search) return null;

    return (
      <div key={layer.id} className={`px-3 py-2.5 space-y-1.5 ${isDeleted ? "opacity-40" : ""}`}>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: layer.color }} />
          <span className={`text-[11px] font-medium flex-1 ${isDeleted ? "line-through" : ""}`}>
            {layer.label}
            {isCustom && <span className="ml-1 text-[9px] bg-primary/10 text-primary px-1 rounded">custom</span>}
          </span>
          <div className="flex items-center gap-1">
            {!isDeleted && primaryUrl && <TestBtn url={primaryUrl} layerId={layer.id} />}
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
            {noUrl && !isCustom && (
              <p className="text-[9px] text-muted-foreground italic">Layer gestito internamente</p>
            )}

            {/* TLS bypass toggle */}
            {(isWms || isArcgis) && (
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

            {isCustom && (
              <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 items-center">
                <span className="text-[9px] text-muted-foreground">Nome</span>
                <Input value={layer.label} onChange={e => updateCustomLayer(layer.id, "label", e.target.value)} className="h-6 text-[10px]" />
                <span className="text-[9px] text-muted-foreground">Colore</span>
                <div className="flex gap-1 items-center">
                  <input type="color" value={layer.color} onChange={e => updateCustomLayer(layer.id, "color", e.target.value)} className="w-6 h-6 rounded cursor-pointer border-0" />
                  <Input value={layer.color} onChange={e => updateCustomLayer(layer.id, "color", e.target.value)} className="h-6 text-[10px] font-mono w-24" />
                </div>
                {(layer as CustomLayer).wmsUrl !== undefined && (
                  <>
                    <span className="text-[9px] text-muted-foreground font-mono">WMS URL</span>
                    <Input value={(layer as CustomLayer).wmsUrl || ""} onChange={e => updateCustomLayer(layer.id, "wmsUrl", e.target.value)} className="h-6 text-[10px] font-mono" />
                    <span className="text-[9px] text-muted-foreground font-mono">Layer</span>
                    <Input value={(layer as CustomLayer).wmsLayer || ""} onChange={e => updateCustomLayer(layer.id, "wmsLayer", e.target.value)} className="h-6 text-[10px] font-mono" />
                  </>
                )}
                {(layer as CustomLayer).arcgisUrl !== undefined && (
                  <>
                    <span className="text-[9px] text-muted-foreground font-mono">ArcGIS URL</span>
                    <Input value={(layer as CustomLayer).arcgisUrl || ""} onChange={e => updateCustomLayer(layer.id, "arcgisUrl", e.target.value)} className="h-6 text-[10px] font-mono" />
                    <span className="text-[9px] text-muted-foreground font-mono">Layers</span>
                    <Input value={(layer as CustomLayer).arcgisLayers || ""} onChange={e => updateCustomLayer(layer.id, "arcgisLayers", e.target.value)} className="h-6 text-[10px] font-mono" />
                  </>
                )}
              </div>
            )}

            {!isCustom && isWms && (
              <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 items-center">
                <span className="text-[9px] text-muted-foreground font-mono">WMS URL</span>
                <Input value={ov.wmsUrl ?? layer.wmsUrl ?? ""} onChange={e => updateField(layer.id, "wmsUrl", e.target.value)} className="h-6 text-[10px] font-mono" />
                <span className="text-[9px] text-muted-foreground font-mono">Layer</span>
                <Input value={ov.wmsLayer ?? (layer as LayerDef).wmsLayer ?? ""} onChange={e => updateField(layer.id, "wmsLayer", e.target.value)} className="h-6 text-[10px] font-mono" />
              </div>
            )}

            {!isCustom && isArcgis && (
              <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 items-center">
                <span className="text-[9px] text-muted-foreground font-mono">ArcGIS URL</span>
                <Input value={ov.arcgisUrl ?? layer.arcgisUrl ?? ""} onChange={e => updateField(layer.id, "arcgisUrl", e.target.value)} className="h-6 text-[10px] font-mono" />
                <span className="text-[9px] text-muted-foreground font-mono">Layers</span>
                <Input value={ov.arcgisLayers ?? (layer as LayerDef).arcgisLayers ?? ""} onChange={e => updateField(layer.id, "arcgisLayers", e.target.value)} className="h-6 text-[10px] font-mono" />
              </div>
            )}

            {/* Fallback URLs */}
            {(isWms || isArcgis) && (
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
            )}
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
        <span className="text-[9px] text-muted-foreground">WMS URL</span>
        <Input value={newLayer.wmsUrl || ""} onChange={e => setNewLayer(p => ({ ...p, wmsUrl: e.target.value }))} placeholder="https://..." className="h-6 text-[10px] font-mono" />
        <span className="text-[9px] text-muted-foreground">WMS Layer</span>
        <Input value={newLayer.wmsLayer || ""} onChange={e => setNewLayer(p => ({ ...p, wmsLayer: e.target.value }))} className="h-6 text-[10px] font-mono" />
        <span className="text-[9px] text-muted-foreground">ArcGIS URL</span>
        <Input value={newLayer.arcgisUrl || ""} onChange={e => setNewLayer(p => ({ ...p, arcgisUrl: e.target.value }))} placeholder="https://..." className="h-6 text-[10px] font-mono" />
        <span className="text-[9px] text-muted-foreground">ArcGIS Layers</span>
        <Input value={newLayer.arcgisLayers || ""} onChange={e => setNewLayer(p => ({ ...p, arcgisLayers: e.target.value }))} placeholder="show:0" className="h-6 text-[10px] font-mono" />
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
            <p className="text-[10px] text-muted-foreground">Gestisci gruppi, vincoli, URL e fallback</p>
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

      {/* Layer groups */}
      <div className="max-w-5xl mx-auto p-4 space-y-6">
        {groupsWithCustom.map(group => {
          const customInGroup = customLayers.filter(cl => cl.groupId === group.id);
          const allLayers = [
            ...group.layers.filter(l => !customLayers.some(cl => cl.id === l.id)),
            ...customInGroup,
          ];
          const filteredLayers = allLayers.filter(l =>
            !search || l.label.toLowerCase().includes(lowerSearch) ||
            l.id.toLowerCase().includes(lowerSearch) ||
            ((l as LayerDef).wmsUrl || "").toLowerCase().includes(lowerSearch) ||
            ((l as LayerDef).arcgisUrl || "").toLowerCase().includes(lowerSearch)
          );
          if (filteredLayers.length === 0 && addingToGroup !== group.id && !(group as any).isCustomGroup) return null;

          const isCustomGroup = (group as any).isCustomGroup === true;
          const isEditingThis = editingGroup === group.id;

          return (
            <div key={group.id} className="border border-border rounded-lg overflow-hidden">
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
                  <h2 className="text-xs font-semibold flex items-center gap-2">
                    <span>{group.icon}</span> {group.label}
                    <span className="text-[10px] text-muted-foreground font-normal">({filteredLayers.length})</span>
                  </h2>
                )}
                {!isEditingThis && (
                  <div className="flex items-center gap-1">
                    {isCustomGroup && (
                      <>
                        <button
                          onClick={() => { setEditingGroup(group.id); setEditGroupData({ label: group.label, icon: group.icon }); }}
                          className="p-1 text-muted-foreground hover:text-foreground"
                          title="Modifica gruppo"
                        >
                          <Edit2 size={11} />
                        </button>
                        <button
                          onClick={() => deleteGroup(group.id)}
                          className="p-1 text-muted-foreground hover:text-destructive"
                          title="Elimina gruppo"
                        >
                          <Trash2 size={11} />
                        </button>
                      </>
                    )}
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => { setAddingToGroup(addingToGroup === group.id ? null : group.id); setNewLayer({}); }}
                      className="h-6 text-[10px] gap-1"
                    >
                      <Plus size={10} /> Aggiungi
                    </Button>
                  </div>
                )}
              </div>
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
