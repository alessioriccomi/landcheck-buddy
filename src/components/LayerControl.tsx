import { useState } from "react";
import { Layers, Eye, EyeOff, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LayerDef {
  id: string;
  label: string;
  color: string;
  defaultOn: boolean;
  wmsUrl?: string;
  wmsLayer?: string;
  opacity?: number;
  description?: string;
}

export interface LayerGroup {
  id: string;
  label: string;
  icon: string;
  layers: LayerDef[];
}

export const LAYER_GROUPS: LayerGroup[] = [
  {
    id: "catasto",
    label: "Catasto",
    icon: "🗺️",
    layers: [
      {
        id: "catasto",
        label: "Catasto particellare",
        color: "#f59e0b",
        defaultOn: true,
        description: "Particelle catastali ufficiali (Agenzia delle Entrate)",
      },
    ],
  },
  {
    id: "beni_culturali",
    label: "Beni Culturali",
    icon: "🏛️",
    layers: [
      {
        id: "vincoli_culturali",
        label: "Vincoli culturali (MiC)",
        color: "#7c3aed",
        defaultOn: false,
        wmsUrl: "https://geodata.mit.gov.it/geoserver/wms",
        wmsLayer: "mic:vincoli_culturali",
        opacity: 0.6,
        description: "Beni vincolati ex D.Lgs. 42/2004 artt. 10, 45, 136",
      },
      {
        id: "vincoli_paesaggistici_mic",
        label: "Vincoli paesaggistici (MiC)",
        color: "#9333ea",
        defaultOn: false,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/wms_t/Vincoli_Paesaggistici.map",
        wmsLayer: "VP.VINCOLI_PAESAGGISTICI",
        opacity: 0.55,
        description: "Vincoli ex D.Lgs. 42/2004 art. 136 e 142 (Geoportale Nazionale)",
      },
    ],
  },
  {
    id: "paesaggio",
    label: "Paesaggio",
    icon: "🌄",
    layers: [
      {
        id: "paesaggistici",
        label: "Vincoli paesaggistici ex lege",
        color: "#8b5cf6",
        defaultOn: true,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/wms_t/Vincoli_Paesaggistici.map",
        wmsLayer: "VP.VINCOLI_PAESAGGISTICI",
        opacity: 0.55,
        description: "Art. 142 D.Lgs. 42/2004: fascia costiera, fiumi, boschi, montagna",
      },
      {
        id: "uso_suolo",
        label: "Uso del suolo (CORINE)",
        color: "#65a30d",
        defaultOn: false,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/wms_t/Uso_Suolo.map",
        wmsLayer: "US.USO_SUOLO",
        opacity: 0.5,
        description: "CORINE Land Cover — classificazione del territorio",
      },
    ],
  },
  {
    id: "idrogeologico",
    label: "Idrogeologia & PAI",
    icon: "🌊",
    layers: [
      {
        id: "idrogeologici",
        label: "Vincolo idrogeologico (RD 3267/23)",
        color: "#3b82f6",
        defaultOn: false,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/wms_t/Vincolo_Idrogeologico.map",
        wmsLayer: "VI.VINCOLO_IDROGEOLOGICO",
        opacity: 0.5,
        description: "Regio Decreto 3267/1923 - aree soggette a vincolo idrogeologico forestale",
      },
      {
        id: "pai",
        label: "PAI - Pericolosità frana",
        color: "#dc2626",
        defaultOn: false,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/wms_t/PAI_Frane.map",
        wmsLayer: "PAI.FRANE",
        opacity: 0.55,
        description: "Inventario Fenomeni Franosi (ISPRA IfFI) - classi P1→P4",
      },
      {
        id: "pai_alluvioni",
        label: "PAI - Pericolosità alluvionale",
        color: "#2563eb",
        defaultOn: false,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/wms_t/PGRA.map",
        wmsLayer: "PGRA.PGRA_P",
        opacity: 0.5,
        description: "PGRA - Piano di Gestione Rischio Alluvioni (Dir. 2007/60/CE)",
      },
      {
        id: "reticolo_idrografico",
        label: "Reticolo idrografico",
        color: "#0ea5e9",
        defaultOn: false,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/wms_t/Idrografia.map",
        wmsLayer: "HY.PHYSICALWATERS.WATERBODIES",
        opacity: 0.6,
        description: "Corsi d'acqua principali e fascia di rispetto 150m (art. 142 D.Lgs. 42/2004)",
      },
    ],
  },
  {
    id: "ambiente",
    label: "Rete Natura 2000 & Aree Protette",
    icon: "🌿",
    layers: [
      {
        id: "natura2000",
        label: "Rete Natura 2000 (ZSC/ZPS)",
        color: "#10b981",
        defaultOn: false,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/wms_t/N2000.map",
        wmsLayer: "N2000.ZSC_SIC_ZPS",
        opacity: 0.5,
        description: "ZSC, SIC e ZPS - obbligatorio Screening VINCA (Dir. 92/43/CEE, 79/409/CEE)",
      },
      {
        id: "aree_protette",
        label: "Aree protette (Parchi e Riserve)",
        color: "#16a34a",
        defaultOn: false,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/wms_t/Aree_Protette.map",
        wmsLayer: "AP.AREE_PROTETTE",
        opacity: 0.5,
        description: "Parchi nazionali, regionali e riserve naturali (L. 394/1991)",
      },
      {
        id: "ramsar",
        label: "Zone umide RAMSAR",
        color: "#0891b2",
        defaultOn: false,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/wms_t/Ramsar.map",
        wmsLayer: "RAMSAR.ZONE_UMIDE",
        opacity: 0.55,
        description: "Zone umide di importanza internazionale (Convenzione Ramsar 1971)",
      },
    ],
  },
  {
    id: "agricolo",
    label: "Agricolo & Forestale",
    icon: "🌾",
    layers: [
      {
        id: "boschi",
        label: "Boschi e foreste",
        color: "#166534",
        defaultOn: false,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/wms_t/Boschi.map",
        wmsLayer: "FO.BOSCHI",
        opacity: 0.55,
        description: "Inventario Nazionale delle Foreste (D.Lgs. 34/2018 TUFF)",
      },
      {
        id: "incendi_boschivi",
        label: "Aree percorse da incendio",
        color: "#ea580c",
        defaultOn: false,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/wms_t/Incendi.map",
        wmsLayer: "IF.INCENDI_PERCORSI",
        opacity: 0.55,
        description: "Catasto aree percorse da fuoco - vincolo 15 anni (L. 353/2000)",
      },
    ],
  },
  {
    id: "infrastrutture",
    label: "Infrastrutture & Reti",
    icon: "⚡",
    layers: [
      {
        id: "elettrodotti",
        label: "Elettrodotti AT/AAT (Terna)",
        color: "#eab308",
        defaultOn: false,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/wms_t/Rete_Elettrica.map",
        wmsLayer: "RE.ELETTRODOTTI_AT",
        opacity: 0.7,
        description: "Linee ad Alta Tensione - fascia DPA (DPCM 8/7/2003 - L. 36/2001)",
      },
      {
        id: "strade",
        label: "Rete stradale (ANAS)",
        color: "#6b7280",
        defaultOn: false,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/wms_t/Viabilita.map",
        wmsLayer: "TN.RoadTransportNetwork.RoadLink",
        opacity: 0.6,
        description: "Strade statali e provinciali con fasce di rispetto (D.Lgs. 285/1992)",
      },
      {
        id: "ferrovie",
        label: "Rete ferroviaria (RFI)",
        color: "#b45309",
        defaultOn: false,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/wms_t/Ferrovia.map",
        wmsLayer: "TN.RailTransportNetwork.RailwayLink",
        opacity: 0.6,
        description: "Ferrovie - fascia di rispetto 30m (D.P.R. 753/1980)",
      },
    ],
  },
  {
    id: "sismica",
    label: "Sismica",
    icon: "🔴",
    layers: [
      {
        id: "zonazione_sismica",
        label: "Zonazione sismica",
        color: "#f97316",
        defaultOn: false,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/wms_t/Pericolosita_Sismica.map",
        wmsLayer: "PS.PERICOLOSITA_SISMICA",
        opacity: 0.45,
        description: "Classificazione sismica comuni (Zone 1-4) - OPCM 3274/2003, NTC 2018",
      },
    ],
  },
  {
    id: "militare",
    label: "Militare & Aeroporti",
    icon: "✈️",
    layers: [
      {
        id: "aeroporti",
        label: "Zone rispetto aeroportuale (ENAC)",
        color: "#64748b",
        defaultOn: false,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/wms_t/Aeroporti.map",
        wmsLayer: "TN.AirTransportNetwork.AerodromeArea",
        opacity: 0.55,
        description: "Superfici di rispetto aeroportuale (ENAC) - limitazioni altezze strutture",
      },
    ],
  },
];

// Flat map for easy lookup
export const ALL_LAYERS: LayerDef[] = LAYER_GROUPS.flatMap(g => g.layers);

interface LayerControlProps {
  onChange: (active: Record<string, boolean>) => void;
}

export function LayerControl({ onChange }: LayerControlProps) {
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
          <div className="p-3 border-b border-border/50 sticky top-0 bg-card/98 backdrop-blur z-10">
            <p className="text-xs font-semibold text-foreground">Layer Vincolistici</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Sorgenti WMS pubbliche italiane</p>
          </div>

          <div className="p-2 space-y-0.5">
            {LAYER_GROUPS.map(group => {
              const groupActive = group.layers.filter(l => active[l.id]).length;
              const isExpanded = expandedGroups[group.id];

              return (
                <div key={group.id}>
                  {/* Group header */}
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

                  {/* Layer rows */}
                  {isExpanded && (
                    <div className="ml-2 mb-1 border-l border-border/40 pl-2 space-y-0.5">
                      {group.layers.map(l => (
                        <button
                          key={l.id}
                          onClick={() => toggle(l.id)}
                          className="w-full flex items-center gap-2 py-1 px-1.5 rounded hover:bg-muted/40 transition-colors text-left group"
                          title={l.description}
                        >
                          <div
                            className="w-3 h-3 rounded-sm border flex-shrink-0 transition-colors"
                            style={{
                              borderColor: l.color,
                              backgroundColor: active[l.id] ? l.color : "transparent",
                            }}
                          />
                          <span className={cn(
                            "text-[11px] flex-1 leading-tight",
                            active[l.id] ? "text-foreground" : "text-muted-foreground"
                          )}>
                            {l.label}
                          </span>
                          {active[l.id]
                            ? <Eye size={10} className="text-primary flex-shrink-0" />
                            : <EyeOff size={10} className="text-muted-foreground/40 flex-shrink-0 opacity-0 group-hover:opacity-100" />
                          }
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-2 border-t border-border/50">
            <p className="text-[9px] text-muted-foreground text-center leading-tight">
              Sorgenti: Geoportale Nazionale, ISPRA, MASE, MiC, PCN
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
