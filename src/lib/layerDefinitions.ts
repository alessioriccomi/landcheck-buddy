// ══════════════════════════════════════════════════════════════
// LAYER DEFINITIONS — Verified ArcGIS REST MapServer endpoints
// Source: PCN ArcGIS REST Directory → www.pcn.minambiente.it/arcgis/rest/services
// Each URL tested via /export?f=json or GetCapabilities
// ══════════════════════════════════════════════════════════════

export interface LayerDef {
  id: string;
  label: string;
  color: string;
  defaultOn: boolean;
  wmsUrl?: string;
  wmsLayer?: string;
  arcgisUrl?: string;
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

export const LAYER_GROUPS: LayerGroup[] = [
  // ── CATASTO ──────────────────────────────────────────────────
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

  // ── RETE NATURA 2000 & AREE PROTETTE ────────────────────────
  {
    id: "ambiente",
    label: "Rete Natura 2000 & Aree Protette",
    icon: "🌿",
    layers: [
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
      {
        id: "pelagos",
        label: "Santuario Pelagos",
        color: "#06b6d4",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/Santuario_Pelagos/MapServer",
        opacity: 0.5,
        description: "Santuario dei Cetacei (Accordo Pelagos)",
      },
    ],
  },

  // ── IDROGEOLOGIA & PAI ──────────────────────────────────────
  {
    id: "idrogeologico",
    label: "Idrogeologia & PAI",
    icon: "🌊",
    layers: [
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
      {
        id: "pai_rischio",
        label: "PAI - Rischio idrogeologico",
        color: "#7c3aed",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/PAI_rischio_idrogeologico/MapServer",
        opacity: 0.5,
        description: "Mosaicatura PAI — Classi di rischio (R1→R4)",
      },
      {
        id: "alluvioni_estensione",
        label: "PGRA - Aree allagabili",
        color: "#0ea5e9",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/Alluvioni_Estensione/MapServer",
        opacity: 0.5,
        description: "Estensione aree allagabili (Dir. 2007/60/CE — D.Lgs. 49/2010)",
      },
      {
        id: "alluvioni_rischio",
        label: "PGRA - Classi di rischio alluvionale",
        color: "#1e40af",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/Alluvioni_ClasseRischio/MapServer",
        opacity: 0.5,
        description: "Classi di rischio alluvionale (Dir. 2007/60/CE)",
      },
      {
        id: "alluvioni_idrauliche",
        label: "PGRA - Caratteristiche idrauliche",
        color: "#3b82f6",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/Alluvioni_CaratteristicheIdrauliche/MapServer",
        opacity: 0.5,
        description: "Caratteristiche idrauliche delle aree allagabili",
      },
      {
        id: "alluvioni_elementi",
        label: "PGRA - Elementi a rischio",
        color: "#6366f1",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/Alluvioni_ElementiRischio/MapServer",
        opacity: 0.5,
        description: "Elementi esposti al rischio di alluvione",
      },
    ],
  },

  // ── GEOLOGIA & FRANE ────────────────────────────────────────
  {
    id: "geologia",
    label: "Geologia & Frane",
    icon: "⛰️",
    layers: [
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
      {
        id: "frane_lineari",
        label: "Frane IFFI (lineari)",
        color: "#f87171",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/Catalogo_Frane_Frane_lineari/MapServer",
        arcgisLayers: "show:0",
        opacity: 0.55,
        description: "IFFI — frane lineari",
      },
      {
        id: "frane_dgpv",
        label: "Frane IFFI (DGPV)",
        color: "#b91c1c",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/Catalogo_Frane_DGPV/MapServer",
        arcgisLayers: "show:0",
        opacity: 0.55,
        description: "IFFI — Deformazioni Gravititative Profonde di Versante",
      },
      {
        id: "frane_aree",
        label: "Frane IFFI (aree)",
        color: "#fca5a5",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/Catalogo_Frane_Aree/MapServer",
        arcgisLayers: "show:0",
        opacity: 0.55,
        description: "IFFI — aree soggette a frana",
      },
      {
        id: "geologia",
        label: "Carta geologica d'Italia",
        color: "#b45309",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/geologica/MapServer",
        opacity: 0.5,
        description: "Carta Geologica d'Italia (ISPRA — Servizio Geologico)",
      },
      {
        id: "geolitologica",
        label: "Carta geolitologica",
        color: "#92400e",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/geolitologica/MapServer",
        opacity: 0.5,
        description: "Carta geolitologica d'Italia",
      },
    ],
  },

  // ── SISMICA ─────────────────────────────────────────────────
  {
    id: "sismica",
    label: "Sismica",
    icon: "🔴",
    layers: [
      {
        id: "zonazione_sismica",
        label: "Classificazione sismica comunale",
        color: "#f97316",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/classificazione_sismica_comunale_2012/MapServer",
        opacity: 0.45,
        description: "Classificazione sismica comuni italiani (Zone 1-4) — aggiornamento 2012",
      },
      {
        id: "pericolosita_sismica_002",
        label: "Pericolosità sismica (PGA 0.02)",
        color: "#ea580c",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/pericolosita_sismica_002/MapServer",
        opacity: 0.45,
        description: "Mappa pericolosità sismica — probabilità eccedenza 2% in 50 anni",
      },
      {
        id: "pericolosita_sismica_005",
        label: "Pericolosità sismica (PGA 0.05)",
        color: "#c2410c",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/pericolosita_sismica_005/MapServer",
        opacity: 0.45,
        description: "Mappa pericolosità sismica — probabilità eccedenza 5% in 50 anni",
      },
      {
        id: "zone_sismogenetiche",
        label: "Zone sismogenetiche ZS9",
        color: "#9a3412",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/zone_sismogenetiche/MapServer",
        opacity: 0.45,
        description: "Zonazione sismogenetica ZS9 (INGV)",
      },
    ],
  },

  // ── USO DEL SUOLO ───────────────────────────────────────────
  {
    id: "uso_suolo",
    label: "Uso del suolo",
    icon: "🌾",
    layers: [
      {
        id: "corine",
        label: "CORINE Land Cover 2012",
        color: "#65a30d",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/corine_landcover_2012/MapServer",
        opacity: 0.5,
        description: "CORINE Land Cover 2012 — classificazione del territorio",
      },
      {
        id: "corine_iv",
        label: "CORINE Land Cover 2012 (IV livello)",
        color: "#4d7c0f",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/corine_landcover_2012_IV_livello/MapServer",
        opacity: 0.5,
        description: "CORINE Land Cover 2012 — IV livello dettaglio",
      },
      {
        id: "iuti",
        label: "IUTI - Inventario Uso Terre",
        color: "#84cc16",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/IUTI/MapServer",
        opacity: 0.5,
        description: "Inventario dell'Uso delle Terre d'Italia",
      },
    ],
  },

  // ── IDROGRAFIA & COSTA ──────────────────────────────────────
  {
    id: "idrografia",
    label: "Idrografia & Costa",
    icon: "💧",
    layers: [
      {
        id: "aste_fluviali",
        label: "Aste fluviali",
        color: "#0284c7",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/aste_fluviali/MapServer",
        opacity: 0.6,
        description: "Reticolo idrografico — aste fluviali principali e secondarie",
      },
      {
        id: "laghi",
        label: "Laghi e specchi d'acqua",
        color: "#0369a1",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/laghi/MapServer",
        opacity: 0.55,
        description: "Laghi e specchi d'acqua",
      },
      {
        id: "linea_costa",
        label: "Linea di costa 2009",
        color: "#0e7490",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/linea_costa_2009/MapServer",
        opacity: 0.55,
        description: "Linea di costa italiana — rilievo 2009",
      },
      {
        id: "variazione_costa",
        label: "Variazione della costa 1960-2012",
        color: "#155e75",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/variazione_linea_costa/MapServer",
        opacity: 0.55,
        description: "Variazione della linea di costa 1960-2012",
      },
      {
        id: "unita_fisiografiche",
        label: "Unità fisiografiche costiere",
        color: "#164e63",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/unita_fisiografiche/MapServer",
        opacity: 0.5,
        description: "Unità fisiografiche della costa italiana",
      },
    ],
  },

  // ── LIMITI & INFRASTRUTTURE ─────────────────────────────────
  {
    id: "infrastrutture",
    label: "Limiti & Infrastrutture",
    icon: "🏗️",
    layers: [
      {
        id: "limiti_admin",
        label: "Limiti amministrativi 2020",
        color: "#6b7280",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/limiti_amministrativi_2020/MapServer",
        opacity: 0.5,
        description: "Limiti comunali, provinciali e regionali (ISTAT 2020)",
      },
      {
        id: "ferrovie",
        label: "Ferrovie",
        color: "#374151",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/ferrovie/MapServer",
        opacity: 0.55,
        description: "Rete ferroviaria italiana",
      },
      {
        id: "porti",
        label: "Porti 2012",
        color: "#1f2937",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/porti_2012/MapServer",
        opacity: 0.55,
        description: "Porti marittimi italiani (censimento 2012)",
      },
      {
        id: "adb",
        label: "Autorità di Bacino Distrettuale",
        color: "#4b5563",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/ADB/MapServer",
        opacity: 0.45,
        description: "Perimetri delle Autorità di Bacino Distrettuale",
      },
    ],
  },

  // ── AMBIENTE & TERRITORIO ───────────────────────────────────
  {
    id: "territorio",
    label: "Ambiente & Territorio",
    icon: "🌍",
    layers: [
      {
        id: "ecopedologica",
        label: "Carta ecopedologica",
        color: "#059669",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/ecopedologica/MapServer",
        opacity: 0.45,
        description: "Carta ecopedologica d'Italia",
      },
      {
        id: "fitoclima",
        label: "Fitoclima",
        color: "#047857",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/fitoclima/MapServer",
        opacity: 0.45,
        description: "Classificazione fitoclimatica del territorio italiano",
      },
      {
        id: "erosione",
        label: "Rischio erosione",
        color: "#a16207",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/rischio_erosione/MapServer",
        opacity: 0.45,
        description: "Rischio di erosione del suolo",
      },
      {
        id: "desertificazione",
        label: "Regioni pedologiche (desertificazione)",
        color: "#854d0e",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/regioni_pedologiche_desertificazione/MapServer",
        opacity: 0.45,
        description: "Regioni pedologiche a rischio desertificazione",
      },
    ],
  },
];

// Flat map for easy lookup
export const ALL_LAYERS: LayerDef[] = LAYER_GROUPS.flatMap(g => g.layers);
