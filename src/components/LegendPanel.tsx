import { useState } from "react";
import { Eye, EyeOff, ChevronDown, ChevronRight, Power, PowerOff, RefreshCw, Wifi, WifiOff, ShieldAlert, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { LAYER_GROUPS, ALL_LAYERS, type LayerGroup } from "@/lib/layerDefinitions";
import { getMergedGroups } from "@/lib/settingsLayers";
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
  const mergedGroups = getMergedGroups();

  // Normativa di riferimento per gruppo con link
  const GROUP_NORMATIVA: Record<string, { text: string; url?: string }> = {
    catasto: { text: "Agenzia delle Entrate — Catasto terreni e fabbricati", url: "https://www.agenziaentrate.gov.it/portale/aree-tematiche/catasto" },
    beni_paesaggistici_136: { text: "D.Lgs. 42/2004, Art. 136 — Beni paesaggistici decretati", url: "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2004-01-22;42" },
    paesaggistici_142: { text: "D.Lgs. 42/2004, Art. 142 — Vincoli ope legis", url: "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2004-01-22;42" },
    notevole_interesse: { text: "D.Lgs. 42/2004, Art. 136-141 — Dichiarazioni notevole interesse pubblico", url: "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2004-01-22;42" },
    aree_protette: { text: "L. 394/1991 — Aree naturali protette (EUAP)", url: "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:1991-12-06;394" },
    natura2000: { text: "Dir. 92/43/CEE (Habitat) e Dir. 2009/147/CE (Uccelli)", url: "https://www.mase.gov.it/pagina/rete-natura-2000" },
    unesco: { text: "Convenzione UNESCO 1972 — Patrimonio Mondiale", url: "https://whc.unesco.org/en/list/" },
    vincoli_idrogeologici: { text: "R.D. 3267/1923 — Vincolo idrogeologico; Progetto IFFI", url: "https://www.isprambiente.gov.it/it/progetti/cartella-progetti-in-corso/suolo-e-territorio-1/iffi-inventario-dei-fenomeni-franosi-in-italia" },
    rischio_frana: { text: "D.Lgs. 49/2010, PAI — Pericolosità e rischio frana", url: "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2010-02-23;49" },
    rischio_alluvione: { text: "Dir. 2007/60/CE, D.Lgs. 49/2010, PGRA — Rischio alluvioni", url: "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2010-02-23;49" },
    autorita_bacino: { text: "L. 183/1989, D.Lgs. 152/2006 — Autorità di Bacino Distrettuali", url: "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2006-04-03;152" },
    vincoli_urbanistici: { text: "D.P.R. 380/2001, L.R. — Strumenti urbanistici", url: "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.del.presidente.della.repubblica:2001-06-06;380" },
    rete_ecologica: { text: "Dir. 92/43/CEE, Conv. Ramsar 1971, L. 157/1992 — Rete ecologica", url: "https://www.mase.gov.it/pagina/rete-ecologica" },
    infrastrutture: { text: "D.M. 449/1988, D.M. 17/04/2008 — Fasce di rispetto infrastrutture" },
    fotovoltaico: { text: "D.Lgs. 199/2021, DM 21/06/2024 — Aree idonee e non idonee FER", url: "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2021-11-08;199" },
    fasce_rispetto: { text: "Normative settoriali — Fasce di rispetto e servitù" },
    sismica: { text: "OPCM 3274/2003, NTC 2018 — Classificazione sismica", url: "https://www.protezionecivile.gov.it/it/approfondimento/classificazione-sismica/" },
    uso_suolo: { text: "Corine Land Cover / DUSAF — Uso del suolo", url: "https://land.copernicus.eu/en/products/corine-land-cover" },
    idrografia: { text: "Reticolo idrografico — ISPRA / PCN" },
    territorio: { text: "Dati territoriali — Confini, DTM, ortofoto" },
  };

  const getGroupNormativa = (groupId: string): { text: string; url?: string } | undefined => {
    if (GROUP_NORMATIVA[groupId]) return GROUP_NORMATIVA[groupId];
    if (groupId.startsWith("reg_")) return { text: "Normativa regionale — Piani paesaggistici e PAI regionali" };
    return undefined;
  };

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(mergedGroups.map(g => [g.id, g.id === "catasto"]))
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
      case "tls_error": return <span className="flex-shrink-0" title="Certificato TLS non valido"><ShieldAlert size={10} className="text-amber-500" /></span>;
      case "checking": return <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 flex-shrink-0 animate-pulse" title="Verifica in corso..." />;
      default: return <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 flex-shrink-0" title="Stato sconosciuto" />;
    }
  };

  // Compute server summary
  const allStatuses = Object.values(serverStatuses);
  const onlineCount = allStatuses.filter(s => s.status === "online").length;
  const offlineCount = allStatuses.filter(s => s.status === "offline").length;
  const tlsErrorCount = allStatuses.filter(s => s.status === "tls_error").length;
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
    <TooltipProvider delayDuration={200}>
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-4 py-3 border-b border-border">
        <h2 className="text-sm font-bold text-foreground">Legenda Layer</h2>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Toggle e opacità per ogni layer WMS
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {mergedGroups.map(group => {
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
                            (layerStatus === "offline" || layerStatus === "tls_error") && "line-through opacity-60"
                          )}>
                            {l.label}
                          </span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex cursor-help text-muted-foreground hover:text-primary transition-colors flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                <Info size={11} />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs space-y-1 text-xs">
                              <p className="font-semibold">{l.label}</p>
                              <p className="text-muted-foreground">{l.description}</p>
                              {(() => {
                                const norm = getGroupNormativa(group.id);
                                if (!norm) return null;
                                return norm.url ? (
                                  <a href={norm.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline italic block" onClick={(e) => e.stopPropagation()}>
                                    📜 {norm.text} ↗
                                  </a>
                                ) : (
                                  <p className="text-[10px] text-primary/80 italic">📜 {norm.text}</p>
                                );
                              })()}
                              {(l.arcgisUrl || l.wmsUrl) && (
                                <p className="text-[10px] text-muted-foreground/70 break-all">URL: {l.arcgisUrl || l.wmsUrl}</p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                          {usingFallback && (
                            <span className="text-[8px] bg-amber-500/20 text-amber-600 rounded px-1 flex-shrink-0 font-semibold" title="Usando server alternativo (ISPRA)">
                              FB
                            </span>
                          )}
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
                  : offlineCount > 0 || tlsErrorCount > 0
                    ? `${offlineCount + tlsErrorCount}/${totalHosts} non disponibili${tlsErrorCount > 0 ? ` (${tlsErrorCount} TLS)` : ""}`
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
    </TooltipProvider>
  );
}
