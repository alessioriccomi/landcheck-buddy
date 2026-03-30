import { useState } from "react";
import { Layers, Eye, EyeOff, ChevronDown, ChevronRight, AlertCircle, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { LAYER_GROUPS, ALL_LAYERS, type LayerGroup, type LayerDef } from "@/lib/layerDefinitions";
import { getServerStatusForUrl, type ServerHealth, type ServerStatus } from "@/lib/wmsHealthProbe";
import { useNavigate } from "react-router-dom";

export type { LayerDef, LayerGroup } from "@/lib/layerDefinitions";
export { LAYER_GROUPS, ALL_LAYERS } from "@/lib/layerDefinitions";

interface LayerControlProps {
  onChange: (active: Record<string, boolean>) => void;
  serverStatuses?: Record<string, ServerHealth>;
}

export function LayerControl({ onChange, serverStatuses = {} }: LayerControlProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<Record<string, boolean>>(
    Object.fromEntries(ALL_LAYERS.map(l => [l.id, l.defaultOn]))
  );
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(LAYER_GROUPS.map(g => [g.id, g.id === "catasto"]))
  );

  const toggle = (id: string) => {
    const next = { ...active, [id]: !active[id] };
    setActive(next);
    onChange(next);
  };

  const toggleGroup = (gid: string) => {
    setExpandedGroups(prev => ({ ...prev, [gid]: !prev[gid] }));
  };

  const getLayerStatus = (layer: LayerDef): ServerStatus => {
    const url = layer.arcgisUrl || layer.wmsUrl;
    return getServerStatusForUrl(url, serverStatuses);
  };

  const activeCount = Object.values(active).filter(Boolean).length;

  return (
    <div className="absolute top-3 right-3 z-[1000]">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 bg-card/95 backdrop-blur border border-border rounded-lg px-3 py-2 shadow-lg text-xs font-medium text-foreground hover:bg-muted/60 transition-colors"
      >
        <Layers size={14} />
        Layer WMS
        {activeCount > 0 && (
          <span className="bg-primary text-primary-foreground rounded-full px-1.5 py-0 text-[10px] font-bold">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="mt-1.5 bg-card/98 backdrop-blur border border-border rounded-xl shadow-xl w-64 max-h-[75vh] overflow-y-auto">
          <div className="p-3 border-b border-border/50 sticky top-0 bg-card/98 backdrop-blur z-10 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-foreground">Layer Vincolistici</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Sorgenti: PCN / ISPRA / Regionali</p>
            </div>
            <button
              onClick={() => navigate("/settings")}
              className="p-1 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
              title="Impostazioni Layer"
            >
              <Settings size={14} />
            </button>
          </div>

          <div className="p-2 space-y-0.5">
            {LAYER_GROUPS.map(group => {
              const groupActive = group.layers.filter(l => active[l.id]).length;
              const isExpanded = expandedGroups[group.id];

              return (
                <div key={group.id}>
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/40 transition-colors text-left"
                  >
                    <span className="text-sm">{group.icon}</span>
                    <span className="text-xs font-semibold text-foreground flex-1">{group.label}</span>
                    {groupActive > 0 && (
                      <span className="text-[10px] bg-primary/15 text-primary rounded-full px-1.5 font-bold">
                        {groupActive}
                      </span>
                    )}
                    {isExpanded
                      ? <ChevronDown size={11} className="text-muted-foreground" />
                      : <ChevronRight size={11} className="text-muted-foreground" />
                    }
                  </button>

                  {isExpanded && (
                    <div className="ml-2 mb-1 border-l border-border/40 pl-2 space-y-0.5">
                      {group.layers.map(l => {
                        const status = getLayerStatus(l);
                        const isOffline = status === "offline" || status === "tls_error" || status === "forbidden";
                        const hasUrl = !!(l.wmsUrl || l.arcgisUrl);

                        return (
                          <button
                            key={l.id}
                            onClick={() => !isOffline && toggle(l.id)}
                            disabled={isOffline && hasUrl}
                            className={cn(
                              "w-full flex items-center gap-2 py-1 px-1.5 rounded hover:bg-muted/40 transition-colors text-left group",
                              isOffline && hasUrl && "opacity-50 cursor-not-allowed"
                            )}
                            title={
                              isOffline && hasUrl
                                ? `Server non disponibile — configura nelle impostazioni`
                                : l.description
                            }
                          >
                            {/* Status dot */}
                            {hasUrl && (
                              <span className={cn(
                                "w-1.5 h-1.5 rounded-full flex-shrink-0",
                                status === "online" && "bg-green-500",
                                status === "offline" && "bg-red-500",
                                status === "tls_error" && "bg-amber-500",
                                status === "forbidden" && "bg-orange-500",
                                status === "checking" && "bg-blue-400 animate-pulse",
                                status === "unknown" && "bg-muted-foreground/30",
                              )} />
                            )}
                            <div
                              className="w-3 h-3 rounded-sm border flex-shrink-0 transition-colors"
                              style={{
                                borderColor: l.color,
                                backgroundColor: active[l.id] ? l.color : "transparent",
                              }}
                            />
                            <span className={cn(
                              "text-[11px] flex-1 leading-tight",
                              active[l.id] ? "text-foreground" : "text-muted-foreground",
                              isOffline && hasUrl && "line-through"
                            )}>
                              {l.label}
                            </span>
                            {isOffline && hasUrl ? (
                              <AlertCircle size={10} className="text-destructive flex-shrink-0" />
                            ) : active[l.id] ? (
                              <Eye size={10} className="text-primary flex-shrink-0" />
                            ) : (
                              <EyeOff size={10} className="text-muted-foreground/40 flex-shrink-0 opacity-0 group-hover:opacity-100" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-2 border-t border-border/50">
            <p className="text-[9px] text-muted-foreground text-center leading-tight">
              Sorgenti: Geoportale Nazionale (PCN ArcGIS), ISPRA
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
