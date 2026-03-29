import { useState } from "react";
import { ArrowLeft, Save, RotateCcw, Search, Plus, Trash2, ChevronDown, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { LAYER_GROUPS, type LayerDef, type LayerGroup } from "@/lib/layerDefinitions";
import { toast } from "sonner";

const OVERRIDES_KEY = "lc_layer_url_overrides";
const CUSTOM_LAYERS_KEY = "lc_custom_layers";

type Override = {
  wmsUrl?: string;
  arcgisUrl?: string;
  wmsLayer?: string;
  arcgisLayers?: string;
  fallbackUrls?: string[];
  deleted?: boolean; // soft-delete built-in layers
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

function loadOverrides(): Overrides {
  try { return JSON.parse(localStorage.getItem(OVERRIDES_KEY) || "{}"); } catch { return {}; }
}
function loadCustomLayers(): CustomLayer[] {
  try { return JSON.parse(localStorage.getItem(CUSTOM_LAYERS_KEY) || "[]"); } catch { return []; }
}

function generateId() {
  return "custom_" + Math.random().toString(36).slice(2, 10);
}

export default function Settings() {
  const navigate = useNavigate();
  const [overrides, setOverrides] = useState<Overrides>(loadOverrides);
  const [customLayers, setCustomLayers] = useState<CustomLayer[]>(loadCustomLayers);
  const [search, setSearch] = useState("");
  const [dirty, setDirty] = useState(false);
  const [expandedFallbacks, setExpandedFallbacks] = useState<Set<string>>(new Set());
  const [addingToGroup, setAddingToGroup] = useState<string | null>(null);
  const [newLayer, setNewLayer] = useState<Partial<CustomLayer>>({});

  const markDirty = () => setDirty(true);

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

  // Custom layer CRUD
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

  const saveAll = () => {
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
    localStorage.setItem(CUSTOM_LAYERS_KEY, JSON.stringify(customLayers));
    setDirty(false);
    toast.success("Configurazione salvata. Ricarica la mappa per applicare.");
  };

  const resetAll = () => {
    setOverrides({});
    setCustomLayers([]);
    localStorage.removeItem(OVERRIDES_KEY);
    localStorage.removeItem(CUSTOM_LAYERS_KEY);
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

  // Merge custom layers into groups for display
  const groupsWithCustom = LAYER_GROUPS.map(g => ({
    ...g,
    layers: [
      ...g.layers,
      ...customLayers.filter(cl => cl.groupId === g.id),
    ],
  }));

  // "Vincoli personalizzati" group for custom layers without a matching group
  const orphanCustom = customLayers.filter(cl => !LAYER_GROUPS.some(g => g.id === cl.groupId));

  const renderLayerRow = (layer: LayerDef | CustomLayer, isCustom: boolean) => {
    const ov = overrides[layer.id] || {};
    const hasOverride = !!overrides[layer.id];
    const isDeleted = ov.deleted;
    const isWms = !!(isCustom ? (layer as CustomLayer).wmsUrl : layer.wmsUrl);
    const isArcgis = !!(isCustom ? (layer as CustomLayer).arcgisUrl : layer.arcgisUrl);
    const noUrl = !isWms && !isArcgis;
    const effectiveFallbacks = ov.fallbackUrls || (layer as LayerDef).fallbackUrls || [];
    const fbExpanded = expandedFallbacks.has(layer.id);

    if (isDeleted && search) return null; // hide deleted when searching

    return (
      <div key={layer.id} className={`px-3 py-2.5 space-y-1.5 ${isDeleted ? "opacity-40" : ""}`}>
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
            {noUrl && !isCustom && (
              <p className="text-[9px] text-muted-foreground italic">Layer gestito internamente</p>
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
            <p className="text-[10px] text-muted-foreground">Aggiungi, modifica o elimina vincoli e fallback</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={resetAll} className="h-7 text-[10px] gap-1">
            <RotateCcw size={10} /> Reset tutto
          </Button>
          <Button size="sm" onClick={saveAll} disabled={!dirty} className="h-7 text-[10px] gap-1">
            <Save size={10} /> Salva
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-2 border-b border-border">
        <div className="relative max-w-md">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Cerca vincolo..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 pl-8 text-xs" />
        </div>
      </div>

      {/* Layer groups */}
      <div className="max-w-5xl mx-auto p-4 space-y-6">
        {groupsWithCustom.map(group => {
          const customInGroup = customLayers.filter(cl => cl.groupId === group.id);
          const allLayers = [
            ...group.layers.filter(l => !customLayers.some(cl => cl.id === l.id)), // built-in
            ...customInGroup, // custom
          ];
          const filteredLayers = allLayers.filter(l =>
            !search || l.label.toLowerCase().includes(lowerSearch) ||
            l.id.toLowerCase().includes(lowerSearch) ||
            ((l as LayerDef).wmsUrl || "").toLowerCase().includes(lowerSearch) ||
            ((l as LayerDef).arcgisUrl || "").toLowerCase().includes(lowerSearch)
          );
          if (filteredLayers.length === 0 && addingToGroup !== group.id) return null;

          return (
            <div key={group.id} className="border border-border rounded-lg overflow-hidden">
              <div className="bg-muted/50 px-3 py-2 border-b border-border flex items-center justify-between">
                <h2 className="text-xs font-semibold flex items-center gap-2">
                  <span>{group.icon}</span> {group.label}
                  <span className="text-[10px] text-muted-foreground font-normal">({filteredLayers.length})</span>
                </h2>
                <Button
                  variant="ghost" size="sm"
                  onClick={() => { setAddingToGroup(addingToGroup === group.id ? null : group.id); setNewLayer({}); }}
                  className="h-6 text-[10px] gap-1"
                >
                  <Plus size={10} /> Aggiungi
                </Button>
              </div>
              <div className="divide-y divide-border">
                {filteredLayers.map(l => {
                  const isCustom = customLayers.some(cl => cl.id === l.id);
                  return renderLayerRow(l, isCustom);
                })}
              </div>
              {addingToGroup === group.id && renderAddForm(group.id)}
            </div>
          );
        })}

        {/* Orphan custom layers */}
        {orphanCustom.length > 0 && (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="bg-muted/50 px-3 py-2 border-b border-border">
              <h2 className="text-xs font-semibold">🔧 Vincoli personalizzati</h2>
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
