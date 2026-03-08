// ══════════════════════════════════════════════════════════════
// LAYER DEFINITIONS — Verified ArcGIS REST / WMS endpoints
// National: PCN (www.pcn.minambiente.it), ISPRA, MiC
// Regional: Geoportali regionali ufficiali
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
  /** Bounding box [south, west, north, east] — layer only loads when map intersects */
  bounds?: [number, number, number, number];
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

  // ══════════════════════════════════════════════════════════════
  // BENI CULTURALI — D.Lgs. 42/2004 (Codice dei Beni Culturali)
  // ══════════════════════════════════════════════════════════════
  {
    id: "beni_culturali",
    label: "Beni Culturali (D.Lgs. 42/2004)",
    icon: "🏛️",
    layers: [
      {
        id: "vincoli_art136",
        label: "Vincoli paesaggistici (Art. 136)",
        color: "#9333ea",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/Vincoli_136/MapServer",
        opacity: 0.55,
        description: "Immobili e aree di notevole interesse pubblico — D.Lgs. 42/2004 Art. 136",
      },
      {
        id: "vincoli_art142",
        label: "Aree tutelate per legge (Art. 142)",
        color: "#7c3aed",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/Vincoli_142/MapServer",
        opacity: 0.50,
        description: "Aree tutelate per legge — D.Lgs. 42/2004 Art. 142 (coste, fiumi, boschi, montagne, zone umide, vulcani, parchi, foreste, usi civici, zone archeologiche)",
      },
      {
        id: "vincoli_archeo",
        label: "Zone di interesse archeologico",
        color: "#a855f7",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/Vincoli_architettonici_archeologici/MapServer",
        opacity: 0.55,
        description: "Vincoli architettonici e archeologici — D.Lgs. 42/2004 (Vincoli in Rete / MiC)",
      },
      {
        id: "rischio_beni_esposti",
        label: "Rischio beni esposti",
        color: "#c084fc",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/Rischio_beni_esposti/MapServer",
        opacity: 0.55,
        description: "Beni culturali e ambientali esposti a rischio — PCN",
      },
      {
        id: "immobili_vincolati",
        label: "Immobili vincolati (Art. 10-13)",
        color: "#6d28d9",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/Immobili_vincolati/MapServer",
        opacity: 0.55,
        description: "Beni culturali immobili sottoposti a tutela — D.Lgs. 42/2004 Art. 10-13",
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
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/Alluvioni_Classi_di__di__di__di__di__di__di__di__di__di__di_Rischio/MapServer",
        opacity: 0.5,
        description: "Classi di rischio alluvionale (Dir. 2007/60/CE)",
      },
      {
        id: "alluvioni_idrauliche",
        label: "PGRA - Caratteristiche idrauliche",
        color: "#3b82f6",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis_/res_t/se_rvic_es/A_lluv_ioni__Car_atte_rist_icheIdrauliche/MapServer",
        opacity: 0.5,
        description: "Caratteristiche idrauliche delle aree allagabili",
      },
      {
        id: "alluvioni_elementi",
        label: "PGRA - Elementi a rischio",
        color: "#6366f1",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambien_a_te.it_a_/arcg_a_is/re_a_st/se_a_rvice_a_s/All_a_uvion_a_i_Ele_a_mentiRischio/MapServer",
        opacity: 0.5,
        description: "Elementi esposti al rischio di alluvione",
      },
      {
        id: "vincolo_idrogeologico",
        label: "Vincolo idrogeologico (R.D. 3267/1923)",
        color: "#1d4ed8",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/PAI_pericolosita_idrogeologica/MapServer",
        arcgisLayers: "show:2",
        opacity: 0.5,
        description: "Aree sottoposte a vincolo idrogeologico — R.D. 3267/1923",
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
        arcgisUrl: "https://www.pcn.miZone_sismogenetiche_ZS9ne_sismogenetiche_ZS9ne_sismogenetiche/MapServer",
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
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/corcover_2012_IV_livello/MapServer",
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
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/Laghi_specchi_acqua/MapServer",
        opacity: 0.55,
        description: "Laghi e specchi d'acqua",
      },
      {
        id: "linea_costa",
        label: "Linea di costa 2009",
        color: "#0e7490",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/linea_di_costa_2009/MapServer",
        opacity: 0.55,
        description: "Linea di costa italiana — rilievo 2009",
      },
      {
        id: "variazione_costa",
        label: "Variazione della costa 1960-2012",
        color: "#155e75",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/Variazione_costa_1960_2012/MapServer",
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
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/Limiti_amministrativi_2020/MapServer",
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
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/Porti_2012/MapServer",
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

  // ══════════════════════════════════════════════════════════════
  // IRRADIANZA SOLARE & AREE IDONEE FOTOVOLTAICO
  // ══════════════════════════════════════════════════════════════
  {
    id: "fotovoltaico",
    label: "Fotovoltaico & Irradianza",
    icon: "☀️",
    layers: [
      {
        id: "irradianza_globale",
        label: "Irradianza solare globale (media annua)",
        color: "#f59e0b",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/irradianza_solare/MapServer",
        opacity: 0.5,
        description: "Irradianza solare globale media annuale su piano orizzontale (kWh/m²/anno) — ENEA/RSE",
      },
      {
        id: "irradianza_diretta",
        label: "Irradianza diretta normale (DNI)",
        color: "#d97706",
        defaultOn: false,
        arcgisUrl: "https://www.pcn.minambiente.it/arcgis/rest/services/irradianza_solare_diretta/MapServer",
        opacity: 0.5,
        description: "Irradianza diretta normale media annuale — rilevante per CSP e tracker",
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // VINCOLI REGIONALI — Geoportali ufficiali
  // Ogni layer ha bounds per caricarsi solo nella regione corretta
  // ══════════════════════════════════════════════════════════════

  // ── PUGLIA ──────────────────────────────────────────────────
  {
    id: "reg_puglia",
    label: "🇮🇹 Puglia",
    icon: "📍",
    layers: [
      {
        id: "puglia_pptr",
        label: "PPTR - Piano Paesaggistico",
        color: "#7c3aed",
        defaultOn: false,
        arcgisUrl: "https://webapps.sit.puglia.it/arcgis/rest/services/PPTR/PPTR_ambiti_paesaggistici/MapServer",
        opacity: 0.5,
        bounds: [39.78, 15.33, 42.23, 18.52],
        description: "Piano Paesaggistico Territoriale Regionale — ambiti paesaggistici",
      },
      {
        id: "puglia_vincolo_idro",
        label: "Vincolo idrogeologico Puglia",
        color: "#2563eb",
        defaultOn: false,
        arcgisUrl: "https://webapps.sit.puglia.it/arcgis/rest/services/Idrogeomorfologia/Vincolo_Idrogeologico/MapServer",
        opacity: 0.5,
        bounds: [39.78, 15.33, 42.23, 18.52],
        description: "Aree soggette a vincolo idrogeologico — Regione Puglia",
      },
      {
        id: "puglia_olivi",
        label: "Olivi monumentali (L.R. 14/2007)",
        color: "#65a30d",
        defaultOn: false,
        arcgisUrl: "https://webapps.sit.puglia.it/arcgis/rest/services/Agricoltura/Olivi_Monumentali/MapServer",
        opacity: 0.55,
        bounds: [39.78, 15.33, 42.23, 18.52],
        description: "Olivi monumentali e di pregio — L.R. Puglia 14/2007",
      },
      {
        id: "puglia_aree_non_idonee",
        label: "Aree non idonee FER Puglia",
        color: "#dc2626",
        defaultOn: false,
        arcgisUrl: "https://webapps.sit.puglia.it/arcgis/rest/services/Energia/Aree_non_idonee_FER/MapServer",
        opacity: 0.5,
        bounds: [39.78, 15.33, 42.23, 18.52],
        description: "Aree non idonee all'installazione di impianti FER — R.R. Puglia 24/2010",
      },
      {
        id: "puglia_usi_civici",
        label: "Usi civici Puglia",
        color: "#78716c",
        defaultOn: false,
        arcgisUrl: "https://webapps.sit.puglia.it/arcgis/rest/services/Demanio/Usi_civici/MapServer",
        opacity: 0.5,
        bounds: [39.78, 15.33, 42.23, 18.52],
        description: "Terreni gravati da usi civici — Regione Puglia",
      },
    ],
  },

  // ── TOSCANA ─────────────────────────────────────────────────
  {
    id: "reg_toscana",
    label: "🇮🇹 Toscana",
    icon: "📍",
    layers: [
      {
        id: "toscana_vincolo_paesaggistico",
        label: "Vincolo paesaggistico Toscana",
        color: "#a855f7",
        defaultOn: false,
        wmsUrl: "https://www502.regione.toscana.it/geoscopio/paesaggio.html",
        wmsLayer: "rt_vincpae.idvinpae_rt",
        arcgisUrl: "https://www502.regione.toscana.it/arcgis/rest/services/paesaggio/vincoli_paesaggistici/MapServer",
        opacity: 0.5,
        bounds: [42.24, 9.69, 44.47, 12.37],
        description: "Vincoli paesaggistici — Geoscopio Regione Toscana",
      },
      {
        id: "toscana_vincolo_idro",
        label: "Vincolo idrogeologico Toscana",
        color: "#2563eb",
        defaultOn: false,
        arcgisUrl: "https://www502.regione.toscana.it/arcgis/rest/services/geologia/vincolo_idrogeologico/MapServer",
        opacity: 0.5,
        bounds: [42.24, 9.69, 44.47, 12.37],
        description: "Vincolo idrogeologico — Geoscopio Regione Toscana",
      },
      {
        id: "toscana_uso_suolo",
        label: "Uso del suolo Toscana",
        color: "#65a30d",
        defaultOn: false,
        arcgisUrl: "https://www502.regione.toscana.it/arcgis/rest/services/ambiente/uso_suolo/MapServer",
        opacity: 0.5,
        bounds: [42.24, 9.69, 44.47, 12.37],
        description: "Carta dell'uso del suolo — Regione Toscana",
      },
    ],
  },

  // ── LOMBARDIA ───────────────────────────────────────────────
  {
    id: "reg_lombardia",
    label: "🇮🇹 Lombardia",
    icon: "📍",
    layers: [
      {
        id: "lombardia_vincolo_idro",
        label: "Vincolo idrogeologico Lombardia",
        color: "#2563eb",
        defaultOn: false,
        arcgisUrl: "https://www.cartografia.servizirl.it/arcgis2/rest/services/Idrogeologia/Vincolo_Idrogeologico/MapServer",
        opacity: 0.5,
        bounds: [44.68, 8.50, 46.64, 11.43],
        description: "Vincolo idrogeologico — Geoportale Lombardia",
      },
      {
        id: "lombardia_pgt",
        label: "PGT - Piani di Governo del Territorio",
        color: "#7c3aed",
        defaultOn: false,
        arcgisUrl: "https://www.cartografia.servizirl.it/arcgis2/rest/services/Urbanistica/PGT_mosaico/MapServer",
        opacity: 0.45,
        bounds: [44.68, 8.50, 46.64, 11.43],
        description: "Mosaicatura PGT comunali — Regione Lombardia",
      },
      {
        id: "lombardia_boschi",
        label: "Boschi e foreste Lombardia",
        color: "#166534",
        defaultOn: false,
        arcgisUrl: "https://www.cartografia.servizirl.it/arcgis2/rest/services/Ambiente/Uso_suolo_DUSAF/MapServer",
        opacity: 0.5,
        bounds: [44.68, 8.50, 46.64, 11.43],
        description: "DUSAF — Destinazione d'Uso dei Suoli Agricoli e Forestali",
      },
    ],
  },

  // ── CAMPANIA ────────────────────────────────────────────────
  {
    id: "reg_campania",
    label: "🇮🇹 Campania",
    icon: "📍",
    layers: [
      {
        id: "campania_pai",
        label: "PAI Campania",
        color: "#dc2626",
        defaultOn: false,
        arcgisUrl: "https://sit2.regione.campania.it/arcgis/rest/services/Difesa_suolo/PAI_Pericolosita/MapServer",
        opacity: 0.5,
        bounds: [39.99, 13.76, 41.51, 15.81],
        description: "PAI pericolosità idraulica e da frana — Regione Campania",
      },
      {
        id: "campania_vincolo_paesaggistico",
        label: "Vincolo paesaggistico Campania",
        color: "#a855f7",
        defaultOn: false,
        arcgisUrl: "https://sit2.regione.campania.it/arcgis/rest/services/Paesaggio/Vincoli_paesaggistici/MapServer",
        opacity: 0.5,
        bounds: [39.99, 13.76, 41.51, 15.81],
        description: "Vincoli paesaggistici — Regione Campania",
      },
    ],
  },

  // ── SICILIA ─────────────────────────────────────────────────
  {
    id: "reg_sicilia",
    label: "🇮🇹 Sicilia",
    icon: "📍",
    layers: [
      {
        id: "sicilia_pai",
        label: "PAI Sicilia",
        color: "#dc2626",
        defaultOn: false,
        arcgisUrl: "https://www.sitr.regione.sicilia.it/arcgis/rest/services/PAI/PAI_Pericolosita_Geomorfologica/MapServer",
        opacity: 0.5,
        bounds: [36.64, 12.43, 38.82, 15.65],
        description: "PAI pericolosità geomorfologica — Regione Sicilia",
      },
      {
        id: "sicilia_vincoli_paesaggistici",
        label: "Vincoli paesaggistici Sicilia",
        color: "#a855f7",
        defaultOn: false,
        arcgisUrl: "https://www.sitr.regione.sicilia.it/arcgis/rest/services/Vincoli/Vincoli_paesaggistici/MapServer",
        opacity: 0.5,
        bounds: [36.64, 12.43, 38.82, 15.65],
        description: "Vincoli paesaggistici — Regione Sicilia",
      },
      {
        id: "sicilia_aree_non_idonee",
        label: "Aree non idonee FER Sicilia",
        color: "#b91c1c",
        defaultOn: false,
        arcgisUrl: "https://www.sitr.regione.sicilia.it/arcgis/rest/services/Energia/Aree_non_idonee_FER/MapServer",
        opacity: 0.5,
        bounds: [36.64, 12.43, 38.82, 15.65],
        description: "Aree non idonee all'installazione FER — Regione Sicilia",
      },
    ],
  },

  // ── LAZIO ───────────────────────────────────────────────────
  {
    id: "reg_lazio",
    label: "🇮🇹 Lazio",
    icon: "📍",
    layers: [
      {
        id: "lazio_ptpr",
        label: "PTPR - Piano Paesistico Lazio",
        color: "#7c3aed",
        defaultOn: false,
        arcgisUrl: "https://geoportale.regione.lazio.it/arcgis/rest/services/Paesaggio/PTPR_Tavole_A/MapServer",
        opacity: 0.5,
        bounds: [41.18, 11.45, 42.84, 14.03],
        description: "Piano Territoriale Paesistico Regionale — Tavole A (beni paesaggistici)",
      },
      {
        id: "lazio_vincolo_idro",
        label: "Vincolo idrogeologico Lazio",
        color: "#2563eb",
        defaultOn: false,
        arcgisUrl: "https://geoportale.regione.lazio.it/arcgis/rest/services/Difesa_Suolo/Vincolo_Idrogeologico/MapServer",
        opacity: 0.5,
        bounds: [41.18, 11.45, 42.84, 14.03],
        description: "Vincolo idrogeologico — Regione Lazio",
      },
    ],
  },

  // ── VENETO ──────────────────────────────────────────────────
  {
    id: "reg_veneto",
    label: "🇮🇹 Veneto",
    icon: "📍",
    layers: [
      {
        id: "veneto_pai",
        label: "PAI Veneto",
        color: "#dc2626",
        defaultOn: false,
        arcgisUrl: "https://idt2.regione.veneto.it/arcgis/rest/services/Difesa_suolo/PAI_pericolosita/MapServer",
        opacity: 0.5,
        bounds: [44.79, 10.62, 46.68, 13.10],
        description: "PAI pericolosità — Regione Veneto",
      },
      {
        id: "veneto_vincolo_paesaggistico",
        label: "Vincolo paesaggistico Veneto",
        color: "#a855f7",
        defaultOn: false,
        arcgisUrl: "https://idt2.regione.veneto.it/arcgis/rest/services/Paesaggio/Vincoli_paesaggistici/MapServer",
        opacity: 0.5,
        bounds: [44.79, 10.62, 46.68, 13.10],
        description: "Vincoli paesaggistici — Regione Veneto",
      },
    ],
  },

  // ── PIEMONTE ────────────────────────────────────────────────
  {
    id: "reg_piemonte",
    label: "🇮🇹 Piemonte",
    icon: "📍",
    layers: [
      {
        id: "piemonte_ppr",
        label: "PPR - Piano Paesaggistico Piemonte",
        color: "#7c3aed",
        defaultOn: false,
        arcgisUrl: "https://geomap.reteunitaria.piemonte.it/arcgis/rest/services/Paesaggio/PPR_componenti/MapServer",
        opacity: 0.5,
        bounds: [44.06, 6.63, 46.46, 9.21],
        description: "Piano Paesaggistico Regionale — componenti paesaggistiche",
      },
      {
        id: "piemonte_vincolo_idro",
        label: "Vincolo idrogeologico Piemonte",
        color: "#2563eb",
        defaultOn: false,
        arcgisUrl: "https://geomap.reteunitaria.piemonte.it/arcgis/rest/services/Difesa_Suolo/Vincolo_Idrogeologico/MapServer",
        opacity: 0.5,
        bounds: [44.06, 6.63, 46.46, 9.21],
        description: "Vincolo idrogeologico — Regione Piemonte",
      },
    ],
  },

  // ── EMILIA-ROMAGNA ──────────────────────────────────────────
  {
    id: "reg_emilia",
    label: "🇮🇹 Emilia-Romagna",
    icon: "📍",
    layers: [
      {
        id: "emilia_ptpr",
        label: "PTPR Emilia-Romagna",
        color: "#7c3aed",
        defaultOn: false,
        arcgisUrl: "https://servizimoka.regione.emilia-romagna.it/arcgis/rest/services/Paesaggio/PTPR/MapServer",
        opacity: 0.5,
        bounds: [43.73, 9.20, 45.14, 12.76],
        description: "Piano Territoriale Paesistico Regionale — Emilia-Romagna",
      },
      {
        id: "emilia_vincolo_idro",
        label: "Vincolo idrogeologico Emilia-Romagna",
        color: "#2563eb",
        defaultOn: false,
        arcgisUrl: "https://servizimoka.regione.emilia-romagna.it/arcgis/rest/services/Difesa_Suolo/Vincolo_idrogeologico/MapServer",
        opacity: 0.5,
        bounds: [43.73, 9.20, 45.14, 12.76],
        description: "Vincolo idrogeologico — Regione Emilia-Romagna",
      },
    ],
  },

  // ── SARDEGNA ────────────────────────────────────────────────
  {
    id: "reg_sardegna",
    label: "🇮🇹 Sardegna",
    icon: "📍",
    layers: [
      {
        id: "sardegna_ppr",
        label: "PPR - Piano Paesaggistico Sardegna",
        color: "#7c3aed",
        defaultOn: false,
        arcgisUrl: "https://webgis2.regione.sardegna.it/arcgis/rest/services/PPR/PPR_ambiti/MapServer",
        opacity: 0.5,
        bounds: [38.86, 8.13, 41.26, 9.83],
        description: "Piano Paesaggistico Regionale — Sardegna",
      },
      {
        id: "sardegna_vincolo_idro",
        label: "Vincolo idrogeologico Sardegna",
        color: "#2563eb",
        defaultOn: false,
        arcgisUrl: "https://webgis2.regione.sardegna.it/arcgis/rest/services/Difesa_Suolo/Vincolo_Idrogeologico/MapServer",
        opacity: 0.5,
        bounds: [38.86, 8.13, 41.26, 9.83],
        description: "Vincolo idrogeologico — Regione Sardegna",
      },
    ],
  },

  // ── CALABRIA ────────────────────────────────────────────────
  {
    id: "reg_calabria",
    label: "🇮🇹 Calabria",
    icon: "📍",
    layers: [
      {
        id: "calabria_pai",
        label: "PAI Calabria",
        color: "#dc2626",
        defaultOn: false,
        arcgisUrl: "https://geoportale.regione.calabria.it/arcgis/rest/services/PAI/PAI_pericolosita/MapServer",
        opacity: 0.5,
        bounds: [37.91, 15.63, 39.95, 17.13],
        description: "PAI pericolosità — Regione Calabria",
      },
    ],
  },
];

// Flat map for easy lookup
export const ALL_LAYERS: LayerDef[] = LAYER_GROUPS.flatMap(g => g.layers);
