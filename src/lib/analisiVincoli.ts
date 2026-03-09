import { AnalisiVincolistica, Particella, VincoloItem, VincoloPresenza } from "@/types/vincoli";

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

function randomPresenza(pesi: [VincoloPresenza, number][]): VincoloPresenza {
  const total = pesi.reduce((a, b) => a + b[1], 0);
  let r = Math.random() * total;
  for (const [v, w] of pesi) {
    r -= w;
    if (r <= 0) return v;
  }
  return pesi[0][0];
}

// Determine if at least one parcel is in Puglia
function isPuglia(particelle: Particella[]): boolean {
  return particelle.some(p =>
    p.provincia?.toUpperCase() === "BA" ||
    p.provincia?.toUpperCase() === "BR" ||
    p.provincia?.toUpperCase() === "FG" ||
    p.provincia?.toUpperCase() === "LE" ||
    p.provincia?.toUpperCase() === "TA" ||
    p.provincia?.toUpperCase() === "BT" ||
    p.comune?.toLowerCase().includes("puglia") ||
    ["bari", "lecce", "taranto", "foggia", "brindisi", "barletta", "andria", "trani"].some(c =>
      p.comune?.toLowerCase().includes(c)
    )
  );
}

function buildVincoliCulturali(_particelle: Particella[]): VincoloItem[] {
  return [
    {
      id: "bc_01",
      categoria: "Beni Culturali",
      sottocategoria: "Vincolo diretto (art. 10 D.Lgs 42/2004)",
      normativa: "D.Lgs. 42/2004 - Codice dei Beni Culturali e del Paesaggio",
      presenza: randomPresenza([["assente", 60], ["presente", 10], ["verifica", 20], ["non_rilevabile", 10]]),
      descrizione: "Immobili e aree di interesse artistico, storico, archeologico o etnoantropologico",
      fonte: "MiC - Sistema Informativo del Patrimonio Culturale",
    },
    {
      id: "bc_02",
      categoria: "Beni Culturali",
      sottocategoria: "Aree di interesse archeologico (art. 142 c.1 lett. m)",
      normativa: "D.Lgs. 42/2004",
      presenza: randomPresenza([["assente", 50], ["verifica", 35], ["presente", 15]]),
      descrizione: "Zone di interesse paleontologico e di interesse storico dell'età antica",
      fonte: "MiC - Geoportale Vincoli in Rete",
    },
    {
      id: "bc_03",
      categoria: "Beni Culturali",
      sottocategoria: "Vincolo indiretto (art. 45 D.Lgs 42/2004)",
      normativa: "D.Lgs. 42/2004",
      presenza: randomPresenza([["assente", 70], ["verifica", 20], ["presente", 10]]),
      descrizione: "Prescrizioni di distanza, misura, direzione per tutela indiretta di beni culturali",
      fonte: "MiC",
    },
    {
      id: "bc_04",
      categoria: "Beni Culturali",
      sottocategoria: "Presenza beni culturali entro 500 m",
      normativa: "D.Lgs. 42/2004 artt. 45-46",
      presenza: randomPresenza([["assente", 45], ["verifica", 40], ["presente", 15]]),
      descrizione: "Verifica presenza di beni tutelati nel raggio di 500m dall'area. Può generare prescrizioni Soprintendenza",
      fonte: "MiC - Vincoli in Rete",
    },
    {
      id: "bc_05",
      categoria: "Beni Culturali",
      sottocategoria: "Beni UNESCO",
      normativa: "Convenzione UNESCO 1972 - D.Lgs. 42/2004",
      presenza: randomPresenza([["assente", 75], ["verifica", 20], ["presente", 5]]),
      descrizione: "Sito o buffer zone di bene iscritto alla Lista del Patrimonio Mondiale UNESCO. Vincolo di assoluta integrità del paesaggio",
      fonte: "MiC - UNESCO World Heritage",
      note: "Impianti agrivoltaici in area UNESCO richiedono iter autorizzativo speciale e parere favorevole Soprintendenza",
    },
  ];
}

function buildVincoliPaesaggistici(_particelle: Particella[]): VincoloItem[] {
  return [
    {
      id: "pa_01",
      categoria: "Paesaggio",
      sottocategoria: "Vincolo paesaggistico ex lege (art. 142 D.Lgs 42/2004)",
      normativa: "D.Lgs. 42/2004 art. 142",
      presenza: randomPresenza([["assente", 40], ["presente", 30], ["verifica", 30]]),
      descrizione: "Territori costieri, lacuali, fluviali, montani, foreste, zone umide, vulcani, zone di interesse archeologico",
      fonte: "Geoportale Nazionale - Vincoli Paesaggistici",
    },
    {
      id: "pa_02",
      categoria: "Paesaggio",
      sottocategoria: "Vincolo paesaggistico ex art. 136 (beni tutelati per decreto)",
      normativa: "D.Lgs. 42/2004 art. 136",
      presenza: randomPresenza([["assente", 55], ["presente", 25], ["verifica", 20]]),
      descrizione: "Immobili e aree di notevole interesse pubblico dichiarati con decreto ministeriale o regionale",
      fonte: "MiC - Geoportale Vincoli in Rete",
      note: "Se presente → obbligatoria autorizzazione paesaggistica ordinaria (art. 146)",
    },
    {
      id: "pa_03",
      categoria: "Paesaggio",
      sottocategoria: "Piano Paesaggistico Regionale",
      normativa: "D.Lgs. 42/2004 + Piano Paesaggistico Regionale",
      presenza: randomPresenza([["presente", 45], ["verifica", 35], ["assente", 20]]),
      descrizione: "Aree e beni di notevole interesse pubblico soggetti a disciplina paesaggistica regionale. Verificare NTA del PPR vigente",
      fonte: "Regione - Piano Paesaggistico",
    },
    {
      id: "pa_04",
      categoria: "Paesaggio",
      sottocategoria: "Galasso - Fascia di rispetto corsi d'acqua (150m)",
      normativa: "L. 431/1985 - D.Lgs. 42/2004 art. 142 c.1 lett. c",
      presenza: randomPresenza([["assente", 55], ["presente", 25], ["verifica", 20]]),
      descrizione: "Fascia di rispetto di 150m dai fiumi, torrenti, corsi d'acqua iscritti negli elenchi delle acque pubbliche",
      fonte: "PGRA - Piano Gestione Rischio Alluvioni",
    },
    {
      id: "pa_05",
      categoria: "Paesaggio",
      sottocategoria: "Boschi e foreste (art. 142 c.1 lett. g)",
      normativa: "D.Lgs. 42/2004",
      presenza: randomPresenza([["assente", 60], ["presente", 20], ["verifica", 20]]),
      descrizione: "Territori coperti da foreste e da boschi, ancorché percorsi o danneggiati dal fuoco",
      fonte: "Inventario Nazionale delle Foreste e dei Serbatoi Forestali di Carbonio",
    },
    {
      id: "pa_06",
      categoria: "Paesaggio",
      sottocategoria: "Zone montane oltre 1.200 m s.l.m. (art. 142 c.1 lett. d)",
      normativa: "D.Lgs. 42/2004 art. 142",
      presenza: randomPresenza([["assente", 65], ["presente", 15], ["verifica", 20]]),
      descrizione: "Territori al di sopra dei 1.200 metri sul livello del mare tutelati ex lege per interesse paesaggistico",
      fonte: "IGM - DTM nazionale",
    },
    {
      id: "pa_07",
      categoria: "Paesaggio",
      sottocategoria: "Aree panoramiche e interesse storico-rurale",
      normativa: "D.Lgs. 42/2004 art. 136 e 142",
      presenza: randomPresenza([["verifica", 50], ["assente", 35], ["presente", 15]]),
      descrizione: "Zone di particolare interesse panoramico e aree con tutela del paesaggio storico-rurale soggette a specifiche NTA",
      fonte: "Regione/Geoportale Nazionale",
    },
    {
      id: "pa_08",
      categoria: "Paesaggio",
      sottocategoria: "Aree non idonee regionali (art. 20 D.Lgs 199/2021)",
      normativa: "D.Lgs. 199/2021 art. 20 - Delibere regionali attuative",
      presenza: randomPresenza([["verifica", 55], ["assente", 30], ["presente", 15]]),
      descrizione: "Aree individuate dalle Regioni come non idonee per l'installazione di impianti fotovoltaici e agrivoltaici. Da verificare per ogni Regione",
      fonte: "Regione - SIT/Geoportale",
      note: "Obbligo di verifica preventiva rispetto alla cartografia regionale delle aree non idonee ex art. 20 D.Lgs 199/2021",
    },
  ];
}

function buildVincoliIdrogeologici(_particelle: Particella[]): VincoloItem[] {
  return [
    {
      id: "id_01",
      categoria: "Vincolo Idrogeologico",
      sottocategoria: "R.D. 3267/1923 - Vincolo idrogeologico forestale",
      normativa: "R.D. 3267/1923 - Regio Decreto Idrogeologico",
      presenza: randomPresenza([["presente", 35], ["assente", 45], ["verifica", 20]]),
      descrizione: "Terreni soggetti a vincolo per scopi idrogeologici. Qualsiasi trasformazione richiede autorizzazione regionale",
      fonte: "Regione - Catasto Vincolo Idrogeologico",
    },
    {
      id: "id_02",
      categoria: "Vincolo Idrogeologico",
      sottocategoria: "PAI - Pericolosità frana (P1-P4)",
      normativa: "D.L. 180/1998 - D.Lgs. 49/2010 - PAI",
      presenza: randomPresenza([["assente", 40], ["verifica", 30], ["presente", 30]]),
      descrizione: "Piano Assetto Idrogeologico: aree a pericolosità da frana elevata o molto elevata",
      fonte: "ISPRA - IfFI Inventario Fenomeni Franosi",
      note: "Verificare la classe di pericolosità specifica nell'elaborato PAI",
    },
    {
      id: "id_03",
      categoria: "Vincolo Idrogeologico",
      sottocategoria: "PAI - Pericolosità idraulica (P1-P4)",
      normativa: "D.L. 180/1998 - Direttiva Alluvioni 2007/60/CE",
      presenza: randomPresenza([["assente", 45], ["verifica", 35], ["presente", 20]]),
      descrizione: "Aree a pericolosità idraulica: elevata (P3), media (P2), scarsa probabilità (P1/alluvione estrema)",
      fonte: "PGRA - Piano di Gestione del Rischio Alluvioni",
    },
    {
      id: "id_04",
      categoria: "Vincolo Idrogeologico",
      sottocategoria: "Fascia di rispetto pozzi acquedottistici",
      normativa: "D.Lgs. 152/2006 art. 94",
      presenza: randomPresenza([["assente", 65], ["verifica", 25], ["presente", 10]]),
      descrizione: "Zone di rispetto assoluto (10m) e di rispetto (200m) per captazioni di acque destinate al consumo umano",
      fonte: "ATO/Gestori acquedotto",
    },
    {
      id: "id_05",
      categoria: "Vincolo Idrogeologico",
      sottocategoria: "Stabilità versanti e subsidenza",
      normativa: "PAI - D.Lgs. 152/2006",
      presenza: randomPresenza([["assente", 55], ["verifica", 30], ["presente", 15]]),
      descrizione: "Fenomeni di instabilità di versante, erosione e subsidenza. Per agrivoltaico: attenzione alla permeabilità del suolo e al ruscellamento",
      fonte: "ISPRA - ReNDiS",
      note: "L'installazione di strutture agrivoltaiche può alterare il deflusso superficiale: verificare invarianza idraulica",
    },
    {
      id: "id_06",
      categoria: "Vincolo Idrogeologico",
      sottocategoria: "Consorzio di bonifica e canali irrigui",
      normativa: "R.D. 215/1933 - Legislazione regionale bonifica",
      presenza: randomPresenza([["verifica", 45], ["assente", 35], ["presente", 20]]),
      descrizione: "Presenza di comprensori di bonifica, canali irrigui e opere idrauliche con relative fasce di rispetto e servitù",
      fonte: "Consorzio di Bonifica competente",
      note: "Verifica necessaria per interferenze con reticolo idrografico minore e sistemi di drenaggio agricolo",
    },
  ];
}

function buildRischioIdrico(_particelle: Particella[]): VincoloItem[] {
  return [
    {
      id: "ri_01",
      categoria: "Rischio Idrico",
      sottocategoria: "Rischio alluvione (R1-R4)",
      normativa: "PGRA - D.Lgs. 49/2010",
      presenza: randomPresenza([["assente", 40], ["presente", 30], ["verifica", 30]]),
      descrizione: "Mappa del rischio da alluvione: R4 molto elevato, R3 elevato, R2 medio, R1 moderato",
      fonte: "ISPRA - Mappe di Pericolosità e Rischio",
    },
    {
      id: "ri_02",
      categoria: "Rischio Idrico",
      sottocategoria: "Rischio frana (R1-R4)",
      normativa: "PAI Regionale",
      presenza: randomPresenza([["assente", 45], ["verifica", 35], ["presente", 20]]),
      descrizione: "Classe di rischio da frana determinata da pericolosità e valore degli elementi esposti",
      fonte: "Autorità di Bacino Distrettuale",
    },
    {
      id: "ri_03",
      categoria: "Rischio Idrico",
      sottocategoria: "PGRA - Piano Gestione Rischio Alluvioni",
      normativa: "Direttiva 2007/60/CE - D.Lgs. 49/2010",
      presenza: randomPresenza([["verifica", 50], ["presente", 30], ["assente", 20]]),
      descrizione: "Misure e azioni per ridurre le conseguenze negative delle alluvioni sulla salute, attività economiche e ambiente",
      fonte: "Autorità di Bacino Distrettuale",
    },
    {
      id: "ri_04",
      categoria: "Rischio Idrico",
      sottocategoria: "Fasce di rispetto corsi d'acqua e reticolo idrografico",
      normativa: "PAI - D.Lgs. 152/2006 - Legislazione regionale",
      presenza: randomPresenza([["assente", 50], ["verifica", 30], ["presente", 20]]),
      descrizione: "Fasce di rispetto del reticolo idrografico principale e minore. Limitazioni costruttive nelle fasce A e B del PAI",
      fonte: "Autorità di Bacino / Regione",
    },
  ];
}

function buildVincoliAmbientali(_particelle: Particella[]): VincoloItem[] {
  return [
    {
      id: "amb_01",
      categoria: "Vincoli Ambientali",
      sottocategoria: "Siti Rete Natura 2000 - ZSC/SIC",
      normativa: "Dir. 92/43/CEE Habitat - D.P.R. 357/1997",
      presenza: randomPresenza([["assente", 50], ["presente", 25], ["verifica", 25]]),
      descrizione: "Zone Speciali di Conservazione - Siti di Importanza Comunitaria. Se presente → obbligatorio Screening VINCA",
      fonte: "MASE - Rete Natura 2000",
      note: "Per impianti agrivoltaici in ZSC/SIC: Screening VINCA obbligatorio, eventuale VINCA appropriata",
    },
    {
      id: "amb_02",
      categoria: "Vincoli Ambientali",
      sottocategoria: "Zone di Protezione Speciale (ZPS)",
      normativa: "Dir. 79/409/CEE Uccelli - D.P.R. 357/1997",
      presenza: randomPresenza([["assente", 55], ["presente", 20], ["verifica", 25]]),
      descrizione: "Aree classificate ZPS per la protezione delle specie di uccelli selvatici. Richiede VINCA",
      fonte: "MASE - Rete Natura 2000",
    },
    {
      id: "amb_03",
      categoria: "Vincoli Ambientali",
      sottocategoria: "Parco Nazionale / Parco Regionale / Riserva",
      normativa: "L. 394/1991 - Legge Quadro Aree Protette",
      presenza: randomPresenza([["assente", 60], ["presente", 20], ["verifica", 20]]),
      descrizione: "Area ricadente all'interno di parco nazionale, regionale o riserva naturale con relativa zonizzazione",
      fonte: "MASE - Elenco Ufficiale Aree Protette",
    },
    {
      id: "amb_04",
      categoria: "Vincoli Ambientali",
      sottocategoria: "Zone RAMSAR (zone umide internazionali)",
      normativa: "Convenzione Ramsar 1971 - D.P.R. 448/1976",
      presenza: randomPresenza([["assente", 80], ["verifica", 15], ["presente", 5]]),
      descrizione: "Zone umide di importanza internazionale iscritte nella lista Ramsar. Vietata qualsiasi alterazione del regime idrologico",
      fonte: "MASE - Siti Ramsar Italia",
    },
    {
      id: "amb_05",
      categoria: "Vincoli Ambientali",
      sottocategoria: "VIA obbligatoria (D.Lgs. 152/2006)",
      normativa: "D.Lgs. 152/2006 Titolo III - D.Lgs. 104/2017",
      presenza: randomPresenza([["verifica", 60], ["assente", 30], ["presente", 10]]),
      descrizione: "Obbligo di VIA per impianti FV/agrivoltaici ≥ 10 MW (All. II) o ≥ 1 MW in aree sensibili (All. III)",
      fonte: "MASE - Registro VIA",
    },
    {
      id: "amb_06",
      categoria: "Vincoli Ambientali",
      sottocategoria: "Sito Contaminato/Bonifica",
      normativa: "D.Lgs. 152/2006 Titolo V Parte IV",
      presenza: randomPresenza([["assente", 70], ["verifica", 20], ["presente", 10]]),
      descrizione: "Sito soggetto a bonifica o messa in sicurezza per contaminazione del suolo/sottosuolo",
      fonte: "MASE/Regione - Anagrafe Siti Contaminati",
    },
  ];
}

function buildServiziReti(_particelle: Particella[]): VincoloItem[] {
  return [
    {
      id: "sr_01",
      categoria: "Servizi e Reti",
      sottocategoria: "Elettrodotto AT/AAT con fascia di rispetto (DPA)",
      normativa: "DPCM 8/7/2003 - L. 36/2001 Legge Quadro Elettromagnetismo",
      presenza: randomPresenza([["assente", 50], ["verifica", 30], ["presente", 20]]),
      descrizione: "Linee elettriche ad alta e altissima tensione con relative fasce di rispetto da 10 a 100m. DPA da verificare",
      fonte: "Terna SpA / Gestore Distribuzione Locale",
      note: "Richiedere estratto cartografico al gestore per l'esatta individuazione. Distanza di prima approssimazione (DPA) calcolabile",
    },
    {
      id: "sr_02",
      categoria: "Servizi e Reti",
      sottocategoria: "Metanodotto/Gasdotto (fascia di rispetto)",
      normativa: "D.Lgs. 1/8/2003 n.93 - D.M. 17/4/2008",
      presenza: randomPresenza([["assente", 55], ["verifica", 30], ["presente", 15]]),
      descrizione: "Condotte di trasporto gas con relative fasce di sicurezza e limitazioni edificatorie",
      fonte: "Snam Rete Gas / Gestore locale",
      note: "Verificare tipologia di gasdotto e pressione massima esercita (MOP)",
    },
    {
      id: "sr_03",
      categoria: "Servizi e Reti",
      sottocategoria: "Oleodotto (fascia di rispetto)",
      normativa: "D.M. 24/11/1984",
      presenza: randomPresenza([["assente", 75], ["verifica", 20], ["presente", 5]]),
      descrizione: "Condotte per il trasporto di idrocarburi liquidi con relative fasce di rispetto",
      fonte: "Gestore impianto",
    },
    {
      id: "sr_04",
      categoria: "Servizi e Reti",
      sottocategoria: "Strade statali/provinciali (fascia di rispetto)",
      normativa: "D.Lgs. 285/1992 - D.P.R. 495/1992",
      presenza: randomPresenza([["assente", 40], ["presente", 35], ["verifica", 25]]),
      descrizione: "Fasce di rispetto stradali: 60m strade statali, 40m provinciali, 30m comunali fuori centro abitato",
      fonte: "ANAS / Ente gestore provinciale",
    },
    {
      id: "sr_05",
      categoria: "Servizi e Reti",
      sottocategoria: "Ferrovia (fascia di rispetto 30m)",
      normativa: "D.P.R. 753/1980 - D.Lgs. 285/2005",
      presenza: randomPresenza([["assente", 60], ["verifica", 25], ["presente", 15]]),
      descrizione: "Fascia di rispetto ferroviaria di 30m dal binario. Richiede nulla osta RFI",
      fonte: "RFI - Rete Ferroviaria Italiana",
    },
    {
      id: "sr_06",
      categoria: "Servizi e Reti",
      sottocategoria: "Acquedotto e fognatura (fascia di rispetto)",
      normativa: "D.Lgs. 152/2006 - Regolamento locale",
      presenza: randomPresenza([["verifica", 45], ["assente", 35], ["presente", 20]]),
      descrizione: "Infrastrutture idriche con fasce di rispetto e servitù. Limitazioni per costruzioni e scavi",
      fonte: "Gestore ATO / Comune",
    },
    {
      id: "sr_07",
      categoria: "Servizi e Reti",
      sottocategoria: "Cavidotti telecomunicazioni / fibra ottica",
      normativa: "D.Lgs. 259/2003 - Codice delle Comunicazioni Elettroniche",
      presenza: randomPresenza([["verifica", 50], ["assente", 30], ["presente", 20]]),
      descrizione: "Reti di telecomunicazione interrate o aeree. Servitù di passaggio e limitazioni scavi",
      fonte: "Operatori TLC / Infratel",
    },
    {
      id: "sr_08",
      categoria: "Servizi e Reti",
      sottocategoria: "Vincolo cimiteriale (fascia 200m)",
      normativa: "T.U. Leggi Sanitarie R.D. 1265/1934 art. 338 - D.P.R. 285/1990",
      presenza: randomPresenza([["assente", 70], ["presente", 15], ["verifica", 15]]),
      descrizione: "Zona di rispetto cimiteriale di 200m entro cui è vietata la costruzione",
      fonte: "Comune",
    },
  ];
}

function buildAltriVincoli(_particelle: Particella[]): VincoloItem[] {
  return [
    {
      id: "av_01",
      categoria: "Altri Vincoli",
      sottocategoria: "PRG/POC - Destinazione urbanistica zona E agricola",
      normativa: "L. 1150/1942 - Legislazione regionale urbanistica",
      presenza: "presente",
      descrizione: "Destinazione d'uso urbanistica vigente. Verificare NTA per eventuali divieti impianti a terra in zona E agricola",
      fonte: "Comune - Ufficio Urbanistica",
    },
    {
      id: "av_02",
      categoria: "Altri Vincoli",
      sottocategoria: "PTCP / PTC - Pianificazione sovracomunale",
      normativa: "L. 267/2000 - D.Lgs. 267/2000",
      presenza: randomPresenza([["verifica", 55], ["presente", 25], ["assente", 20]]),
      descrizione: "Piano Territoriale di Coordinamento Provinciale. Verificare eventuali indirizzi o norme vincolanti per FER",
      fonte: "Provincia / Città Metropolitana",
    },
    {
      id: "av_03",
      categoria: "Altri Vincoli",
      sottocategoria: "Linee guida regionali agrivoltaico",
      normativa: "D.Lgs. 199/2021 - Delibere regionali",
      presenza: randomPresenza([["verifica", 65], ["presente", 25], ["assente", 10]]),
      descrizione: "Normativa regionale specifica per impianti agrivoltaici. Verificare requisiti tecnici, distanze e obblighi di monitoraggio",
      fonte: "Regione - Assessorato Energia/Agricoltura",
    },
    {
      id: "av_04",
      categoria: "Altri Vincoli",
      sottocategoria: "Demanio e proprietà pubblica / Usi civici",
      normativa: "Cod. Civ. art. 822-830 - L. 1766/1927 - D.Lgs. 85/2010",
      presenza: randomPresenza([["assente", 55], ["verifica", 35], ["presente", 10]]),
      descrizione: "Interferenza con aree demaniali, usi civici o proprietà collettiva. Gli usi civici NON possono essere liquidati per impianti FER",
      fonte: "Agenzie Demanio / Regione / Commissariato Usi Civici",
      note: "FONDAMENTALE: verificare presenza usi civici prima di qualsiasi impegno. Sono un blocco assoluto insormontabile",
    },
    {
      id: "av_05",
      categoria: "Altri Vincoli",
      sottocategoria: "Servitù, enfiteusi, livelli e diritti di terzi",
      normativa: "Codice Civile - Trascrizioni catastali",
      presenza: randomPresenza([["assente", 60], ["verifica", 30], ["presente", 10]]),
      descrizione: "Diritti reali di godimento che possono limitare l'utilizzo del terreno (servitù di passaggio, enfiteusi, livelli)",
      fonte: "Conservatoria dei Registri Immobiliari / Catasto",
    },
    {
      id: "av_06",
      categoria: "Altri Vincoli",
      sottocategoria: "Concessioni minerarie/idrocarburifere",
      normativa: "R.D. 1443/1927 - D.Lgs. 625/1996",
      presenza: randomPresenza([["assente", 80], ["verifica", 15], ["presente", 5]]),
      descrizione: "Presenza di concessioni minerarie o idrocarburifere che possono gravare sull'area e pregiudicare l'intervento",
      fonte: "MASE - UNMIG",
    },
  ];
}

// ══════════════════════════════════════════════════════════════
// NUOVE SEZIONI AGRIVOLTAICO
// ══════════════════════════════════════════════════════════════

function buildVincoliAgricoli(particelle: Particella[]): VincoloItem[] {
  const inPuglia = isPuglia(particelle);
  const vincoli: VincoloItem[] = [
    {
      id: "ag_01",
      categoria: "Vincoli Agricoli",
      sottocategoria: "Classe capacità d'uso suolo (LCC) - Classi I e II",
      normativa: "D.Lgs. 199/2021 art. 20 - Linee guida regionali",
      presenza: randomPresenza([["verifica", 50], ["presente", 25], ["assente", 25]]),
      descrizione: "Terreni con Land Capability Classification I e II (suoli agricoli di altissima qualità). In molte regioni vietato per FV a terra",
      fonte: "AGEA / Regione - Carta della capacità d'uso",
      note: "Alcune regioni vietano impianti su suoli LCC I e II. Verificare normativa regionale specifica",
    },
    {
      id: "ag_02",
      categoria: "Vincoli Agricoli",
      sottocategoria: "SAU - Superficie Agricola Utilizzata",
      normativa: "Reg. UE 1307/2013 - D.Lgs. 199/2021",
      presenza: "presente",
      descrizione: "Verifica della classificazione catastale e della destinazione produttiva. L'agrivoltaico deve garantire continuità dell'attività agricola",
      fonte: "AGEA - BDN Fascicolo Aziendale",
    },
    {
      id: "ag_03",
      categoria: "Vincoli Agricoli",
      sottocategoria: "Vigneti DOC/DOCG",
      normativa: "D.Lgs. 61/2010 - Reg. UE 1308/2013",
      presenza: randomPresenza([["assente", 60], ["verifica", 25], ["presente", 15]]),
      descrizione: "Presenza di vigneti iscritti a DOC/DOCG con vincoli disciplinari che possono vietare modifiche strutturali",
      fonte: "MIPAAF - Albo vigneti / Camera di Commercio",
    },
    {
      id: "ag_04",
      categoria: "Vincoli Agricoli",
      sottocategoria: "Uliveti storici e produzioni DOP/IGP",
      normativa: "L. 168/2017 - Reg. UE 1151/2012",
      presenza: randomPresenza([["assente", 55], ["verifica", 30], ["presente", 15]]),
      descrizione: "Zone di produzione con marchi DOP/IGP agricoli che possono avere vincoli paesaggistici e disciplinari incompatibili",
      fonte: "MIPAAF / Consorzi di tutela",
    },
    {
      id: "ag_05",
      categoria: "Vincoli Agricoli",
      sottocategoria: "Colture pregiate e paesaggio rurale storico",
      normativa: "D.M. 17/10/2012 - Registro Paesaggi Rurali Storici",
      presenza: randomPresenza([["assente", 65], ["verifica", 25], ["presente", 10]]),
      descrizione: "Area inclusa nel Registro Nazionale dei Paesaggi Rurali di Interesse Storico. Richiede valutazione specifica",
      fonte: "MIPAAF - Osservatorio Nazionale del Paesaggio Rurale",
    },
  ];
  if (inPuglia) {
    vincoli.push({
      id: "ag_06",
      categoria: "Vincoli Agricoli",
      sottocategoria: "🌳 Olivi monumentali (L.R. Puglia 14/2007 - L. 168/2017)",
      normativa: "L. 168/2017 - L.R. Puglia 14/2007 e s.m.i.",
      presenza: "verifica",
      descrizione: "Puglia: verifica obbligatoria presenza olivi monumentali. Vietato sradicare, espianto o alterazione delle piante iscritte al Registro Regionale",
      fonte: "Regione Puglia - Registro degli ulivi monumentali",
      note: "ATTENZIONE PUGLIA: L'olivo monumentale è inabbattibile. Le strutture agrivoltaiche devono essere progettate attorno ad essi. Verificare registro comunale e regionale",
    });
  }
  return vincoli;
}

function buildVincoliMilitariRadar(_particelle: Particella[]): VincoloItem[] {
  return [
    {
      id: "mil_01",
      categoria: "Militari e Radar",
      sottocategoria: "Aree militari e zone di rispetto",
      normativa: "Cod. Ordinamento Militare D.Lgs. 66/2010 - L. 898/1976",
      presenza: randomPresenza([["assente", 65], ["verifica", 25], ["presente", 10]]),
      descrizione: "Zone di servitù militare con limitazioni all'uso del suolo e vincoli di altezza",
      fonte: "Ministero della Difesa - SGDDNA",
    },
    {
      id: "mil_02",
      categoria: "Militari e Radar",
      sottocategoria: "Zone di rispetto aeroportuale (ENAC)",
      normativa: "Cod. della Navigazione Aerea - Reg. ENAC",
      presenza: randomPresenza([["assente", 60], ["verifica", 30], ["presente", 10]]),
      descrizione: "Limitazioni di ostacolo e superfici di rispetto aeroportuali. Strutture agrivoltaiche devono rispettare altezze limite",
      fonte: "ENAC - Piano di Rischio Aeroportuale",
      note: "Richiesto nulla osta ENAC per strutture oltre determinate altezze nelle zone di rispetto aeroportuale",
    },
    {
      id: "mil_03",
      categoria: "Militari e Radar",
      sottocategoria: "Interferenze radar militari e civili",
      normativa: "Cod. della Navigazione Aerea - ENAC/ENAV",
      presenza: randomPresenza([["assente", 70], ["verifica", 25], ["presente", 5]]),
      descrizione: "Zone di protezione radar: gli impianti agrivoltaici (strutture metalliche) possono interferire con i segnali radar",
      fonte: "ENAV / Aeronautica Militare",
      note: "Verificare con ENAV/AM la presenza di zone di rispetto radar entro 10 km dall'area",
    },
  ];
}

function buildVincoliForestali(_particelle: Particella[]): VincoloItem[] {
  return [
    {
      id: "for_01",
      categoria: "Vincoli Forestali",
      sottocategoria: "Bosco secondo definizione regionale (D.Lgs. 34/2018)",
      normativa: "D.Lgs. 34/2018 - TUFF - Definizioni regionali",
      presenza: randomPresenza([["assente", 55], ["verifica", 30], ["presente", 15]]),
      descrizione: "Terreno classificato come bosco ai sensi del D.Lgs. 34/2018 e/o della definizione regionale. Vietata la trasformazione",
      fonte: "Regione - Inventario Forestale",
    },
    {
      id: "for_02",
      categoria: "Vincoli Forestali",
      sottocategoria: "Aree percorse da incendio (vincolo 15 anni)",
      normativa: "L. 353/2000 - Legge Quadro Incendi Boschivi",
      presenza: randomPresenza([["assente", 65], ["verifica", 25], ["presente", 10]]),
      descrizione: "Aree percorse da incendio soggette a vincolo di 15 anni: vietato cambio di destinazione d'uso e costruzioni",
      fonte: "Comune - Catasto Aree Percorse da Fuoco",
      note: "Il vincolo decadenziale di 15 anni è assoluto. Verificare i registri comunali obbligatori per legge",
    },
    {
      id: "for_03",
      categoria: "Vincoli Forestali",
      sottocategoria: "Taglio bosco e autorizzazione forestale",
      normativa: "D.Lgs. 34/2018 - Legislazione forestale regionale",
      presenza: randomPresenza([["assente", 60], ["verifica", 30], ["presente", 10]]),
      descrizione: "Eventuale presenza di vegetazione arborea che richiede autorizzazione per taglio o diradamento",
      fonte: "Regione - Ufficio Foreste",
    },
  ];
}

function buildVincoliSismici(_particelle: Particella[]): VincoloItem[] {
  return [
    {
      id: "sis_01",
      categoria: "Vincoli Sismici",
      sottocategoria: "Classificazione sismica del Comune (Zone 1-4)",
      normativa: "OPCM 3274/2003 - D.M. 17/01/2018 NTC",
      presenza: "presente",
      descrizione: "Tutti i comuni italiani sono classificati in zone sismiche 1-4. Per agrivoltaico: fondazioni e strutture devono rispettare le NTC",
      fonte: "Dipartimento Protezione Civile - Classificazione sismica",
    },
    {
      id: "sis_02",
      categoria: "Vincoli Sismici",
      sottocategoria: "Microzonazione sismica",
      normativa: "OPCM 3907/2010 - Indirizzi e Criteri Microzonazione Sismica",
      presenza: randomPresenza([["non_rilevabile", 50], ["verifica", 35], ["assente", 15]]),
      descrizione: "Studi di microzonazione sismica che individuano zone a comportamento sismico omogeneo. Può imporre verifiche specifiche",
      fonte: "Regione / Portale MS Italia",
    },
  ];
}

function buildVincoliCatastali(_particelle: Particella[]): VincoloItem[] {
  return [
    {
      id: "cat_01",
      categoria: "Vincoli Catastali e Proprietà",
      sottocategoria: "Usi civici e diritti collettivi",
      normativa: "L. 1766/1927 - L. 168/2017 - Sent. Corte Cost. 210/2014",
      presenza: randomPresenza([["assente", 55], ["verifica", 35], ["presente", 10]]),
      descrizione: "Terreni gravati da usi civici: diritti d'uso delle comunità locali insopprimibili. Blocco assoluto per impianti FER",
      fonte: "Regione / Commissariato Usi Civici",
      note: "Gli usi civici NON possono essere liquidati per costruire impianti FER. Verificare presso gli uffici regionali competenti PRIMA di qualsiasi impegno",
    },
    {
      id: "cat_02",
      categoria: "Vincoli Catastali e Proprietà",
      sottocategoria: "Servitù prediali attive e passive",
      normativa: "Codice Civile artt. 1027-1099",
      presenza: randomPresenza([["assente", 50], ["verifica", 35], ["presente", 15]]),
      descrizione: "Servitù di passaggio, acquedotto, elettrodotto che gravano sul fondo e possono limitare il posizionamento delle strutture",
      fonte: "Conservatoria Registri Immobiliari",
    },
    {
      id: "cat_03",
      categoria: "Vincoli Catastali e Proprietà",
      sottocategoria: "Enfiteusi, livelli e usucapioni",
      normativa: "Codice Civile artt. 957-977",
      presenza: randomPresenza([["assente", 70], ["verifica", 25], ["presente", 5]]),
      descrizione: "Diritti reali di godimento minori che possono condizionare la disponibilità piena del fondo",
      fonte: "Conservatoria Registri Immobiliari / Catasto",
    },
  ];
}

function buildCompatibilitaConnessione(_particelle: Particella[]): VincoloItem[] {
  return [
    {
      id: "conn_01",
      categoria: "Compatibilità Connessione Rete",
      sottocategoria: "Distanza da cabina primaria AT/MT",
      normativa: "D.Lgs. 199/2021 - Regole di Terna/Distributori",
      presenza: randomPresenza([["verifica", 55], ["assente", 25], ["presente", 20]]),
      descrizione: "Distanza dalla cabina primaria: determina costi e fattibilità della connessione. Ottimale < 5 km, critica > 15 km",
      fonte: "Terna SpA / Gestore di Distribuzione locale",
    },
    {
      id: "conn_02",
      categoria: "Compatibilità Connessione Rete",
      sottocategoria: "Disponibilità STMG (Soluzione Tecnica Minima Garantita)",
      normativa: "D.Lgs. 199/2021 - Delibera ARERA 99/08",
      presenza: randomPresenza([["verifica", 60], ["assente", 25], ["presente", 15]]),
      descrizione: "Capacità residua di connessione in rete: da verificare con richiesta preliminare al distributore o Terna",
      fonte: "Gestore di rete / Portale Gaudi (ARERA)",
      note: "Congestione di rete in alcune aree può rendere la connessione non economicamente sostenibile",
    },
    {
      id: "conn_03",
      categoria: "Compatibilità Connessione Rete",
      sottocategoria: "Presenza linea AT esistente",
      normativa: "Regole tecniche CEI - Standard Terna",
      presenza: randomPresenza([["verifica", 50], ["assente", 30], ["presente", 20]]),
      descrizione: "Verifica presenza di linee AT nelle vicinanze per valutare possibilità di connessione in AT senza cabina primaria",
      fonte: "Terna SpA - Cartografia elettrica",
    },
  ];
}

function buildAreeIdonee(_particelle: Particella[]): VincoloItem[] {
  return [
    {
      id: "ai_01",
      categoria: "Aree Idonee FV/Agrivoltaico",
      sottocategoria: "Verifica aree idonee ex D.Lgs. 199/2021 art. 20",
      normativa: "D.Lgs. 199/2021 art. 20 - D.M. Aree Idonee (2024)",
      presenza: randomPresenza([["verifica", 60], ["assente", 25], ["presente", 15]]),
      descrizione: "Verifica se il sito ricade in aree individuate come idonee dal D.M. Aree Idonee. In aree idonee: iter semplificato PAS",
      fonte: "MASE / Geoportale Nazionale / Regioni",
      note: "Le aree idonee godono di iter autorizzativo semplificato. Verificare la cartografia vigente nella regione specifica",
    },
    {
      id: "ai_02",
      categoria: "Aree Idonee FV/Agrivoltaico",
      sottocategoria: "Aree agricole di pregio da escludere",
      normativa: "D.Lgs. 199/2021 - D.M. Aree Idonee",
      presenza: randomPresenza([["verifica", 50], ["presente", 25], ["assente", 25]]),
      descrizione: "Aree agricole di pregio esplicitamente escluse dalle aree idonee: LCC I, II, vigneti DOC, oliveti storici",
      fonte: "MIPAAF / Regioni",
      note: "Non confondere: l'agrivoltaico con mantenimento dell'attività agricola può essere ammesso anche in alcune aree di pregio",
    },
    {
      id: "ai_03",
      categoria: "Aree Idonee FV/Agrivoltaico",
      sottocategoria: "Fasce costiere e beni UNESCO (aree non idonee)",
      normativa: "D.Lgs. 199/2021 - D.Lgs. 42/2004",
      presenza: randomPresenza([["assente", 65], ["verifica", 25], ["presente", 10]]),
      descrizione: "Fasce costiere (variabile per regione) e buffer zone beni UNESCO: sempre escluse dalle aree idonee FER",
      fonte: "MASE / Regioni",
    },
    {
      id: "ai_04",
      categoria: "Aree Idonee FV/Agrivoltaico",
      sottocategoria: "Iter autorizzativo applicabile (PAS/AU/VIA/PAUR)",
      normativa: "D.Lgs. 199/2021 - D.Lgs. 152/2006 - L. 387/2003",
      presenza: "verifica",
      descrizione: "Determinazione dell'iter: PAS (<1MW, aree idonee), Autorizzazione Unica (AU), VIA, PAUR. Dipende da potenza, area e vincoli presenti",
      fonte: "Regione / MASE",
      note: "Agrivoltaico avanzato DM 22/2022: può accedere a iter semplificato se rispetta tutti i requisiti tecnici",
    },
  ];
}

function buildNormativaAgrivoltaico(_particelle: Particella[]): VincoloItem[] {
  return [
    {
      id: "av_n01",
      categoria: "Normativa Agrivoltaico (DM 22/2022)",
      sottocategoria: "Continuità attività agricola certificata",
      normativa: "D.M. 22/12/2022 - Linee guida agrivoltaico avanzato",
      presenza: "verifica",
      descrizione: "Requisito fondamentale: l'attività agricola deve essere mantenuta attiva e certificata per tutta la vita dell'impianto",
      fonte: "GSE - Gestore Servizi Energetici",
      note: "Senza continuità agricola documentata l'impianto non è classificabile come agrivoltaico ma come FV a terra ordinario",
    },
    {
      id: "av_n02",
      categoria: "Normativa Agrivoltaico (DM 22/2022)",
      sottocategoria: "Altezza minima strutture e distanza tra file",
      normativa: "D.M. 22/12/2022",
      presenza: "verifica",
      descrizione: "Moduli installati a un'altezza minima da terra compatibile con le colture sottostanti. Distanza tra file che garantisce passaggio mezzi agricoli",
      fonte: "GSE - Linee guida agrivoltaico",
      note: "DM 22/2022: altezza minima generalmente ≥ 2,1m dal suolo per permettere attività agricola meccanizzata",
    },
    {
      id: "av_n03",
      categoria: "Normativa Agrivoltaico (DM 22/2022)",
      sottocategoria: "LAOR - SAU non coperta (≥ 70%)",
      normativa: "D.M. 22/12/2022",
      presenza: "verifica",
      descrizione: "La superficie agricola non coperta dai moduli deve essere almeno il 70% (LAOR: Limite Addizionale Occupazione Residua)",
      fonte: "GSE",
      note: "Parametro fondamentale per classificazione agrivoltaico avanzato e accesso incentivi Decreto FER",
    },
    {
      id: "av_n04",
      categoria: "Normativa Agrivoltaico (DM 22/2022)",
      sottocategoria: "Sistema di monitoraggio agricolo (PMRT)",
      normativa: "D.M. 22/12/2022",
      presenza: "verifica",
      descrizione: "Piano di Monitoraggio e Reporting Tecnico obbligatorio: produzione agricola, microclima, biodiversità, risparmio idrico",
      fonte: "GSE - PMRT",
    },
    {
      id: "av_n05",
      categoria: "Normativa Agrivoltaico (DM 22/2022)",
      sottocategoria: "Sistema di agricoltura attiva (colture compatibili)",
      normativa: "D.M. 22/12/2022 - Linee guida GSE",
      presenza: "verifica",
      descrizione: "Le colture o l'allevamento praticato deve essere compatibile con la presenza dei moduli (pascolo, orticole, aromatiche, ecc.)",
      fonte: "GSE",
      note: "Verificare la compatibilità agro-energetica specifica per il tipo di produzione agricola prevista",
    },
  ];
}

function computeRischioComplessivo(analisi: Omit<AnalisiVincolistica, "rischioComplessivo" | "areaUtileLordaHa" | "areaUtileNettaHa">): AnalisiVincolistica["rischioComplessivo"] {
  const allVincoli = [
    ...analisi.vincoliCulturali,
    ...analisi.vincoliPaesaggistici,
    ...analisi.vincoliIdrogeologici,
    ...analisi.vincoliAmbientali,
    ...analisi.rischioIdrico,
    ...analisi.serviziReti,
    ...analisi.altriVincoli,
    ...analisi.vincoliAgricoli,
    ...analisi.vincoliMilitariRadar,
    ...analisi.vincoliForestali,
    ...analisi.vincoliSismici,
    ...analisi.vincoliCatastali,
    ...analisi.compatibilitaConnessione,
    ...analisi.areeIdonee,
    ...analisi.normativaAgrivoltaico,
  ];
  const presenti = allVincoli.filter(v => v.presenza === "presente").length;
  const verifica = allVincoli.filter(v => v.presenza === "verifica").length;

  if (presenti >= 10) return "molto_alto";
  if (presenti >= 6) return "alto";
  if (presenti >= 3 || verifica >= 10) return "medio";
  if (presenti >= 1 || verifica >= 5) return "basso";
  return "nessuno";
}

export async function runAnalisiVincolistica(particelle: Particella[]): Promise<AnalisiVincolistica> {
  await delay(2800);

  const partial = {
    particelle,
    dataAnalisi: new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }),
    vincoliCulturali: buildVincoliCulturali(particelle),
    vincoliPaesaggistici: buildVincoliPaesaggistici(particelle),
    vincoliIdrogeologici: buildVincoliIdrogeologici(particelle),
    vincoliAmbientali: buildVincoliAmbientali(particelle),
    rischioIdrico: buildRischioIdrico(particelle),
    serviziReti: buildServiziReti(particelle),
    altriVincoli: buildAltriVincoli(particelle),
    vincoliAgricoli: buildVincoliAgricoli(particelle),
    vincoliMilitariRadar: buildVincoliMilitariRadar(particelle),
    vincoliForestali: buildVincoliForestali(particelle),
    vincoliSismici: buildVincoliSismici(particelle),
    vincoliCatastali: buildVincoliCatastali(particelle),
    compatibilitaConnessione: buildCompatibilitaConnessione(particelle),
    areeIdonee: buildAreeIdonee(particelle),
    normativaAgrivoltaico: buildNormativaAgrivoltaico(particelle),
  };

  const rischioComplessivo = computeRischioComplessivo(partial);

  // ── AUL / AUN ──
  const areaUtileLordaHa = particelle.reduce((sum, p) => sum + (p.superficieMq ?? 0), 0) / 10_000;

  // AUN: stima l'area netta sottraendo una % per ogni vincolo "presente"
  // Le "aree idonee" sono POSITIVE (non riducono l'area, anzi la rendono più accessibile)
  const vincoliNegativi = [
    ...partial.vincoliCulturali, ...partial.vincoliPaesaggistici,
    ...partial.vincoliIdrogeologici, ...partial.vincoliAmbientali,
    ...partial.rischioIdrico, ...partial.serviziReti, ...partial.altriVincoli,
    ...partial.vincoliAgricoli, ...partial.vincoliMilitariRadar,
    ...partial.vincoliForestali, ...partial.vincoliSismici,
    ...partial.vincoliCatastali, ...partial.compatibilitaConnessione,
    ...partial.normativaAgrivoltaico,
  ];
  // Aree idonee sono positive: se presenti aumentano l'area utile
  const areeIdoneeFavorevoli = partial.areeIdonee.filter(v => 
    v.presenza === "presente" && !v.sottocategoria.toLowerCase().includes("esclud") && !v.sottocategoria.toLowerCase().includes("non idonee")
  ).length;
  
  const presenti = vincoliNegativi.filter(v => v.presenza === "presente").length;
  const verificare = vincoliNegativi.filter(v => v.presenza === "verifica").length;
  
  // Ogni vincolo presente riduce ~8% dell'area, ogni "verifica" ~2% (cautelativo)
  // Ogni area idonea favorevole recupera +5% dell'area
  const riduzioneBase = presenti * 0.08 + verificare * 0.02;
  const bonusIdonee = areeIdoneeFavorevoli * 0.05;
  const riduzionePerc = Math.max(0, Math.min(0.95, riduzioneBase - bonusIdonee));
  const areaUtileNettaHa = Math.max(0, areaUtileLordaHa * (1 - riduzionePerc));

  return {
    ...partial,
    rischioComplessivo,
    areaUtileLordaHa: Math.round(areaUtileLordaHa * 1000) / 1000,
    areaUtileNettaHa: Math.round(areaUtileNettaHa * 1000) / 1000,
  };
}
