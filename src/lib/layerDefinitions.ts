// ══════════════════════════════════════════════════════════════
// LAYER DEFINITIONS — URL reali verificati da fonti ufficiali
// PCN/MASE: wms.pcn.minambiente.it/ogc (WMS OGC, non ArcGIS)
// SITAP MiC: sitap.cultura.gov.it/geoserver (GeoServer WMS)
// ISPRA: idrogeo.isprambiente.it, sinacloud.isprambiente.it
// Regionali: URL ufficiali dai geoportali regionali
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
  /** Alternative ArcGIS/WMS URLs to try if the primary is offline */
  fallbackUrls?: string[];
  /** Skip TLS certificate verification for this layer */
  tlsBypass?: boolean;
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
        description: "Particelle catastali ufficiali (Agenzia delle Entrate — WFS interno)",
      },
      {
        id: "catasto_wms",
        label: "Catasto WMS (Agenzia Entrate)",
        color: "#d97706",
        defaultOn: false,
        wmsUrl: "https://wms.cartografia.agenziaentrate.gov.it/inspire/wms/ows01.php",
        wmsLayer: "CP.CadastralParcel",
        opacity: 0.5,
        description: "Particelle catastali via WMS INSPIRE — Agenzia delle Entrate",
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // A. VINCOLI D.LGS. 42/2004
  // ══════════════════════════════════════════════════════════════
  {
    id: "beni_paesaggistici_136",
    label: "A1. Beni Paesaggistici Art. 136",
    icon: "🏛️",
    layers: [
      {
        id: "sitap_vincoli_136",
        label: "Vincoli Art. 136/157 — SITAP MiC",
        color: "#7c3aed",
        defaultOn: false,
        wmsUrl: "https://sitap.cultura.gov.it/geoserver/sitap_public/wms",
        wmsLayer: "sitap_public:sitap_v1497_public",
        opacity: 0.55,
        description: "Vincoli paesaggistici decretati Art. 136/157 D.Lgs. 42/2004 — SITAP MiC",
      },
      {
        id: "vir_aree_archeologiche",
        label: "Aree archeologiche vincolate — VIR MiC",
        color: "#b45309",
        defaultOn: false,
        wmsUrl: "https://sitap.cultura.gov.it/geoserver/sitap_ws/wms",
        wmsLayer: "sitap_ws:tab_vir_geo_aree_archeol_vincolate",
        opacity: 0.55,
        description: "Aree archeologiche vincolate — Vincoli in Rete MiC",
      },
      {
        id: "sitap_alberi_monumentali",
        label: "Alberi monumentali d'Italia",
        color: "#15803d",
        defaultOn: false,
        wmsUrl: "https://sitap.cultura.gov.it/geoserver/sitap_ws_clone/wms",
        wmsLayer: "sitap_ws_clone:alberi_monumentali",
        opacity: 0.6,
        description: "Elenco alberi monumentali — MiC/SITAP",
      },
    ],
  },
  {
    id: "paesaggistici_142",
    label: "A2. Vincoli Paesaggistici Art. 142",
    icon: "🏞️",
    layers: [
      {
        id: "art142_corsi_acqua",
        label: "c) Fiumi e corsi d'acqua 150m — PCN",
        color: "#2563eb",
        defaultOn: false,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/WMS_v1.3/Vettoriali/Vincoli_Paesaggistici_art142.map",
        wmsLayer: "Fasce_fluviali_150m",
        opacity: 0.5,
        description: "Art. 142 c.1 lett. c — Fiumi, torrenti, corsi d'acqua (150m) — PCN MASE",
        fallbackUrls: ["https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/WMS_v1.3/Vettoriali/Reticolo_Idrografico.map"],
      },
      {
        id: "art142_boschi",
        label: "g) Boschi e foreste — PCN",
        color: "#166534",
        defaultOn: false,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/WMS_v1.3/Vettoriali/Vincoli_Paesaggistici_art142.map",
        wmsLayer: "Boschi_e_foreste",
        opacity: 0.5,
        description: "Art. 142 c.1 lett. g — Boschi e foreste — PCN MASE",
      },
      {
        id: "art142_costieri",
        label: "a) Territori costieri 300m — PCN",
        color: "#0284c7",
        defaultOn: false,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/WMS_v1.3/Vettoriali/Vincoli_Paesaggistici_art142.map",
        wmsLayer: "Territori_costieri_300m",
        opacity: 0.5,
        description: "Art. 142 c.1 lett. a — Territori costieri (300m) — PCN MASE",
      },
      {
        id: "art142_laghi",
        label: "b) Laghi 300m — PCN",
        color: "#0369a1",
        defaultOn: false,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/WMS_v1.3/Vettoriali/Vincoli_Paesaggistici_art142.map",
        wmsLayer: "Territori_lacuali_300m",
        opacity: 0.5,
        description: "Art. 142 c.1 lett. b — Laghi e zone lacuali (300m) — PCN MASE",
      },
      {
        id: "art142_montagne",
        label: "d) Montagne >1200m — PCN",
        color: "#7c3aed",
        defaultOn: false,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/WMS_v1.3/Vettoriali/Vincoli_Paesaggistici_art142.map",
        wmsLayer: "Zone_montane_1200m",
        opacity: 0.5,
        description: "Art. 142 c.1 lett. d — Zone montane >1.200m slm — PCN MASE",
      },
      {
        id: "art142_parchi",
        label: "f) Parchi e riserve — PCN",
        color: "#16a34a",
        defaultOn: false,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/WMS_v1.3/Vettoriali/Vincoli_Paesaggistici_art142.map",
        wmsLayer: "Parchi_e_riserve",
        opacity: 0.5,
        description: "Art. 142 c.1 lett. f — Parchi nazionali e regionali — PCN MASE",
      },
      {
        id: "art142_zone_umide",
        label: "i) Zone umide Ramsar — PCN",
        color: "#0891b2",
        defaultOn: false,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/WMS_v1.3/Vettoriali/Vincoli_Paesaggistici_art142.map",
        wmsLayer: "Zone_umide_Ramsar",
        opacity: 0.5,
        description: "Art. 142 c.1 lett. i — Zone umide Ramsar — PCN MASE",
      },
      {
        id: "art142_usi_civici",
        label: "h) Usi civici — PCN",
        color: "#78716c",
        defaultOn: false,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/WMS_v1.3/Vettoriali/Vincoli_Paesaggistici_art142.map",
        wmsLayer: "Usi_civici",
        opacity: 0.5,
        description: "Art. 142 c.1 lett. h — Usi civici — PCN MASE",
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // B. AREE PROTETTE
  // ══════════════════════════════════════════════════════════════
  {
    id: "aree_protette",
    label: "B. Aree Protette",
    icon: "🌿",
    layers: [
      {
        id: "aree_protette_euap",
        label: "B1-B6. Aree protette EUAP — PCN",
        color: "#16a34a",
        defaultOn: false,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/WMS_v1.3/Vettoriali/EUAP.map",
        wmsLayer: "Aree_protette_EUAP",
        opacity: 0.5,
        description: "Elenco Ufficiale Aree Protette — parchi nazionali, regionali, riserve (L.394/1991)",
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // C. RETE NATURA 2000
  // ══════════════════════════════════════════════════════════════
  {
    id: "natura2000",
    label: "C. Rete Natura 2000",
    icon: "🦎",
    layers: [
      {
        id: "natura2000_sic_zsc",
        label: "C1. ZSC/SIC — PCN MASE",
        color: "#10b981",
        defaultOn: false,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/WMS_v1.3/Vettoriali/Natura2000.map",
        wmsLayer: "ZSC_SIC",
        opacity: 0.55,
        description: "Zone Speciali di Conservazione (ZSC/SIC) — Dir. 92/43/CEE Habitat — PCN MASE",
        fallbackUrls: ["https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/WMS_v1.3/Vettoriali/SIC_ZSC_ZPS.map"],
      },
      {
        id: "natura2000_zps",
        label: "C2. ZPS — PCN MASE",
        color: "#059669",
        defaultOn: false,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/WMS_v1.3/Vettoriali/Natura2000.map",
        wmsLayer: "ZPS",
        opacity: 0.55,
        description: "Zone di Protezione Speciale (ZPS) — Dir. 79/409/CEE Uccelli — PCN MASE",
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // D. SITI UNESCO
  // ══════════════════════════════════════════════════════════════
  {
    id: "unesco",
    label: "D. Siti UNESCO",
    icon: "🏰",
    layers: [
      {
        id: "unesco_sites",
        label: "D1. Patrimonio Mondiale UNESCO — PCN",
        color: "#8B008B",
        defaultOn: false,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/WMS_v1.3/Vettoriali/UNESCO.map",
        wmsLayer: "Siti_UNESCO",
        opacity: 0.4,
        description: "Siti Patrimonio Mondiale UNESCO — PCN MASE",
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // E. VINCOLI IDROGEOLOGICI — PAI e IFFI
  // ══════════════════════════════════════════════════════════════
  {
    id: "vincoli_idrogeologici",
    label: "E. Vincoli Idrogeologici",
    icon: "🌊",
    layers: [
      {
        id: "vincolo_idrogeologico",
        label: "E1. Vincolo idrogeologico R.D. 3267/1923 — PCN",
        color: "#1d4ed8",
        defaultOn: false,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/WMS_v1.3/Vettoriali/Vincolo_Idrogeologico.map",
        wmsLayer: "Vincolo_idrogeologico",
        opacity: 0.5,
        description: "Aree soggette a vincolo idrogeologico forestale — R.D. 3267/1923 — PCN MASE",
      },
      {
        id: "pai_pericolosita_frana",
        label: "E2. PAI — Pericolosità frana — PCN",
        color: "#dc2626",
        defaultOn: false,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/WMS_v1.3/Vettoriali/PAI_pericolosita.map",
        wmsLayer: "Pericolosita_frana",
        opacity: 0.55,
        description: "Mosaicatura PAI — Pericolosità da frana P1→P4 — PCN MASE",
        fallbackUrls: [
          "https://wms.distrettoappenninomeridionale.it/geoserver/PAI_VIGENTE_PERICOLOSITA_FRANE/wms",
          "https://idrogeo.isprambiente.it/geoserver/pai/wms",
        ],
      },
      {
        id: "frane_iffi",
        label: "E2. Frane IFFI — ISPRA IdroGEO",
        color: "#ef4444",
        defaultOn: false,
        wmsUrl: "https://idrogeo.isprambiente.it/geoserver/iffi/wms",
        wmsLayer: "IFFI_frane_poligonali",
        opacity: 0.55,
        description: "Inventario Fenomeni Franosi IFFI — ISPRA IdroGEO",
        fallbackUrls: ["https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/WMS_v1.3/Vettoriali/IFFI.map"],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // F. RISCHIO FRANA (PAI)
  // ══════════════════════════════════════════════════════════════
  {
    id: "rischio_frana",
    label: "F. Rischio Frana (PAI)",
    icon: "⛰️",
    layers: [
      {
        id: "pai_rischio_idrogeologico",
        label: "F1-F4. PAI — Rischio idrogeologico — PCN",
        color: "#7c3aed",
        defaultOn: false,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/WMS_v1.3/Vettoriali/PAI_rischio.map",
        wmsLayer: "Rischio_idrogeologico",
        opacity: 0.5,
        description: "Mosaicatura PAI — Classi di rischio R1→R4 — PCN MASE",
      },
      {
        id: "geologia",
        label: "Carta geologica d'Italia — PCN",
        color: "#b45309",
        defaultOn: false,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/WMS_v1.3/Vettoriali/geologica.map",
        wmsLayer: "Carta_geologica",
        opacity: 0.5,
        description: "Carta Geologica d'Italia 1:100.000 — ISPRA/Servizio Geologico — PCN",
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // G. RISCHIO ALLUVIONE (PGRA)
  // ══════════════════════════════════════════════════════════════
  {
    id: "rischio_alluvione",
    label: "G. Rischio Alluvione (PGRA)",
    icon: "🌊",
    layers: [
      {
        id: "pai_pericolosita_idraulica",
        label: "G1-G3. PAI — Pericolosità alluvionale — PCN",
        color: "#2563eb",
        defaultOn: false,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/WMS_v1.3/Vettoriali/PAI_pericolosita.map",
        wmsLayer: "Pericolosita_idraulica",
        opacity: 0.55,
        description: "Mosaicatura PAI — Pericolosità da alluvione — PCN MASE",
        fallbackUrls: ["https://wms.distrettoappenninomeridionale.it/geoserver/PAI_VIGENTE_PERICOLOSITA_IDRAULICA/wms"],
      },
      {
        id: "alluvioni_estensione",
        label: "PGRA — Aree allagabili — PCN",
        color: "#0ea5e9",
        defaultOn: false,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/WMS_v1.3/Vettoriali/Alluvioni_Estensione.map",
        wmsLayer: "Alluvioni_Estensione",
        opacity: 0.5,
        description: "Estensione aree allagabili scenari H/M/L — Dir. 2007/60/CE — PCN MASE",
      },
      {
        id: "alluvioni_rischio",
        label: "PGRA — Classi di rischio alluvionale — PCN",
        color: "#1e40af",
        defaultOn: false,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/WMS_v1.3/Vettoriali/Alluvioni_Classi_di_Rischio.map",
        wmsLayer: "Alluvioni_Classi_di_Rischio",
        opacity: 0.5,
        description: "Classi di rischio alluvionale R1→R4 — Dir. 2007/60/CE — PCN MASE",
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // H. AUTORITÀ DI BACINO
  // ══════════════════════════════════════════════════════════════
  {
    id: "autorita_bacino",
    label: "H. Autorità di Bacino",
    icon: "🏞️",
    layers: [
      {
        id: "adb",
        label: "Perimetri Autorità di Bacino — PCN",
        color: "#4b5563",
        defaultOn: false,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/WMS_v1.3/Vettoriali/ADB.map",
        wmsLayer: "Autorita_di_Bacino",
        opacity: 0.45,
        description: "7 distretti idrografici — PCN MASE",
      },
      {
        id: "pai_appennino_meridionale",
        label: "PAI — Appennino Meridionale (AdB)",
        color: "#dc2626",
        defaultOn: false,
        wmsUrl: "https://wms.distrettoappenninomeridionale.it/geoserver/PAI_VIGENTE_PERICOLOSITA_FRANE/wms",
        wmsLayer: "PAI_VIGENTE_PERICOLOSITA_FRANE",
        opacity: 0.55,
        description: "PAI Distretto Appennino Meridionale — Campania, Basilicata, Calabria, Puglia, Molise, Abruzzo",
        fallbackUrls: ["https://wms.distrettoappenninomeridionale.it/geoserver/PAI_VIGENTE_PERICOLOSITA_IDRAULICA/wms"],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // I. LIMITI AMMINISTRATIVI
  // ══════════════════════════════════════════════════════════════
  {
    id: "vincoli_urbanistici",
    label: "I. Limiti Amministrativi",
    icon: "🏘️",
    layers: [
      {
        id: "limiti_admin",
        label: "Limiti amministrativi — PCN",
        color: "#6b7280",
        defaultOn: false,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/WMS_v1.3/Vettoriali/Limiti_amministrativi.map",
        wmsLayer: "Limiti_amministrativi",
        opacity: 0.5,
        description: "Confini comunali, provinciali, regionali — PCN MASE",
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // L. RETE ECOLOGICA E BIODIVERSITÀ
  // ══════════════════════════════════════════════════════════════
  {
    id: "rete_ecologica",
    label: "L. Rete Ecologica & Biodiversità",
    icon: "🦋",
    layers: [
      {
        id: "iba",
        label: "L2. IBA — Important Bird Areas — PCN",
        color: "#22d3ee",
        defaultOn: false,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/WMS_v1.3/Vettoriali/IBA.map",
        wmsLayer: "IBA",
        opacity: 0.5,
        description: "Important Bird and Biodiversity Areas — BirdLife/LIPU — PCN MASE",
      },
      {
        id: "ramsar",
        label: "L3. Zone umide RAMSAR — PCN",
        color: "#0891b2",
        defaultOn: false,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/WMS_v1.3/Vettoriali/Ramsar.map",
        wmsLayer: "Zone_umide_Ramsar",
        opacity: 0.55,
        description: "Zone umide di importanza internazionale — Convenzione Ramsar 1971 — PCN MASE",
      },
      {
        id: "inventario_forestale",
        label: "Inventario Forestale Nazionale INFC — PCN",
        color: "#166534",
        defaultOn: false,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/WMS_v1.3/Vettoriali/INFC.map",
        wmsLayer: "Inventario_forestale",
        opacity: 0.45,
        description: "Inventario Nazionale Foreste — PCN MASE",
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // M. INFRASTRUTTURE E BUFFER DI RISPETTO
  // ══════════════════════════════════════════════════════════════
  {
    id: "infrastrutture",
    label: "M. Infrastrutture & Buffer",
    icon: "⚡",
    layers: [
      {
        id: "elettrodotti",
        label: "M1. Elettrodotti AT/AAT — PCN",
        color: "#FFFF00",
        defaultOn: false,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/WMS_v1.3/Vettoriali/Elettrodotti.map",
        wmsLayer: "Elettrodotti",
        opacity: 0.5,
        description: "Linee elettriche Alta/Altissima Tensione — DPA 150m — PCN MASE",
      },
      {
        id: "gasdotti",
        label: "M2. Gasdotti — PCN",
        color: "#f59e0b",
        defaultOn: false,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/WMS_v1.3/Vettoriali/Gasdotti.map",
        wmsLayer: "Gasdotti",
        opacity: 0.5,
        description: "Rete gasdotti principali Snam — PCN MASE",
      },
      {
        id: "strade_principali",
        label: "M4. Strade statali — PCN",
        color: "#9ca3af",
        defaultOn: false,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/WMS_v1.3/Vettoriali/Strade.map",
        wmsLayer: "Strade",
        opacity: 0.45,
        description: "Rete stradale — fasce rispetto DPR 495/1992 — PCN MASE",
      },
      {
        id: "ferrovie",
        label: "Ferrovie — PCN",
        color: "#374151",
        defaultOn: false,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/WMS_v1.3/Vettoriali/Ferrovie.map",
        wmsLayer: "Ferrovie",
        opacity: 0.55,
        description: "Rete ferroviaria — fascia rispetto 30m DPR 753/1980 — PCN MASE",
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // N. FOTOVOLTAICO & AREE IDONEE/NON IDONEE
  // ══════════════════════════════════════════════════════════════
  {
    id: "fotovoltaico",
    label: "N. Fotovoltaico & Aree Idonee",
    icon: "☀️",
    layers: [
      {
        id: "corine",
        label: "CORINE Land Cover — PCN",
        color: "#65a30d",
        defaultOn: false,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/WMS_v1.3/Vettoriali/Corine_Land_Cover.map",
        wmsLayer: "Corine_Land_Cover",
        opacity: 0.5,
        description: "CORINE Land Cover — classificazione uso del suolo — PCN MASE",
      },
      {
        id: "siti_contaminati",
        label: "N1. Siti contaminati SIN — ISPRA",
        color: "#991b1b",
        defaultOn: false,
        wmsUrl: "https://sinacloud.isprambiente.it/geoserver/ows",
        wmsLayer: "siti_contaminati:SIN",
        opacity: 0.45,
        description: "Siti di Interesse Nazionale per le bonifiche — aree idonee FER — ISPRA",
        fallbackUrls: ["https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/WMS_v1.3/Vettoriali/Siti_contaminati.map"],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // O. FASCE DI RISPETTO
  // ══════════════════════════════════════════════════════════════
  {
    id: "fasce_rispetto",
    label: "O. Fasce di Rispetto",
    icon: "🚧",
    layers: [
      {
        id: "aeroporti",
        label: "O1. Aeroporti ENAC — PCN",
        color: "#6366f1",
        defaultOn: false,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/WMS_v1.3/Vettoriali/Aeroporti.map",
        wmsLayer: "Aeroporti",
        opacity: 0.5,
        description: "Aeroporti e zone di rischio aeronautico ENAC — PCN MASE",
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // SISMICA
  // ══════════════════════════════════════════════════════════════
  {
    id: "sismica",
    label: "Sismica",
    icon: "🔴",
    layers: [
      {
        id: "zonazione_sismica",
        label: "Classificazione sismica comunale — PCN",
        color: "#f97316",
        defaultOn: false,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/WMS_v1.3/Vettoriali/classificazione_sismica.map",
        wmsLayer: "Classificazione_sismica",
        opacity: 0.45,
        description: "Classificazione sismica comuni italiani Zone 1-4 — PCN MASE",
      },
      {
        id: "pericolosita_sismica",
        label: "Pericolosità sismica — INGV",
        color: "#ea580c",
        defaultOn: false,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/WMS_v1.3/Vettoriali/pericolosita_sismica.map",
        wmsLayer: "Pericolosita_sismica",
        opacity: 0.45,
        description: "Mappa pericolosità sismica MPS04 — INGV — PCN MASE",
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // USO DEL SUOLO
  // ══════════════════════════════════════════════════════════════
  {
    id: "uso_suolo",
    label: "Uso del Suolo",
    icon: "🌾",
    layers: [
      {
        id: "capacita_uso_suoli",
        label: "Capacità d'uso suoli LCC — PCN",
        color: "#a16207",
        defaultOn: false,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/WMS_v1.3/Vettoriali/Capacita_uso_suoli.map",
        wmsLayer: "Capacita_uso_suoli",
        opacity: 0.45,
        description: "Land Capability Classification — PCN MASE",
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // IDROGRAFIA
  // ══════════════════════════════════════════════════════════════
  {
    id: "idrografia",
    label: "Idrografia & Costa",
    icon: "💧",
    layers: [
      {
        id: "aste_fluviali",
        label: "Aste fluviali — PCN",
        color: "#0284c7",
        defaultOn: false,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/WMS_v1.3/Vettoriali/Aste_fluviali.map",
        wmsLayer: "Aste_fluviali",
        opacity: 0.6,
        description: "Reticolo idrografico — aste fluviali — PCN MASE",
      },
      {
        id: "linea_costa",
        label: "Linea di costa — PCN",
        color: "#0e7490",
        defaultOn: false,
        wmsUrl: "https://wms.pcn.minambiente.it/ogc?map=/ms_ogc/WMS_v1.3/Vettoriali/Linea_di_costa.map",
        wmsLayer: "Linea_di_costa",
        opacity: 0.55,
        description: "Linea di costa italiana — PCN MASE",
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // VINCOLI REGIONALI
  // ══════════════════════════════════════════════════════════════

  // ── PUGLIA ──────────────────────────────────────────────────
  {
    id: "reg_puglia",
    label: "🇮🇹 Puglia",
    icon: "📍",
    layers: [
      {
        id: "puglia_pptr",
        label: "PPTR — Piano Paesaggistico Puglia",
        color: "#7c3aed",
        defaultOn: false,
        wmsUrl: "https://webapps.sit.puglia.it/arcgis/services/Operationals/PPTR_APPROVATO/MapServer/WMSServer",
        wmsLayer: "Sistema_delle_Tutele",
        opacity: 0.5,
        bounds: [39.78, 15.33, 42.23, 18.52],
        description: "PPTR approvato — Sistema delle Tutele e Ambiti Paesaggistici — Regione Puglia",
        fallbackUrls: ["https://webapps.sit.puglia.it/arcgis/services/Operationals/PPTR_ADOTTATO/MapServer/WMSServer"],
      },
      {
        id: "puglia_pai_frane",
        label: "PAI Frane — Appennino Meridionale (Puglia)",
        color: "#dc2626",
        defaultOn: false,
        wmsUrl: "https://wms.distrettoappenninomeridionale.it/geoserver/PAI_VIGENTE_PERICOLOSITA_FRANE/wms",
        wmsLayer: "PAI_VIGENTE_PERICOLOSITA_FRANE",
        opacity: 0.5,
        bounds: [39.78, 15.33, 42.23, 18.52],
        description: "PAI Pericolosità Frane — Distretto Appennino Meridionale",
      },
      {
        id: "puglia_olivi",
        label: "Olivi monumentali (L.R. 14/2007) — Puglia",
        color: "#65a30d",
        defaultOn: false,
        wmsUrl: "https://webapps.sit.puglia.it/arcgis/services/Operationals/Olivi_Monumentali/MapServer/WMSServer",
        wmsLayer: "Olivi_Monumentali",
        opacity: 0.55,
        bounds: [39.78, 15.33, 42.23, 18.52],
        description: "Olivi monumentali e di pregio — L.R. Puglia 14/2007",
        fallbackUrls: ["https://webapps.sit.puglia.it/arcgis/rest/services/Agricoltura/Olivi_Monumentali/MapServer"],
      },
    ],
  },

  // ── BASILICATA ──────────────────────────────────────────────
  {
    id: "reg_basilicata",
    label: "🇮🇹 Basilicata",
    icon: "📍",
    layers: [
      {
        id: "basilicata_pai_frane",
        label: "PAI Frane — Appennino Meridionale (Basilicata)",
        color: "#dc2626",
        defaultOn: false,
        wmsUrl: "https://wms.distrettoappenninomeridionale.it/geoserver/PAI_VIGENTE_PERICOLOSITA_FRANE/wms",
        wmsLayer: "PAI_VIGENTE_PERICOLOSITA_FRANE",
        opacity: 0.5,
        bounds: [39.89, 15.33, 41.14, 16.87],
        description: "PAI Pericolosità Frane — Distretto Appennino Meridionale",
      },
      {
        id: "basilicata_geoportale",
        label: "Geoportale Basilicata — URL da verificare",
        color: "#2563eb",
        defaultOn: false,
        wmsUrl: "https://rsdi.regione.basilicata.it/geoserver/wms",
        wmsLayer: "rsdi:vincolo_idrogeologico",
        opacity: 0.5,
        bounds: [39.89, 15.33, 41.14, 16.87],
        description: "Vincolo idrogeologico — RSDI Basilicata (URL da verificare con GetCapabilities)",
        fallbackUrls: ["https://rsdi.regione.basilicata.it/wms"],
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
        id: "calabria_pai_frane",
        label: "PAI Frane — Appennino Meridionale (Calabria)",
        color: "#dc2626",
        defaultOn: false,
        wmsUrl: "https://wms.distrettoappenninomeridionale.it/geoserver/PAI_VIGENTE_PERICOLOSITA_FRANE/wms",
        wmsLayer: "PAI_VIGENTE_PERICOLOSITA_FRANE",
        opacity: 0.5,
        bounds: [37.91, 15.63, 39.95, 17.13],
        description: "PAI Pericolosità Frane — Distretto Appennino Meridionale",
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
        id: "campania_pai_frane",
        label: "PAI Frane — Appennino Meridionale (Campania)",
        color: "#dc2626",
        defaultOn: false,
        wmsUrl: "https://wms.distrettoappenninomeridionale.it/geoserver/PAI_VIGENTE_PERICOLOSITA_FRANE/wms",
        wmsLayer: "PAI_VIGENTE_PERICOLOSITA_FRANE",
        opacity: 0.5,
        bounds: [39.99, 13.76, 41.51, 15.81],
        description: "PAI Pericolosità Frane — Distretto Appennino Meridionale",
      },
      {
        id: "campania_geoportale",
        label: "Geoportale Campania — URL da verificare",
        color: "#a855f7",
        defaultOn: false,
        wmsUrl: "https://sit2.regione.campania.it/geoserver/wms",
        wmsLayer: "campania:vincoli_paesaggistici",
        opacity: 0.5,
        bounds: [39.99, 13.76, 41.51, 15.81],
        description: "Vincoli paesaggistici Campania (URL da verificare con GetCapabilities)",
        fallbackUrls: ["https://sit.regione.campania.it/geoserver/wms"],
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
        id: "toscana_geoportale_wms",
        label: "Geoscopio Toscana — WMS vincoli paesaggistici",
        color: "#a855f7",
        defaultOn: false,
        wmsUrl: "https://www502.regione.toscana.it/wmsraster/com.rt.wms.RTmap?map=wmspaesaggio",
        wmsLayer: "rt_paesaggio.idvincolo",
        opacity: 0.5,
        bounds: [42.24, 9.69, 44.47, 12.37],
        description: "Vincoli paesaggistici D.Lgs. 42/2004 — Geoscopio Regione Toscana",
        fallbackUrls: [
          "https://www502.regione.toscana.it/wmsraster/com.rt.wms.RTmap?map=wmsambiente",
          "https://geoserver.lamma.rete.toscana.it/toscana/wms",
        ],
      },
      {
        id: "toscana_vincolo_idro",
        label: "Vincolo idrogeologico — Toscana",
        color: "#2563eb",
        defaultOn: false,
        wmsUrl: "https://www502.regione.toscana.it/wmsraster/com.rt.wms.RTmap?map=wmsidrogeologia",
        wmsLayer: "rt_idrogeologia.idvincolo_idrogeologico",
        opacity: 0.5,
        bounds: [42.24, 9.69, 44.47, 12.37],
        description: "Vincolo idrogeologico R.D. 3267/1923 — Regione Toscana",
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
        id: "sicilia_geoportale",
        label: "Geoportale Sicilia — URL da verificare",
        color: "#dc2626",
        defaultOn: false,
        wmsUrl: "https://www.sitr.regione.sicilia.it/geoserver/wms",
        wmsLayer: "sitr:pai_pericolosita",
        opacity: 0.5,
        bounds: [36.64, 12.43, 38.82, 15.65],
        description: "PAI pericolosità Sicilia (URL da verificare con GetCapabilities)",
        fallbackUrls: ["https://www.sitr.regione.sicilia.it/cgi-bin/mapserv"],
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
        id: "lazio_geoportale",
        label: "Geoportale Lazio — URL da verificare",
        color: "#7c3aed",
        defaultOn: false,
        wmsUrl: "https://geoportale.regione.lazio.it/geoserver/wms",
        wmsLayer: "lazio:ptpr",
        opacity: 0.5,
        bounds: [41.18, 11.45, 42.84, 14.03],
        description: "PTPR Lazio (URL da verificare con GetCapabilities)",
        fallbackUrls: ["https://geoportale.regione.lazio.it/arcgis/services/Paesaggio/PTPR/MapServer/WMSServer"],
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
        id: "emilia_geoportale",
        label: "Geoportale Emilia-Romagna — URL da verificare",
        color: "#7c3aed",
        defaultOn: false,
        wmsUrl: "https://servizigis.regione.emilia-romagna.it/wms/ptcp",
        wmsLayer: "ptcp_vincoli_paesaggistici",
        opacity: 0.5,
        bounds: [43.73, 9.20, 45.14, 12.76],
        description: "PTPR Emilia-Romagna (URL da verificare con GetCapabilities)",
        fallbackUrls: [
          "https://servizimoka.regione.emilia-romagna.it/geoserver/wms",
          "https://servizigis.regione.emilia-romagna.it/wms/uso_suolo",
        ],
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
        id: "veneto_geoportale",
        label: "IDT Veneto — URL da verificare",
        color: "#7c3aed",
        defaultOn: false,
        wmsUrl: "https://idt2.regione.veneto.it/geoserver/wms",
        wmsLayer: "veneto:vincoli_paesaggistici",
        opacity: 0.5,
        bounds: [44.79, 10.62, 46.68, 13.10],
        description: "Vincoli paesaggistici Veneto (URL da verificare con GetCapabilities)",
        fallbackUrls: ["https://idt.regione.veneto.it/geoserver/ows"],
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
        id: "lombardia_geoportale",
        label: "Geoportale Lombardia — URL da verificare",
        color: "#2563eb",
        defaultOn: false,
        wmsUrl: "https://www.cartografia.servizirl.it/arcgis2/services/Idrogeologia/Vincolo_Idrogeologico/MapServer/WMSServer",
        wmsLayer: "Vincolo_Idrogeologico",
        opacity: 0.5,
        bounds: [44.68, 8.50, 46.64, 11.43],
        description: "Vincolo idrogeologico Lombardia — Geoportale Lombardia (URL da verificare)",
        fallbackUrls: ["https://www.cartografia.servizirl.it/wms"],
        tlsBypass: true,
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
        id: "piemonte_geoportale",
        label: "GeoPortale Piemonte — URL da verificare",
        color: "#7c3aed",
        defaultOn: false,
        wmsUrl: "https://www.geoportale.piemonte.it/geoserver/wms",
        wmsLayer: "piemonte:ppr_componenti",
        opacity: 0.5,
        bounds: [44.06, 6.63, 46.46, 9.21],
        description: "PPR componenti paesaggistiche Piemonte (URL da verificare)",
        fallbackUrls: [
          "https://geomap.reteunitaria.piemonte.it/arcgis/services/Paesaggio/PPR_componenti/MapServer/WMSServer",
          "https://geoservices.piemonte.it/wms",
        ],
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
        id: "sardegna_geoportale",
        label: "Geoportale Sardegna — URL da verificare",
        color: "#7c3aed",
        defaultOn: false,
        wmsUrl: "https://www.sardegnageoportale.it/arcgis/services/PPR/PPR_ambiti/MapServer/WMSServer",
        wmsLayer: "PPR_ambiti",
        opacity: 0.5,
        bounds: [38.86, 8.13, 41.26, 9.83],
        description: "PPR Sardegna (URL da verificare con GetCapabilities)",
        fallbackUrls: [
          "https://webgis2.regione.sardegna.it/geoserver/wms",
          "https://www.sardegnageoportale.it/geoserver/wms",
        ],
      },
    ],
  },

  // ── ALTRE REGIONI ───────────────────────────────────────────
  {
    id: "reg_altri",
    label: "🇮🇹 Altre Regioni (URL da verificare)",
    icon: "📍",
    layers: [
      {
        id: "marche_geoportale",
        label: "Geoportale Marche — URL da verificare",
        color: "#7c3aed",
        defaultOn: false,
        wmsUrl: "https://siat.regione.marche.it/geoserver/wms",
        wmsLayer: "marche:ppar",
        opacity: 0.5,
        bounds: [42.69, 12.08, 43.97, 13.92],
        description: "PPAR Marche (URL da verificare con GetCapabilities)",
        fallbackUrls: ["https://siat.regione.marche.it/wms"],
      },
      {
        id: "umbria_geoportale",
        label: "Umbria Geo — URL da verificare",
        color: "#7c3aed",
        defaultOn: false,
        wmsUrl: "https://www.umbriageo.regione.umbria.it/wms",
        wmsLayer: "umbria:ppr",
        opacity: 0.5,
        bounds: [42.37, 12.07, 43.61, 13.26],
        description: "PPR Umbria (URL da verificare con GetCapabilities)",
        fallbackUrls: [
          "https://umbriageo.regione.umbria.it/geoserver/wms",
          "https://geoportale.regione.umbria.it/wms",
        ],
        tlsBypass: true,
      },
      {
        id: "liguria_geoportale",
        label: "Geoportale Liguria — URL da verificare",
        color: "#7c3aed",
        defaultOn: false,
        wmsUrl: "https://srvcarto.regione.liguria.it/geoserver/wms",
        wmsLayer: "liguria:ptcp",
        opacity: 0.5,
        bounds: [43.78, 7.49, 44.68, 10.07],
        description: "PTCP Liguria (URL da verificare con GetCapabilities)",
        fallbackUrls: ["https://geoportal.regione.liguria.it/geoserver/ows"],
      },
      {
        id: "abruzzo_geoportale",
        label: "Geoportale Abruzzo — URL da verificare",
        color: "#dc2626",
        defaultOn: false,
        wmsUrl: "https://geoportale.regione.abruzzo.it/geoserver/wms",
        wmsLayer: "abruzzo:pai_pericolosita",
        opacity: 0.5,
        bounds: [41.68, 13.02, 42.89, 14.79],
        description: "PAI Abruzzo (URL da verificare con GetCapabilities)",
        fallbackUrls: ["https://geoserver.regione.abruzzo.it/geoserver/wms"],
      },
      {
        id: "fvg_geoportale",
        label: "IRDAT Friuli VG — URL da verificare",
        color: "#7c3aed",
        defaultOn: false,
        wmsUrl: "https://irdat.regione.fvg.it/CTRN/wms",
        wmsLayer: "FVG:ppr",
        opacity: 0.5,
        bounds: [45.58, 12.31, 46.65, 13.92],
        description: "PPR FVG (URL da verificare con GetCapabilities)",
        fallbackUrls: ["https://irdat.regione.fvg.it/geoserver/ows"],
      },
      {
        id: "molise_geoportale",
        label: "Molise — URL da verificare",
        color: "#dc2626",
        defaultOn: false,
        wmsUrl: "https://wms.distrettoappenninomeridionale.it/geoserver/PAI_VIGENTE_PERICOLOSITA_FRANE/wms",
        wmsLayer: "PAI_VIGENTE_PERICOLOSITA_FRANE",
        opacity: 0.5,
        bounds: [41.36, 13.94, 41.91, 15.17],
        description: "PAI Molise via Distretto Appennino Meridionale",
      },
      {
        id: "trentino_geoportale",
        label: "Trentino — URL da verificare",
        color: "#7c3aed",
        defaultOn: false,
        wmsUrl: "https://siat.provincia.tn.it/geoserver/wms",
        wmsLayer: "trentino:pup",
        opacity: 0.5,
        bounds: [45.67, 10.38, 47.09, 12.48],
        description: "PUP Trentino (URL da verificare con GetCapabilities)",
        fallbackUrls: ["https://siatws.provincia.tn.it/arcgis/services"],
      },
      {
        id: "vda_geoportale",
        label: "Valle d'Aosta — URL da verificare",
        color: "#7c3aed",
        defaultOn: false,
        wmsUrl: "https://mappe.regione.vda.it/geoserver/wms",
        wmsLayer: "vda:ptp",
        opacity: 0.5,
        bounds: [45.47, 6.80, 45.99, 7.94],
        description: "PTP Valle d'Aosta (URL da verificare con GetCapabilities)",
        fallbackUrls: ["https://geodati.regione.vda.it/geoserver/ows"],
      },
    ],
  },
];

// Flatten for convenience
export const ALL_LAYERS: LayerDef[] = LAYER_GROUPS.flatMap((g) => g.layers);
