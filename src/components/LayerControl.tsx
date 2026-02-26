import { useState } from "react";
import { Layers, Eye, EyeOff, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LayerDef {
  id: string;
  label: string;
  color: string;
  defaultOn: boolean;
  /** For WMS layers proxied via wfs-proxy mode=wms_ext */
  wmsUrl?: string;
  wmsLayer?: string;
  /** For ArcGIS REST MapServer layers (PCN) — used with /export endpoint */
  arcgisUrl?: string;
  /** Specific sublayer IDs to show (e.g. "0,1"). Omit for all layers */
  arcgisLayers?: string;
  opacity?: number;
  description?: string;
}

export interface LayerGroup {
  id: string;
  label: string;
  icon: string;
  layers: LayerDef[];
}

// ══════════════════════════════════════════════════════════════
// LAYER GROUPS — solo layer VERIFICATI con endpoint funzionanti
// Fonte: ArcGIS REST Directory PCN → www.pcn.minambiente.it/arcgis/rest/services
// Ogni URL è stato testato via GetCapabilities / export / f=json
// ══════════════════════════════════════════════════════════════

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
    id: "ambiente",
    label: "Rete Natura 2000 & Aree Protette",
    icon: "🌿",
    layers: [
      // ✅ Verificato: www.pcn.minambiente.it/arcgis/rest/services/SIC_ZSC_ZPS/MapServer (layer 0)
      {
        id: "natura2000",
        label: "Rete Natura 2000 (SIC/ZSC/ZPS)",
        color: "#10b981",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/SIC_ZSC_ZPS/MapServer",
        arcgisLayers: "show:0",
        opacity: 0.55,
        description: "SIC, ZSC e ZPS — Dir. 92/43/CEE Habitat e Dir. 79/409/CEE Uccelli",
      },
      // ✅ Verificato: www.pcn.minambiente.it/arcgis/rest/services/EUAP/MapServer (layer 0)
      {
        id: "aree_protette",
        label: "Aree protette (EUAP)",
        color: "#16a34a",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/EUAP/MapServer",
        arcgisLayers: "show:0",
        opacity: 0.5,
        description: "VI Elenco Ufficiale delle Aree Protette (L. 394/1991)",
      },
      // ✅ Verificato: www.pcn.minambiente.it/arcgis/rest/services/iba/MapServer
      {
        id: "iba",
        label: "IBA - Important Bird Areas",
        color: "#22d3ee",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/iba/MapServer",
        arcgisLayers: "show:0",
        opacity: 0.5,
        description: "Important Bird and Biodiversity Areas (BirdLife International)",
      },
      // ✅ Verificato: www.pcn.minambiente.it/arcgis/rest/services/aree_ramsar/MapServer
      {
        id: "ramsar",
        label: "Zone umide RAMSAR",
        color: "#0891b2",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/aree_ramsar/MapServer",
        arcgisLayers: "show:0",
        opacity: 0.55,
        description: "Zone umide di importanza internazionale (Convenzione Ramsar 1971)",
      },
    ],
  },
  {
    id: "idrogeologico",
    label: "Idrogeologia & PAI",
    icon: "🌊",
    layers: [
      // ✅ Verificato: www.pcn.minambiente.it/arcgis/rest/services/PAI_pericolosita_idrogeologica/MapServer
      // Layer 0=PERICOLO ALLUVIONE, 1=PERICOLO FRANA, 2=PERICOLO VALANGA
      {
        id: "pai_alluvioni",
        label: "PAI - Pericolosità alluvionale",
        color: "#2563eb",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/PAI_pericolosita_idrogeologica/MapServer",
        arcgisLayers: "show:0",
        opacity: 0.55,
        description: "Mosaicatura PAI — Pericolosità da alluvione",
      },
      {
        id: "pai_frane",
        label: "PAI - Pericolosità frana",
        color: "#dc2626",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/PAI_pericolosita_idrogeologica/MapServer",
        arcgisLayers: "show:1",
        opacity: 0.55,
        description: "Mosaicatura PAI — Pericolosità da frana (P1→P4)",
      },
      // ✅ Verificato: www.pcn.minambiente.it/arcgis/rest/services/PAI_rischio_idrogeologico/MapServer
      {
        id: "pai_rischio",
        label: "PAI - Rischio idrogeologico",
        color: "#7c3aed",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/PAI_rischio_idrogeologico/MapServer",
        opacity: 0.5,
        description: "Mosaicatura PAI — Classi di rischio (R1→R4)",
      },
      // ✅ Verificato: www.pcn.minambiente.it/arcgis/rest/services/Alluvioni_Estensione/MapServer
      {
        id: "alluvioni_estensione",
        label: "PGRA - Aree allagabili",
        color: "#0ea5e9",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/Alluvioni_Estensione/MapServer",
        opacity: 0.5,
        description: "Estensione aree allagabili (Dir. 2007/60/CE — D.Lgs. 49/2010)",
      },
    ],
  },
  {
    id: "geologia",
    label: "Geologia & Frane",
    icon: "⛰️",
    layers: [
      // ✅ Verificato: www.pcn.minambiente.it/arcgis/rest/services/Catalogo_Frane_Frane_poligonali/MapServer
      {
        id: "frane_iffi",
        label: "Frane IFFI (poligonali)",
        color: "#ef4444",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/Catalogo_Frane_Frane_poligonali/MapServer",
        arcgisLayers: "show:0",
        opacity: 0.55,
        description: "Inventario dei Fenomeni Franosi in Italia (ISPRA IFFI) — frane poligonali",
      },
      // ✅ Verificato: www.pcn.minambiente.it/arcgis/rest/services/geologica/MapServer
      {
        id: "geologia",
        label: "Carta geologica d'Italia",
        color: "#b45309",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/geologica/MapServer",
        opacity: 0.5,
        description: "Carta Geologica d'Italia (ISPRA — Servizio Geologico)",
      },
    ],
  },
  {
    id: "sismica",
    label: "Sismica",
    icon: "🔴",
    layers: [
      // ✅ Verificato: www.pcn.minambiente.it/arcgis/rest/services/classificazione_sismica_comunale_2012/MapServer
      {
        id: "zonazione_sismica",
        label: "Classificazione sismica comunale",
        color: "#f97316",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/classificazione_sismica_comunale_2012/MapServer",
        opacity: 0.45,
        description: "Classificazione sismica comuni italiani (Zone 1-4) — aggiornamento 2012",
      },
    ],
  },
  {
    id: "uso_suolo",
    label: "Uso del suolo",
    icon: "🌾",
    layers: [
      // ✅ Verificato: www.pcn.minambiente.it/arcgis/rest/services/corine_landcover_2012/MapServer
      {
        id: "corine",
        label: "CORINE Land Cover 2012",
        color: "#65a30d",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/corine_landcover_2012/MapServer",
        opacity: 0.5,
        description: "CORINE Land Cover 2012 — classificazione del territorio",
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
            <p className="text-[10px] text-muted-foreground mt-0.5">Sorgenti: PCN / ISPRA (verificate)</p>
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
              Sorgenti: Geoportale Nazionale (PCN ArcGIS), ISPRA
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
