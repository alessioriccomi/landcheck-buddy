import { useState } from "react";
import { Eye, EyeOff, ChevronDown, ChevronRight, Power, PowerOff, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { LAYER_GROUPS, ALL_LAYERS, type LayerGroup } from "@/lib/layerDefinitions";
import { getServerStatusForUrl, type ServerHealth, type ServerStatus, clearHealthCache, probeAllServers } from "@/lib/wmsHealthProbe";

interface LegendPanelProps {
  layerState: Record<string, boolean>;
  layerOpacity: Record<string, number>;
  onToggleLayer: (id: string) => void;
  onSetOpacity: (id: string, opacity: number) => void;
  onToggleAllInGroup: (groupId: string, on: boolean) => void;
  serverStatuses?: Record<string, ServerHealth>;
  onRefreshStatuses?: () => void;
}

export function LegendPanel({
  layerState,
  layerOpacity,
  onToggleLayer,
  onSetOpacity,
  onToggleAllInGroup,
  serverStatuses = {},
  onRefreshStatuses,
}: LegendPanelProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(LAYER_GROUPS.map(g => [g.id, g.id === "catasto"]))
  );
  const [refreshing, setRefreshing] = useState(false);

  const toggleGroup = (gid: string) => {
    setExpandedGroups(prev => ({ ...prev, [gid]: !prev[gid] }));
  };

  const getLayerStatus = (l: { arcgisUrl?: string; wmsUrl?: string; fallbackUrls?: string[] }): ServerStatus => {
    const url = l.arcgisUrl || l.wmsUrl;
    const primaryStatus = getServerStatusForUrl(url, serverStatuses);
    // If primary is offline but a fallback is online, show as online
    if (primaryStatus === "offline" && l.fallbackUrls?.length) {
      for (const fb of l.fallbackUrls) {
        const fbStatus = getServerStatusForUrl(fb, serverStatuses);
        if (fbStatus === "online") return "online";
      }
    }
    return primaryStatus;
  };

  const isUsingFallback = (l: { arcgisUrl?: string; wmsUrl?: string; fallbackUrls?: string[] }): boolean => {
    const url = l.arcgisUrl || l.wmsUrl;
    const primaryStatus = getServerStatusForUrl(url, serverStatuses);
    if (primaryStatus !== "offline" || !l.fallbackUrls?.length) return false;
    return l.fallbackUrls.some(fb => getServerStatusForUrl(fb, serverStatuses) === "online");
  };

  const statusDot = (status: ServerStatus) => {
    switch (status) {
      case "online": return <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" title="Server online" />;
      case "offline": return <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0 animate-pulse" title="Server offline" />;
      case "checking": return <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 flex-shrink-0 animate-pulse" title="Verifica in corso..." />;
      default: return <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 flex-shrink-0" title="Stato sconosciuto" />;
    }
  };

  // Compute server summary
  const allStatuses = Object.values(serverStatuses);
  const onlineCount = allStatuses.filter(s => s.status === "online").length;
  const offlineCount = allStatuses.filter(s => s.status === "offline").length;
  const checkingCount = allStatuses.filter(s => s.status === "checking").length;
  const totalHosts = allStatuses.length;

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    clearHealthCache();
    onRefreshStatuses?.();
    setTimeout(() => setRefreshing(false), 3000);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-4 py-3 border-b border-border">
        <h2 className="text-sm font-bold text-foreground">Legenda Layer</h2>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Toggle e opacità per ogni layer WMS
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {LAYER_GROUPS.map(group => {
          const groupActive = group.layers.filter(l => layerState[l.id]).length;
          const isExpanded = expandedGroups[group.id];
          const allOn = groupActive === group.layers.length;

          return (
            <div key={group.id} className="rounded-lg">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/40 transition-colors text-left"
                >
                  <span className="text-sm">{group.icon}</span>
                  <span className="text-xs font-semibold text-foreground flex-1 leading-tight">
                    {group.label}
                  </span>
                  {groupActive > 0 && (
                    <span className="text-[10px] bg-primary/15 text-primary rounded-full px-1.5 font-bold">
                      {groupActive}
                    </span>
                  )}
                  {isExpanded
                    ? <ChevronDown size={11} className="text-muted-foreground" />
                    : <ChevronRight size={11} className="text-muted-foreground" />}
                </button>
                <button
                  onClick={() => onToggleAllInGroup(group.id, !allOn)}
                  className="p-1 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                  title={allOn ? "Disattiva tutti" : "Attiva tutti"}
                >
                  {allOn ? <PowerOff size={11} /> : <Power size={11} />}
                </button>
              </div>

              {isExpanded && (
                <div className="ml-2 mb-1 border-l border-border/40 pl-2 space-y-0.5">
                  {group.layers.map(l => {
                    const isActive = layerState[l.id] ?? false;
                    const opacity = layerOpacity[l.id] ?? (l.opacity ?? 0.5);
                    const layerStatus = getLayerStatus(l);
                    const usingFallback = isUsingFallback(l);

                    return (
                      <div key={l.id} className="group">
                        <button
                          onClick={() => onToggleLayer(l.id)}
                          className="w-full flex items-center gap-2 py-1 px-1.5 rounded hover:bg-muted/40 transition-colors text-left"
                          title={`${l.description}${layerStatus === "offline" ? " ⚠️ Server offline" : ""}`}
                        >
                          <div
                            className="w-3 h-3 rounded-sm border flex-shrink-0 transition-colors"
                            style={{
                              borderColor: l.color,
                              backgroundColor: isActive ? l.color : "transparent",
                            }}
                          />
                          <span className={cn(
                            "text-[11px] flex-1 leading-tight",
                            isActive ? "text-foreground" : "text-muted-foreground",
                            layerStatus === "offline" && "line-through opacity-60"
                          )}>
                            {l.label}
                          </span>
                          {statusDot(layerStatus)}
                          {isActive
                            ? <Eye size={10} className="text-primary flex-shrink-0" />
                            : <EyeOff size={10} className="text-muted-foreground/40 flex-shrink-0 opacity-0 group-hover:opacity-100" />}
                        </button>

                        {/* Opacity slider — shown when layer is active */}
                        {isActive && (
                          <div className="flex items-center gap-2 px-1.5 pb-1 ml-5">
                            <span className="text-[9px] text-muted-foreground w-6 flex-shrink-0">
                              {Math.round(opacity * 100)}%
                            </span>
                            <Slider
                              value={[opacity * 100]}
                              min={0}
                              max={100}
                              step={5}
                              onValueChange={([v]) => onSetOpacity(l.id, v / 100)}
                              className="flex-1 h-4"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex-shrink-0 p-2 border-t border-border space-y-1.5">
        {/* Server status summary */}
        {totalHosts > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {offlineCount > 0 ? (
                <WifiOff size={10} className="text-destructive" />
              ) : (
                <Wifi size={10} className="text-green-600" />
              )}
              <span className="text-[9px] text-muted-foreground">
                {checkingCount > 0
                  ? `Verifica ${checkingCount} server...`
                  : offlineCount > 0
                    ? `${offlineCount}/${totalHosts} server offline`
                    : `${onlineCount} server online`}
              </span>
            </div>
            <button
              onClick={handleRefresh}
              className="p-0.5 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
              title="Aggiorna stato server"
              disabled={refreshing}
            >
              <RefreshCw size={9} className={cn(refreshing && "animate-spin")} />
            </button>
          </div>
        )}
        <p className="text-[9px] text-muted-foreground text-center leading-tight">
          Sorgenti: Geoportale Nazionale (PCN), ISPRA, MiC SITAP
        </p>
      </div>
    </div>
  );
}
