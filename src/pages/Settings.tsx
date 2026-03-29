import { useState, useEffect } from "react";
import { ArrowLeft, Save, RotateCcw, ExternalLink, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { LAYER_GROUPS, type LayerDef } from "@/lib/layerDefinitions";
import { toast } from "sonner";

const OVERRIDES_KEY = "lc_layer_url_overrides";

type Overrides = Record<string, { wmsUrl?: string; arcgisUrl?: string; wmsLayer?: string; arcgisLayers?: string }>;

function loadOverrides(): Overrides {
  try {
    return JSON.parse(localStorage.getItem(OVERRIDES_KEY) || "{}");
  } catch { return {}; }
}

export default function Settings() {
  const navigate = useNavigate();
  const [overrides, setOverrides] = useState<Overrides>(loadOverrides);
  const [search, setSearch] = useState("");
  const [dirty, setDirty] = useState(false);

  const updateField = (layerId: string, field: string, value: string) => {
    setOverrides(prev => ({
      ...prev,
      [layerId]: { ...prev[layerId], [field]: value },
    }));
    setDirty(true);
  };

  const resetLayer = (layerId: string) => {
    setOverrides(prev => {
      const next = { ...prev };
      delete next[layerId];
      return next;
    });
    setDirty(true);
  };

  const saveAll = () => {
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
    setDirty(false);
    toast.success("URL salvati. Ricarica la mappa per applicare le modifiche.");
  };

  const resetAll = () => {
    setOverrides({});
    localStorage.removeItem(OVERRIDES_KEY);
    setDirty(false);
    toast.success("Tutti gli URL ripristinati ai valori predefiniti.");
  };

  const lowerSearch = search.toLowerCase();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="h-8 w-8">
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 className="text-sm font-bold">Impostazioni Server WMS</h1>
            <p className="text-[10px] text-muted-foreground">Visualizza e modifica gli URL di tutti i vincoli</p>
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
          <Input
            placeholder="Cerca layer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Layer groups */}
      <div className="max-w-5xl mx-auto p-4 space-y-6">
        {LAYER_GROUPS.map(group => {
          const filteredLayers = group.layers.filter(l =>
            !search || l.label.toLowerCase().includes(lowerSearch) ||
            l.id.toLowerCase().includes(lowerSearch) ||
            (l.wmsUrl || "").toLowerCase().includes(lowerSearch) ||
            (l.arcgisUrl || "").toLowerCase().includes(lowerSearch)
          );
          if (filteredLayers.length === 0) return null;

          return (
            <div key={group.id} className="border border-border rounded-lg overflow-hidden">
              <div className="bg-muted/50 px-3 py-2 border-b border-border">
                <h2 className="text-xs font-semibold flex items-center gap-2">
                  <span>{group.icon}</span> {group.label}
                  <span className="text-[10px] text-muted-foreground font-normal">({filteredLayers.length} layer)</span>
                </h2>
              </div>
              <div className="divide-y divide-border">
                {filteredLayers.map(layer => {
                  const ov = overrides[layer.id] || {};
                  const hasOverride = !!overrides[layer.id];
                  const isWms = !!layer.wmsUrl;
                  const isArcgis = !!layer.arcgisUrl;
                  const noUrl = !isWms && !isArcgis;

                  return (
                    <div key={layer.id} className="px-3 py-2.5 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: layer.color }} />
                        <span className="text-[11px] font-medium flex-1">{layer.label}</span>
                        {hasOverride && (
                          <button onClick={() => resetLayer(layer.id)} className="text-[9px] text-primary hover:underline">
                            Ripristina
                          </button>
                        )}
                        {layer.fallbackUrls && layer.fallbackUrls.length > 0 && (
                          <span className="text-[9px] bg-accent text-accent-foreground px-1.5 py-0.5 rounded">
                            {layer.fallbackUrls.length} fallback
                          </span>
                        )}
                      </div>

                      {noUrl && (
                        <p className="text-[9px] text-muted-foreground italic">Layer senza URL configurabile (gestito internamente)</p>
                      )}

                      {isWms && (
                        <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 items-center">
                          <span className="text-[9px] text-muted-foreground font-mono">WMS URL</span>
                          <Input
                            value={ov.wmsUrl ?? layer.wmsUrl ?? ""}
                            onChange={e => updateField(layer.id, "wmsUrl", e.target.value)}
                            className="h-6 text-[10px] font-mono"
                          />
                          <span className="text-[9px] text-muted-foreground font-mono">Layer</span>
                          <Input
                            value={ov.wmsLayer ?? layer.wmsLayer ?? ""}
                            onChange={e => updateField(layer.id, "wmsLayer", e.target.value)}
                            className="h-6 text-[10px] font-mono"
                          />
                        </div>
                      )}

                      {isArcgis && (
                        <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 items-center">
                          <span className="text-[9px] text-muted-foreground font-mono">ArcGIS URL</span>
                          <Input
                            value={ov.arcgisUrl ?? layer.arcgisUrl ?? ""}
                            onChange={e => updateField(layer.id, "arcgisUrl", e.target.value)}
                            className="h-6 text-[10px] font-mono"
                          />
                          <span className="text-[9px] text-muted-foreground font-mono">Layers</span>
                          <Input
                            value={ov.arcgisLayers ?? layer.arcgisLayers ?? ""}
                            onChange={e => updateField(layer.id, "arcgisLayers", e.target.value)}
                            className="h-6 text-[10px] font-mono"
                          />
                        </div>
                      )}

                      {layer.fallbackUrls && layer.fallbackUrls.length > 0 && (
                        <div className="mt-1">
                          <p className="text-[9px] text-muted-foreground mb-0.5">Fallback:</p>
                          {layer.fallbackUrls.map((fb, i) => (
                            <p key={i} className="text-[9px] font-mono text-muted-foreground truncate pl-2">↳ {fb}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
