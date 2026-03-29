import { AnalisiVincolistica, Particella, VincoloItem, VincoloPresenza, CriticitaLevel, StepAutorizzativo, ClassificazioneIdoneita } from "@/types/vincoli";

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

function isPuglia(particelle: Particella[]): boolean {
  return particelle.some(p =>
    ["BA","BR","FG","LE","TA","BT"].includes(p.provincia?.toUpperCase()) ||
    p.comune?.toLowerCase().includes("puglia") ||
    ["bari","lecce","taranto","foggia","brindisi","barletta","andria","trani"].some(c =>
      p.comune?.toLowerCase().includes(c)
    )
  );
}

// ══════════════════════════════════════════════════════════════
// VINCOLO BUILDERS — Each vincolo now includes criticita + azioneRichiesta
// ══════════════════════════════════════════════════════════════

function buildVincoliCulturali(_particelle: Particella[]): VincoloItem[] {
  return [
    {
      id: "bc_01", categoria: "Beni Culturali",
      sottocategoria: "Vincolo diretto (art. 10 D.Lgs 42/2004)",
      normativa: "D.Lgs. 42/2004 - Codice dei Beni Culturali e del Paesaggio",
      presenza: randomPresenza([["assente", 60], ["presente", 10], ["verifica", 20], ["non_rilevabile", 10]]),
      descrizione: "Immobili e aree di interesse artistico, storico, archeologico o etnoantropologico",
      fonte: "MiC - Sistema Informativo del Patrimonio Culturale",
      criticita: "escludente",
      azioneRichiesta: "Autorizzazione Soprintendenza ABAP ai sensi dell'art. 21 D.Lgs. 42/2004",
    },
    {
      id: "bc_02", categoria: "Beni Culturali",
      sottocategoria: "Aree di interesse archeologico (art. 142 c.1 lett. m)",
      normativa: "D.Lgs. 42/2004",
      presenza: randomPresenza([["assente", 50], ["verifica", 35], ["presente", 15]]),
      descrizione: "Zone di interesse paleontologico e storico dell'età antica",
      fonte: "MiC - Geoportale Vincoli in Rete",
      criticita: "condizionante",
      azioneRichiesta: "Verifica archeologica preventiva + autorizzazione paesaggistica",
    },
    {
      id: "bc_03", categoria: "Beni Culturali",
      sottocategoria: "Vincolo indiretto (art. 45 D.Lgs 42/2004)",
      normativa: "D.Lgs. 42/2004",
      presenza: randomPresenza([["assente", 70], ["verifica", 20], ["presente", 10]]),
      descrizione: "Prescrizioni di distanza, misura, direzione per tutela indiretta di beni culturali",
      fonte: "MiC",
      criticita: "condizionante",
      azioneRichiesta: "Verifica prescrizioni Soprintendenza",
    },
    {
      id: "bc_04", categoria: "Beni Culturali",
      sottocategoria: "Presenza beni culturali entro 500 m",
      normativa: "D.Lgs. 42/2004 artt. 45-46",
      presenza: randomPresenza([["assente", 45], ["verifica", 40], ["presente", 15]]),
      descrizione: "Verifica presenza beni tutelati nel raggio di 500m dall'area",
      fonte: "MiC - Vincoli in Rete",
      criticita: "da_verificare",
      azioneRichiesta: "Richiedere parere Soprintendenza per potenziali prescrizioni",
    },
    {
      id: "bc_05", categoria: "Beni Culturali",
      sottocategoria: "Beni UNESCO",
      normativa: "Convenzione UNESCO 1972 - D.Lgs. 42/2004",
      presenza: randomPresenza([["assente", 75], ["verifica", 20], ["presente", 5]]),
      descrizione: "Sito o buffer zone UNESCO. Vincolo di assoluta integrità del paesaggio",
      fonte: "MiC - UNESCO World Heritage",
      note: "Impianti in area UNESCO richiedono iter speciale e parere Soprintendenza",
      criticita: "escludente",
      azioneRichiesta: "Vincolo assoluto in core zone; parere Soprintendenza in buffer zone",
    },
  ];
}

function buildVincoliPaesaggistici(_particelle: Particella[]): VincoloItem[] {
  return [
    {
      id: "pa_01", categoria: "Paesaggio",
      sottocategoria: "Vincolo paesaggistico ex lege (art. 142 D.Lgs 42/2004)",
      normativa: "D.Lgs. 42/2004 art. 142",
      presenza: randomPresenza([["assente", 40], ["presente", 30], ["verifica", 30]]),
      descrizione: "Territori costieri, lacuali, fluviali, montani, foreste, zone umide, vulcani",
      fonte: "Geoportale Nazionale - Vincoli Paesaggistici",
      criticita: "condizionante",
      azioneRichiesta: "Autorizzazione paesaggistica ordinaria ex art. 146 D.Lgs. 42/2004",
    },
    {
      id: "pa_02", categoria: "Paesaggio",
      sottocategoria: "Vincolo paesaggistico ex art. 136 (beni tutelati per decreto)",
      normativa: "D.Lgs. 42/2004 art. 136",
      presenza: randomPresenza([["assente", 55], ["presente", 25], ["verifica", 20]]),
      descrizione: "Immobili e aree di notevole interesse pubblico dichiarati con decreto",
      fonte: "MiC - Geoportale Vincoli in Rete",
      note: "Se presente → obbligatoria autorizzazione paesaggistica ordinaria (art. 146)",
      criticita: "escludente",
      azioneRichiesta: "Autorizzazione paesaggistica ordinaria + parere vincolante Soprintendenza",
    },
    {
      id: "pa_03", categoria: "Paesaggio",
      sottocategoria: "Piano Paesaggistico Regionale",
      normativa: "D.Lgs. 42/2004 + PPR vigente",
      presenza: randomPresenza([["presente", 45], ["verifica", 35], ["assente", 20]]),
      descrizione: "Aree soggette a disciplina paesaggistica regionale. Verificare NTA del PPR",
      fonte: "Regione - Piano Paesaggistico",
      criticita: "condizionante",
      azioneRichiesta: "Verifica conformità NTA del PPR regionale",
    },
    {
      id: "pa_04", categoria: "Paesaggio",
      sottocategoria: "Galasso - Fascia rispetto corsi d'acqua (150m)",
      normativa: "L. 431/1985 - D.Lgs. 42/2004 art. 142 c.1 lett. c",
      presenza: randomPresenza([["assente", 55], ["presente", 25], ["verifica", 20]]),
      descrizione: "Fascia di 150m dai fiumi, torrenti, corsi d'acqua iscritti negli elenchi acque pubbliche",
      fonte: "PGRA",
      criticita: "condizionante",
      azioneRichiesta: "Autorizzazione paesaggistica + verifica compatibilità idraulica",
    },
    {
      id: "pa_05", categoria: "Paesaggio",
      sottocategoria: "Boschi e foreste (art. 142 c.1 lett. g)",
      normativa: "D.Lgs. 42/2004",
      presenza: randomPresenza([["assente", 60], ["presente", 20], ["verifica", 20]]),
      descrizione: "Territori coperti da foreste e boschi, ancorché percorsi dal fuoco",
      fonte: "Inventario Nazionale Foreste",
      criticita: "escludente",
      azioneRichiesta: "Vietata trasformazione salvo deroga regionale",
    },
    {
      id: "pa_06", categoria: "Paesaggio",
      sottocategoria: "Zone montane oltre 1.200 m s.l.m. (art. 142 c.1 lett. d)",
      normativa: "D.Lgs. 42/2004 art. 142",
      presenza: randomPresenza([["assente", 65], ["presente", 15], ["verifica", 20]]),
      descrizione: "Territori al di sopra dei 1.200 m s.l.m.",
      fonte: "IGM - DTM nazionale",
      criticita: "condizionante",
      azioneRichiesta: "Autorizzazione paesaggistica ordinaria",
    },
    {
      id: "pa_07", categoria: "Paesaggio",
      sottocategoria: "Aree panoramiche e interesse storico-rurale",
      normativa: "D.Lgs. 42/2004 art. 136 e 142",
      presenza: randomPresenza([["verifica", 50], ["assente", 35], ["presente", 15]]),
      descrizione: "Zone di particolare interesse panoramico e paesaggio storico-rurale",
      fonte: "Regione/Geoportale Nazionale",
      criticita: "da_verificare",
      azioneRichiesta: "Verifica NTA specifiche del PPR",
    },
    {
      id: "pa_08", categoria: "Paesaggio",
      sottocategoria: "Aree non idonee regionali (art. 20 D.Lgs 199/2021)",
      normativa: "D.Lgs. 199/2021 art. 20 - Delibere regionali",
      presenza: randomPresenza([["verifica", 55], ["assente", 30], ["presente", 15]]),
      descrizione: "Aree individuate dalle Regioni come non idonee per impianti FV/agrivoltaici",
      fonte: "Regione - SIT/Geoportale",
      note: "Obbligo verifica cartografia regionale aree non idonee",
      criticita: "escludente",
      azioneRichiesta: "Se in area non idonea: impianto vietato salvo deroghe specifiche",
    },
  ];
}

function buildVincoliIdrogeologici(_particelle: Particella[]): VincoloItem[] {
  return [
    {
      id: "id_01", categoria: "Vincolo Idrogeologico",
      sottocategoria: "R.D. 3267/1923 - Vincolo idrogeologico forestale",
      normativa: "R.D. 3267/1923",
      presenza: randomPresenza([["presente", 35], ["assente", 45], ["verifica", 20]]),
      descrizione: "Terreni soggetti a vincolo per scopi idrogeologici",
      fonte: "Regione - Catasto Vincolo Idrogeologico",
      criticita: "condizionante",
      azioneRichiesta: "Autorizzazione ente forestale (Regione/Città Metropolitana)",
    },
    {
      id: "id_02", categoria: "Vincolo Idrogeologico",
      sottocategoria: "PAI - Pericolosità frana P4 (molto elevata)",
      normativa: "D.L. 180/1998 - PAI",
      presenza: randomPresenza([["assente", 70], ["verifica", 15], ["presente", 15]]),
      descrizione: "Pericolosità da frana molto elevata (P4)",
      fonte: "ISPRA - IFFI",
      criticita: "escludente",
      azioneRichiesta: "Impianto non realizzabile in area P4",
    },
    {
      id: "id_02b", categoria: "Vincolo Idrogeologico",
      sottocategoria: "PAI - Pericolosità frana P3 (elevata)",
      normativa: "D.L. 180/1998 - PAI",
      presenza: randomPresenza([["assente", 55], ["verifica", 25], ["presente", 20]]),
      descrizione: "Pericolosità da frana elevata (P3)",
      fonte: "ISPRA - IFFI",
      criticita: "condizionante",
      azioneRichiesta: "Studio geotecnico + parere Autorità di Bacino",
    },
    {
      id: "id_02c", categoria: "Vincolo Idrogeologico",
      sottocategoria: "PAI - Pericolosità frana P2/P1",
      normativa: "D.L. 180/1998 - PAI",
      presenza: randomPresenza([["assente", 45], ["verifica", 35], ["presente", 20]]),
      descrizione: "Pericolosità da frana media (P2) o moderata (P1)",
      fonte: "ISPRA",
      criticita: "da_verificare",
      azioneRichiesta: "Verifica elaborati PAI e studio di compatibilità",
    },
    {
      id: "id_03", categoria: "Vincolo Idrogeologico",
      sottocategoria: "PAI - Pericolosità idraulica P3 (TR 20-50 anni)",
      normativa: "D.L. 180/1998 - Dir. Alluvioni 2007/60/CE",
      presenza: randomPresenza([["assente", 55], ["verifica", 25], ["presente", 20]]),
      descrizione: "Aree inondabili con tempo di ritorno 20-50 anni",
      fonte: "PGRA",
      criticita: "escludente",
      azioneRichiesta: "Impianto non realizzabile in area P3 alluvione",
    },
    {
      id: "id_03b", categoria: "Vincolo Idrogeologico",
      sottocategoria: "PAI - Pericolosità idraulica P2 (TR 100-200 anni)",
      normativa: "Dir. Alluvioni 2007/60/CE",
      presenza: randomPresenza([["assente", 50], ["verifica", 30], ["presente", 20]]),
      descrizione: "Aree inondabili con tempo di ritorno 100-200 anni",
      fonte: "PGRA",
      criticita: "condizionante",
      azioneRichiesta: "Studio idraulico + parere Autorità di Bacino",
    },
    {
      id: "id_03c", categoria: "Vincolo Idrogeologico",
      sottocategoria: "PAI - Pericolosità idraulica P1 (TR 500 anni)",
      normativa: "Dir. Alluvioni 2007/60/CE",
      presenza: randomPresenza([["assente", 45], ["verifica", 35], ["presente", 20]]),
      descrizione: "Aree inondabili con tempo di ritorno 500 anni",
      fonte: "PGRA",
      criticita: "da_verificare",
      azioneRichiesta: "Verifica compatibilità idraulica",
    },
    {
      id: "id_04", categoria: "Vincolo Idrogeologico",
      sottocategoria: "Fascia rispetto pozzi acquedottistici (200m)",
      normativa: "D.Lgs. 152/2006 art. 94",
      presenza: randomPresenza([["assente", 65], ["verifica", 25], ["presente", 10]]),
      descrizione: "Zone di rispetto assoluto (10m) e di rispetto (200m) per captazioni acque potabili",
      fonte: "ATO/Gestori acquedotto",
      criticita: "condizionante",
      azioneRichiesta: "Verifica compatibilità con zona di rispetto",
    },
    {
      id: "id_05", categoria: "Vincolo Idrogeologico",
      sottocategoria: "Stabilità versanti e subsidenza",
      normativa: "PAI - D.Lgs. 152/2006",
      presenza: randomPresenza([["assente", 55], ["verifica", 30], ["presente", 15]]),
      descrizione: "Fenomeni di instabilità di versante, erosione e subsidenza",
      fonte: "ISPRA - ReNDiS",
      criticita: "da_verificare",
      azioneRichiesta: "Studio geotecnico di stabilità",
    },
    {
      id: "id_06", categoria: "Vincolo Idrogeologico",
      sottocategoria: "Consorzio di bonifica e canali irrigui",
      normativa: "R.D. 215/1933",
      presenza: randomPresenza([["verifica", 45], ["assente", 35], ["presente", 20]]),
      descrizione: "Comprensori di bonifica, canali irrigui e opere idrauliche",
      fonte: "Consorzio di Bonifica competente",
      criticita: "da_verificare",
      azioneRichiesta: "Nulla osta Consorzio di Bonifica + verifica interferenze",
    },
  ];
}

function buildRischioIdrico(_particelle: Particella[]): VincoloItem[] {
  return [
    {
      id: "ri_01", categoria: "Rischio Idrico",
      sottocategoria: "Rischio alluvione R4/R3",
      normativa: "PGRA - D.Lgs. 49/2010",
      presenza: randomPresenza([["assente", 50], ["presente", 25], ["verifica", 25]]),
      descrizione: "Rischio alluvionale R4 molto elevato / R3 elevato",
      fonte: "ISPRA - Mappe Pericolosità e Rischio",
      criticita: "escludente",
      azioneRichiesta: "Impianto non realizzabile in aree R4/R3",
    },
    {
      id: "ri_02", categoria: "Rischio Idrico",
      sottocategoria: "Rischio frana R4/R3",
      normativa: "PAI Regionale",
      presenza: randomPresenza([["assente", 55], ["verifica", 25], ["presente", 20]]),
      descrizione: "Rischio da frana R4/R3",
      fonte: "Autorità di Bacino Distrettuale",
      criticita: "escludente",
      azioneRichiesta: "Impianto non realizzabile in aree R4/R3",
    },
    {
      id: "ri_03", categoria: "Rischio Idrico",
      sottocategoria: "PGRA - Misure riduzione rischio alluvioni",
      normativa: "Direttiva 2007/60/CE - D.Lgs. 49/2010",
      presenza: randomPresenza([["verifica", 50], ["presente", 30], ["assente", 20]]),
      descrizione: "Misure del Piano di Gestione Rischio Alluvioni",
      fonte: "Autorità di Bacino",
      criticita: "da_verificare",
      azioneRichiesta: "Verifica conformità misure PGRA",
    },
    {
      id: "ri_04", categoria: "Rischio Idrico",
      sottocategoria: "Fasce rispetto corsi d'acqua",
      normativa: "PAI - D.Lgs. 152/2006",
      presenza: randomPresenza([["assente", 50], ["verifica", 30], ["presente", 20]]),
      descrizione: "Fasce di rispetto del reticolo idrografico principale e minore",
      fonte: "Autorità di Bacino / Regione",
      criticita: "condizionante",
      azioneRichiesta: "Studio compatibilità idraulica + nulla osta AdB",
    },
  ];
}

function buildVincoliAmbientali(_particelle: Particella[]): VincoloItem[] {
  return [
    {
      id: "amb_01", categoria: "Vincoli Ambientali",
      sottocategoria: "Rete Natura 2000 - ZSC/SIC",
      normativa: "Dir. 92/43/CEE Habitat - DPR 357/1997",
      presenza: randomPresenza([["assente", 50], ["presente", 25], ["verifica", 25]]),
      descrizione: "Zone Speciali di Conservazione. Se presente → screening VIncA obbligatorio",
      fonte: "MASE - Rete Natura 2000",
      note: "Per impianti in ZSC: Screening VIncA obbligatorio, eventuale VIncA appropriata",
      criticita: "condizionante",
      azioneRichiesta: "Valutazione di Incidenza (VIncA) obbligatoria ex DPR 357/1997",
    },
    {
      id: "amb_02", categoria: "Vincoli Ambientali",
      sottocategoria: "Zone di Protezione Speciale (ZPS)",
      normativa: "Dir. 79/409/CEE Uccelli - DPR 357/1997",
      presenza: randomPresenza([["assente", 55], ["presente", 20], ["verifica", 25]]),
      descrizione: "Aree ZPS per protezione avifauna selvatica. Richiede VIncA",
      fonte: "MASE - Rete Natura 2000",
      criticita: "condizionante",
      azioneRichiesta: "Valutazione di Incidenza (VIncA) obbligatoria",
    },
    {
      id: "amb_02b", categoria: "Vincoli Ambientali",
      sottocategoria: "Buffer 500 m da confini Natura 2000",
      normativa: "DPR 357/1997 - Linee guida VIncA",
      presenza: randomPresenza([["assente", 45], ["verifica", 40], ["presente", 15]]),
      descrizione: "Fascia di 500m dai confini di siti Natura 2000. Può richiedere screening VIncA",
      fonte: "MASE",
      criticita: "condizionante",
      azioneRichiesta: "Screening VIncA per potenziali effetti indiretti",
    },
    {
      id: "amb_03", categoria: "Vincoli Ambientali",
      sottocategoria: "Parco Nazionale (zona A: riserva integrale)",
      normativa: "L. 394/1991",
      presenza: randomPresenza([["assente", 70], ["presente", 15], ["verifica", 15]]),
      descrizione: "Riserva integrale di Parco Nazionale — vietata qualsiasi alterazione",
      fonte: "MASE - EUAP",
      criticita: "escludente",
      azioneRichiesta: "Vietato in zona A. In zone B/C/D: nulla osta Ente Parco",
    },
    {
      id: "amb_03b", categoria: "Vincoli Ambientali",
      sottocategoria: "Parco Regionale / Riserva Naturale",
      normativa: "L. 394/1991 - Leggi regionali",
      presenza: randomPresenza([["assente", 60], ["presente", 20], ["verifica", 20]]),
      descrizione: "Area protetta regionale con zonizzazione e piano del parco",
      fonte: "MASE - EUAP",
      criticita: "condizionante",
      azioneRichiesta: "Nulla osta Ente gestore area protetta",
    },
    {
      id: "amb_04", categoria: "Vincoli Ambientali",
      sottocategoria: "Zone RAMSAR (zone umide internazionali)",
      normativa: "Convenzione Ramsar 1971 - DPR 448/1976",
      presenza: randomPresenza([["assente", 80], ["verifica", 15], ["presente", 5]]),
      descrizione: "Zone umide di importanza internazionale. Vietata qualsiasi alterazione",
      fonte: "MASE - Siti Ramsar Italia",
      criticita: "escludente",
      azioneRichiesta: "Vincolo assoluto — nessuna alterazione ammessa",
    },
    {
      id: "amb_05", categoria: "Vincoli Ambientali",
      sottocategoria: "VIA obbligatoria (D.Lgs. 152/2006)",
      normativa: "D.Lgs. 152/2006 Titolo III",
      presenza: randomPresenza([["verifica", 60], ["assente", 30], ["presente", 10]]),
      descrizione: "Obbligo VIA per impianti ≥ 10 MW (All. II) o ≥ 1 MW in aree sensibili",
      fonte: "MASE - Registro VIA",
      criticita: "da_verificare",
      azioneRichiesta: "Verifica assoggettabilità VIA in base a potenza e localizzazione",
    },
    {
      id: "amb_06", categoria: "Vincoli Ambientali",
      sottocategoria: "Sito contaminato/bonifica",
      normativa: "D.Lgs. 152/2006 Titolo V",
      presenza: randomPresenza([["assente", 70], ["verifica", 20], ["presente", 10]]),
      descrizione: "Sito soggetto a bonifica — nota: area idonea ex lege per FV",
      fonte: "MASE/Regione - Anagrafe Siti Contaminati",
      criticita: "neutro",
      azioneRichiesta: "Siti contaminati sono aree idonee per FV (D.Lgs. 199/2021)",
    },
  ];
}

function buildServiziReti(_particelle: Particella[]): VincoloItem[] {
  return [
    {
      id: "sr_01", categoria: "Servizi e Reti",
      sottocategoria: "Elettrodotto AT/AAT con fascia DPA",
      normativa: "DPCM 8/7/2003 - L. 36/2001",
      presenza: randomPresenza([["assente", 50], ["verifica", 30], ["presente", 20]]),
      descrizione: "Linee AT/AAT con fasce di rispetto da 10 a 150m",
      fonte: "Terna SpA / Gestore Distribuzione",
      criticita: "da_verificare",
      azioneRichiesta: "Verifica DPA con gestore + nulla osta per costruzioni in fascia",
    },
    {
      id: "sr_02", categoria: "Servizi e Reti",
      sottocategoria: "Metanodotto/Gasdotto (fascia 200m)",
      normativa: "D.Lgs. 93/2003 - DM 17/4/2008",
      presenza: randomPresenza([["assente", 55], ["verifica", 30], ["presente", 15]]),
      descrizione: "Condotte gas con fasce di sicurezza e limitazioni",
      fonte: "Snam Rete Gas",
      criticita: "condizionante",
      azioneRichiesta: "Nulla osta Snam + verifica distanze di sicurezza",
    },
    {
      id: "sr_03", categoria: "Servizi e Reti",
      sottocategoria: "Oleodotto (fascia 200m)",
      normativa: "DM 24/11/1984",
      presenza: randomPresenza([["assente", 75], ["verifica", 20], ["presente", 5]]),
      descrizione: "Condotte idrocarburi liquidi con fasce di rispetto",
      fonte: "Gestore impianto",
      criticita: "condizionante",
      azioneRichiesta: "Nulla osta gestore oleodotto",
    },
    {
      id: "sr_04", categoria: "Servizi e Reti",
      sottocategoria: "Strade statali/provinciali (fascia rispetto)",
      normativa: "D.Lgs. 285/1992 - DPR 495/1992",
      presenza: randomPresenza([["assente", 40], ["presente", 35], ["verifica", 25]]),
      descrizione: "Fasce: 60m autostrade, 40m statali, 30m provinciali",
      fonte: "ANAS / Ente gestore",
      criticita: "da_verificare",
      azioneRichiesta: "Verifica distanze + nulla osta ente gestore stradale",
    },
    {
      id: "sr_05", categoria: "Servizi e Reti",
      sottocategoria: "Ferrovia (fascia 30m - DPR 753/1980)",
      normativa: "DPR 753/1980",
      presenza: randomPresenza([["assente", 60], ["verifica", 25], ["presente", 15]]),
      descrizione: "Fascia rispetto ferroviaria 30m. Richiede nulla osta RFI",
      fonte: "RFI - Rete Ferroviaria Italiana",
      criticita: "condizionante",
      azioneRichiesta: "Nulla osta RFI per costruzioni in fascia di rispetto",
    },
    {
      id: "sr_06", categoria: "Servizi e Reti",
      sottocategoria: "Acquedotto/fognatura (fascia rispetto)",
      normativa: "D.Lgs. 152/2006",
      presenza: randomPresenza([["verifica", 45], ["assente", 35], ["presente", 20]]),
      descrizione: "Infrastrutture idriche con fasce di rispetto e servitù",
      fonte: "Gestore ATO / Comune",
      criticita: "da_verificare",
      azioneRichiesta: "Nulla osta gestore idrico",
    },
    {
      id: "sr_07", categoria: "Servizi e Reti",
      sottocategoria: "Cavidotti telecomunicazioni / fibra ottica",
      normativa: "D.Lgs. 259/2003",
      presenza: randomPresenza([["verifica", 50], ["assente", 30], ["presente", 20]]),
      descrizione: "Reti TLC interrate o aeree con servitù di passaggio",
      fonte: "Operatori TLC / Infratel",
      criticita: "neutro",
      azioneRichiesta: "Verifica servitù e possibilità di spostamento",
    },
    {
      id: "sr_08", categoria: "Servizi e Reti",
      sottocategoria: "Vincolo cimiteriale (fascia 200m)",
      normativa: "R.D. 1265/1934 art. 338 - DPR 285/1990",
      presenza: randomPresenza([["assente", 70], ["presente", 15], ["verifica", 15]]),
      descrizione: "Zona di rispetto cimiteriale 200m",
      fonte: "Comune",
      criticita: "condizionante",
      azioneRichiesta: "Deroga possibile solo con delibera comunale",
    },
  ];
}

function buildAltriVincoli(_particelle: Particella[]): VincoloItem[] {
  return [
    {
      id: "av_01", categoria: "Altri Vincoli",
      sottocategoria: "PRG/POC - Destinazione urbanistica zona E",
      normativa: "L. 1150/1942 - Legislazione regionale",
      presenza: "presente",
      descrizione: "Destinazione d'uso urbanistica vigente. Verificare NTA per divieti FV",
      fonte: "Comune - Ufficio Urbanistica",
      criticita: "da_verificare",
      azioneRichiesta: "Verifica NTA PRG per compatibilità impianti FER",
    },
    {
      id: "av_02", categoria: "Altri Vincoli",
      sottocategoria: "PTCP / PTC - Pianificazione sovracomunale",
      normativa: "D.Lgs. 267/2000",
      presenza: randomPresenza([["verifica", 55], ["presente", 25], ["assente", 20]]),
      descrizione: "Piano Territoriale di Coordinamento Provinciale",
      fonte: "Provincia / Città Metropolitana",
      criticita: "da_verificare",
      azioneRichiesta: "Verifica indirizzi e norme vincolanti PTCP",
    },
    {
      id: "av_03", categoria: "Altri Vincoli",
      sottocategoria: "Linee guida regionali agrivoltaico",
      normativa: "D.Lgs. 199/2021 - Delibere regionali",
      presenza: randomPresenza([["verifica", 65], ["presente", 25], ["assente", 10]]),
      descrizione: "Normativa regionale specifica per agrivoltaici",
      fonte: "Regione",
      criticita: "da_verificare",
      azioneRichiesta: "Verifica requisiti tecnici e obblighi regionali",
    },
    {
      id: "av_04", categoria: "Altri Vincoli",
      sottocategoria: "Demanio / Usi civici",
      normativa: "L. 1766/1927 - D.Lgs. 85/2010",
      presenza: randomPresenza([["assente", 55], ["verifica", 35], ["presente", 10]]),
      descrizione: "Usi civici NON possono essere liquidati per impianti FER — blocco assoluto",
      fonte: "Regione / Commissariato Usi Civici",
      note: "FONDAMENTALE: verificare prima di qualsiasi impegno",
      criticita: "escludente",
      azioneRichiesta: "Se presenti usi civici: impianto non realizzabile",
    },
    {
      id: "av_05", categoria: "Altri Vincoli",
      sottocategoria: "Servitù, enfiteusi, livelli",
      normativa: "Codice Civile",
      presenza: randomPresenza([["assente", 60], ["verifica", 30], ["presente", 10]]),
      descrizione: "Diritti reali che possono limitare l'utilizzo del terreno",
      fonte: "Conservatoria Registri Immobiliari",
      criticita: "da_verificare",
      azioneRichiesta: "Verifica visure ipotecarie e catastali",
    },
    {
      id: "av_06", categoria: "Altri Vincoli",
      sottocategoria: "Concessioni minerarie/idrocarburifere",
      normativa: "R.D. 1443/1927",
      presenza: randomPresenza([["assente", 80], ["verifica", 15], ["presente", 5]]),
      descrizione: "Concessioni che possono gravare sull'area",
      fonte: "MASE - UNMIG",
      criticita: "da_verificare",
      azioneRichiesta: "Verifica presso UNMIG",
    },
  ];
}

function buildVincoliAgricoli(particelle: Particella[]): VincoloItem[] {
  const inPuglia = isPuglia(particelle);
  const vincoli: VincoloItem[] = [
    {
      id: "ag_01", categoria: "Vincoli Agricoli",
      sottocategoria: "Classe capacità d'uso suolo (LCC) - Classi I e II",
      normativa: "D.Lgs. 199/2021 art. 20",
      presenza: randomPresenza([["verifica", 50], ["presente", 25], ["assente", 25]]),
      descrizione: "Suoli LCC I e II — in molte regioni vietato per FV a terra",
      fonte: "AGEA / Regione",
      criticita: "condizionante",
      azioneRichiesta: "Verifica normativa regionale per suoli LCC I-II",
    },
    {
      id: "ag_02", categoria: "Vincoli Agricoli",
      sottocategoria: "SAU - Superficie Agricola Utilizzata",
      normativa: "Reg. UE 1307/2013",
      presenza: "presente",
      descrizione: "Agrivoltaico deve garantire continuità dell'attività agricola",
      fonte: "AGEA - Fascicolo Aziendale",
      criticita: "da_verificare",
      azioneRichiesta: "Verifica classificazione catastale e piano colturale",
    },
    {
      id: "ag_03", categoria: "Vincoli Agricoli",
      sottocategoria: "Vigneti DOC/DOCG",
      normativa: "D.Lgs. 61/2010",
      presenza: randomPresenza([["assente", 60], ["verifica", 25], ["presente", 15]]),
      descrizione: "Vigneti iscritti a DOC/DOCG con vincoli disciplinari",
      fonte: "MIPAAF - Albo vigneti",
      criticita: "condizionante",
      azioneRichiesta: "Verifica disciplinare DOC/DOCG per compatibilità agrivoltaico",
    },
    {
      id: "ag_04", categoria: "Vincoli Agricoli",
      sottocategoria: "Uliveti storici e produzioni DOP/IGP",
      normativa: "L. 168/2017 - Reg. UE 1151/2012",
      presenza: randomPresenza([["assente", 55], ["verifica", 30], ["presente", 15]]),
      descrizione: "Zone DOP/IGP con vincoli paesaggistici e disciplinari",
      fonte: "MIPAAF / Consorzi di tutela",
      criticita: "condizionante",
      azioneRichiesta: "Verifica disciplinare DOP/IGP + valutazione impatto",
    },
    {
      id: "ag_05", categoria: "Vincoli Agricoli",
      sottocategoria: "Paesaggio rurale storico",
      normativa: "DM 17/10/2012",
      presenza: randomPresenza([["assente", 65], ["verifica", 25], ["presente", 10]]),
      descrizione: "Registro Nazionale Paesaggi Rurali di Interesse Storico",
      fonte: "MIPAAF",
      criticita: "condizionante",
      azioneRichiesta: "Valutazione impatto paesaggistico specifico",
    },
  ];
  if (inPuglia) {
    vincoli.push({
      id: "ag_06", categoria: "Vincoli Agricoli",
      sottocategoria: "🌳 Olivi monumentali (L.R. Puglia 14/2007)",
      normativa: "L. 168/2017 - L.R. Puglia 14/2007",
      presenza: "verifica",
      descrizione: "Puglia: verifica obbligatoria olivi monumentali. Vietato sradicare/alterare",
      fonte: "Regione Puglia - Registro ulivi monumentali",
      note: "ATTENZIONE: L'olivo monumentale è inabbattibile",
      criticita: "escludente",
      azioneRichiesta: "Strutture agrivoltaiche devono essere progettate attorno ad essi",
    });
  }
  return vincoli;
}

function buildVincoliMilitariRadar(_particelle: Particella[]): VincoloItem[] {
  return [
    {
      id: "mil_01", categoria: "Militari e Radar",
      sottocategoria: "Aree militari e zone di rispetto",
      normativa: "D.Lgs. 66/2010 - L. 898/1976",
      presenza: randomPresenza([["assente", 65], ["verifica", 25], ["presente", 10]]),
      descrizione: "Zone di servitù militare con limitazioni uso suolo",
      fonte: "Ministero della Difesa",
      criticita: "escludente",
      azioneRichiesta: "Nulla osta Difesa — in zone di servitù: vietato",
    },
    {
      id: "mil_02", categoria: "Militari e Radar",
      sottocategoria: "Zone rispetto aeroportuale (ENAC)",
      normativa: "Cod. Navigazione Aerea - Reg. ENAC",
      presenza: randomPresenza([["assente", 60], ["verifica", 30], ["presente", 10]]),
      descrizione: "Superfici di rispetto aeroportuali",
      fonte: "ENAC - Piano Rischio",
      note: "Nulla osta ENAC per strutture in zona di rispetto",
      criticita: "condizionante",
      azioneRichiesta: "Nulla osta ENAC + verifica altezze limite",
    },
    {
      id: "mil_03", categoria: "Militari e Radar",
      sottocategoria: "Interferenze radar ENAV",
      normativa: "Cod. Navigazione - ENAC/ENAV",
      presenza: randomPresenza([["assente", 70], ["verifica", 25], ["presente", 5]]),
      descrizione: "Zone protezione radar — impianti metalici possono interferire",
      fonte: "ENAV / Aeronautica Militare",
      criticita: "da_verificare",
      azioneRichiesta: "Verifica con ENAV per zone radar entro 10 km",
    },
  ];
}

function buildVincoliForestali(_particelle: Particella[]): VincoloItem[] {
  return [
    {
      id: "for_01", categoria: "Vincoli Forestali",
      sottocategoria: "Bosco (D.Lgs. 34/2018)",
      normativa: "D.Lgs. 34/2018 - TUFF",
      presenza: randomPresenza([["assente", 55], ["verifica", 30], ["presente", 15]]),
      descrizione: "Terreno classificato come bosco. Vietata la trasformazione",
      fonte: "Regione - Inventario Forestale",
      criticita: "escludente",
      azioneRichiesta: "Vietato in area boscata salvo compensazione forestale",
    },
    {
      id: "for_02", categoria: "Vincoli Forestali",
      sottocategoria: "Aree percorse da incendio (vincolo 15 anni)",
      normativa: "L. 353/2000",
      presenza: randomPresenza([["assente", 65], ["verifica", 25], ["presente", 10]]),
      descrizione: "Vincolo 15 anni: vietato cambio destinazione e costruzioni",
      fonte: "Comune - Catasto Incendi",
      criticita: "escludente",
      azioneRichiesta: "Vincolo assoluto per 15 anni dalla data dell'incendio",
    },
    {
      id: "for_03", categoria: "Vincoli Forestali",
      sottocategoria: "Autorizzazione forestale per taglio",
      normativa: "D.Lgs. 34/2018",
      presenza: randomPresenza([["assente", 60], ["verifica", 30], ["presente", 10]]),
      descrizione: "Eventuale vegetazione arborea che richiede autorizzazione",
      fonte: "Regione - Ufficio Foreste",
      criticita: "da_verificare",
      azioneRichiesta: "Autorizzazione taglio piante presso ufficio forestale",
    },
  ];
}

function buildVincoliSismici(_particelle: Particella[]): VincoloItem[] {
  return [
    {
      id: "sis_01", categoria: "Vincoli Sismici",
      sottocategoria: "Classificazione sismica Comune (Zone 1-4)",
      normativa: "OPCM 3274/2003 - DM 17/01/2018 NTC",
      presenza: "presente",
      descrizione: "Fondazioni e strutture devono rispettare NTC per la zona sismica",
      fonte: "Protezione Civile",
      criticita: "da_verificare",
      azioneRichiesta: "Progettazione strutturale conforme NTC 2018 per zona sismica",
    },
    {
      id: "sis_02", categoria: "Vincoli Sismici",
      sottocategoria: "Microzonazione sismica",
      normativa: "OPCM 3907/2010",
      presenza: randomPresenza([["non_rilevabile", 50], ["verifica", 35], ["assente", 15]]),
      descrizione: "Studi microzonazione che individuano zone a comportamento omogeneo",
      fonte: "Regione / MS Italia",
      criticita: "da_verificare",
      azioneRichiesta: "Verifica studi MS per eventuali amplificazioni locali",
    },
  ];
}

function buildVincoliCatastali(_particelle: Particella[]): VincoloItem[] {
  return [
    {
      id: "cat_01", categoria: "Vincoli Catastali",
      sottocategoria: "Usi civici e diritti collettivi",
      normativa: "L. 1766/1927 - L. 168/2017",
      presenza: randomPresenza([["assente", 55], ["verifica", 35], ["presente", 10]]),
      descrizione: "Usi civici — blocco assoluto per impianti FER",
      fonte: "Regione / Commissariato Usi Civici",
      note: "NON possono essere liquidati per FER",
      criticita: "escludente",
      azioneRichiesta: "Verifica presso uffici regionali PRIMA di qualsiasi impegno",
    },
    {
      id: "cat_02", categoria: "Vincoli Catastali",
      sottocategoria: "Servitù prediali",
      normativa: "Cod. Civ. artt. 1027-1099",
      presenza: randomPresenza([["assente", 50], ["verifica", 35], ["presente", 15]]),
      descrizione: "Servitù che possono limitare posizionamento strutture",
      fonte: "Conservatoria Registri Immobiliari",
      criticita: "da_verificare",
      azioneRichiesta: "Visure ipotecarie e verifica servitù attive",
    },
    {
      id: "cat_03", categoria: "Vincoli Catastali",
      sottocategoria: "Enfiteusi, livelli e usucapioni",
      normativa: "Cod. Civ. artt. 957-977",
      presenza: randomPresenza([["assente", 70], ["verifica", 25], ["presente", 5]]),
      descrizione: "Diritti reali di godimento minori",
      fonte: "Conservatoria / Catasto",
      criticita: "da_verificare",
      azioneRichiesta: "Verifica titolarità piena del fondo",
    },
  ];
}

function buildCompatibilitaConnessione(_particelle: Particella[]): VincoloItem[] {
  return [
    {
      id: "conn_01", categoria: "Compatibilità Connessione",
      sottocategoria: "Distanza cabina primaria AT/MT",
      normativa: "D.Lgs. 199/2021",
      presenza: randomPresenza([["verifica", 55], ["assente", 25], ["presente", 20]]),
      descrizione: "Ottimale < 5 km, critica > 15 km",
      fonte: "Terna / Distributore",
      criticita: "neutro",
      azioneRichiesta: "Richiedere preventivo connessione",
    },
    {
      id: "conn_02", categoria: "Compatibilità Connessione",
      sottocategoria: "Disponibilità STMG",
      normativa: "D.Lgs. 199/2021 - ARERA 99/08",
      presenza: randomPresenza([["verifica", 60], ["assente", 25], ["presente", 15]]),
      descrizione: "Capacità residua di connessione in rete",
      fonte: "Portale Gaudi (ARERA)",
      note: "Congestione rete può rendere connessione non sostenibile",
      criticita: "neutro",
      azioneRichiesta: "Richiesta STMG al distributore/Terna",
    },
    {
      id: "conn_03", categoria: "Compatibilità Connessione",
      sottocategoria: "Presenza linea AT nelle vicinanze",
      normativa: "Regole CEI - Standard Terna",
      presenza: randomPresenza([["verifica", 50], ["assente", 30], ["presente", 20]]),
      descrizione: "Valutazione connessione in AT senza nuova cabina",
      fonte: "Terna",
      criticita: "neutro",
      azioneRichiesta: "Verifica cartografia Terna",
    },
  ];
}

function buildAreeIdonee(_particelle: Particella[]): VincoloItem[] {
  return [
    {
      id: "ai_01", categoria: "Aree Idonee",
      sottocategoria: "Area idonea ex D.Lgs. 199/2021 art. 20",
      normativa: "D.Lgs. 199/2021 art. 20 - DM Aree Idonee",
      presenza: randomPresenza([["verifica", 60], ["assente", 25], ["presente", 15]]),
      descrizione: "In aree idonee: iter semplificato PAS",
      fonte: "MASE / Regioni",
      note: "Le aree idonee godono di iter autorizzativo semplificato",
      criticita: "neutro",
      azioneRichiesta: "Verifica cartografia regionale aree idonee",
    },
    {
      id: "ai_02", categoria: "Aree Idonee",
      sottocategoria: "Aree agricole pregio da escludere",
      normativa: "D.Lgs. 199/2021",
      presenza: randomPresenza([["verifica", 50], ["presente", 25], ["assente", 25]]),
      descrizione: "LCC I-II, vigneti DOC, oliveti storici — escluse da aree idonee",
      fonte: "MIPAAF / Regioni",
      note: "Agrivoltaico con continuità agricola può essere ammesso anche su pregio",
      criticita: "da_verificare",
      azioneRichiesta: "Verifica classificazione e regime applicabile",
    },
    {
      id: "ai_03", categoria: "Aree Idonee",
      sottocategoria: "Fasce costiere e UNESCO (non idonee)",
      normativa: "D.Lgs. 199/2021 - D.Lgs. 42/2004",
      presenza: randomPresenza([["assente", 65], ["verifica", 25], ["presente", 10]]),
      descrizione: "Sempre escluse dalle aree idonee FER",
      fonte: "MASE / Regioni",
      criticita: "escludente",
      azioneRichiesta: "Se in fascia costiera/UNESCO: area non idonea",
    },
    {
      id: "ai_04", categoria: "Aree Idonee",
      sottocategoria: "Iter autorizzativo (PAS/AU/VIA/PAUR)",
      normativa: "D.Lgs. 199/2021 - D.Lgs. 152/2006",
      presenza: "verifica",
      descrizione: "Determinazione iter in base a potenza, area e vincoli",
      fonte: "Regione / MASE",
      note: "Agrivoltaico avanzato DM 22/2022: iter semplificato se conforme",
      criticita: "da_verificare",
      azioneRichiesta: "Determinare iter applicabile con analisi vincoli",
    },
  ];
}

function buildNormativaAgrivoltaico(_particelle: Particella[]): VincoloItem[] {
  return [
    {
      id: "av_n01", categoria: "Normativa Agrivoltaico",
      sottocategoria: "Continuità attività agricola certificata",
      normativa: "DM 22/12/2022",
      presenza: "verifica",
      descrizione: "Attività agricola mantenuta per tutta la vita dell'impianto",
      fonte: "GSE",
      note: "Senza continuità: FV a terra ordinario, non agrivoltaico",
      criticita: "da_verificare",
      azioneRichiesta: "Piano colturale + accordo con conduttore agricolo",
    },
    {
      id: "av_n02", categoria: "Normativa Agrivoltaico",
      sottocategoria: "Altezza minima strutture e distanza file",
      normativa: "DM 22/12/2022",
      presenza: "verifica",
      descrizione: "Altezza minima ≥ 2,1m per meccanizzazione",
      fonte: "GSE",
      criticita: "da_verificare",
      azioneRichiesta: "Progetto strutturale conforme DM 22/2022",
    },
    {
      id: "av_n03", categoria: "Normativa Agrivoltaico",
      sottocategoria: "LAOR - SAU non coperta (≥ 70%)",
      normativa: "DM 22/12/2022",
      presenza: "verifica",
      descrizione: "Superficie non coperta dai moduli almeno 70%",
      fonte: "GSE",
      criticita: "da_verificare",
      azioneRichiesta: "Verifica layout impianto per LAOR ≥ 70%",
    },
    {
      id: "av_n04", categoria: "Normativa Agrivoltaico",
      sottocategoria: "PMRT - Piano Monitoraggio",
      normativa: "DM 22/12/2022",
      presenza: "verifica",
      descrizione: "Piano Monitoraggio Reporting Tecnico obbligatorio",
      fonte: "GSE - PMRT",
      criticita: "da_verificare",
      azioneRichiesta: "Predisporre PMRT conforme linee guida GSE",
    },
    {
      id: "av_n05", categoria: "Normativa Agrivoltaico",
      sottocategoria: "Colture compatibili",
      normativa: "DM 22/12/2022",
      presenza: "verifica",
      descrizione: "Compatibilità agro-energetica per la produzione agricola prevista",
      fonte: "GSE",
      criticita: "da_verificare",
      azioneRichiesta: "Verifica compatibilità colture con layout impianto",
    },
  ];
}

// ══════════════════════════════════════════════════════════════
// STEP AUTORIZZATIVI — generati automaticamente dai vincoli rilevati
// ══════════════════════════════════════════════════════════════

function generateStepAutorizzativi(allVincoli: VincoloItem[]): StepAutorizzativo[] {
  const steps: StepAutorizzativo[] = [];
  const added = new Set<string>();

  const addStep = (vincolo: VincoloItem, id: string, titolo: string, descrizione: string, normativa: string, ente: string, obbligatorio: boolean) => {
    if (added.has(id)) return;
    added.add(id);
    steps.push({ id, titolo, descrizione, normativa, ente, obbligatorio, vincoloId: vincolo.id });
  };

  for (const v of allVincoli) {
    if (v.presenza !== "presente" && v.presenza !== "verifica") continue;

    // Natura 2000 → VIncA
    if (["amb_01", "amb_02", "amb_02b"].includes(v.id) && v.presenza === "presente") {
      addStep(v, "step_vinca", "Valutazione di Incidenza (VIncA)",
        "Screening o valutazione appropriata per effetti su siti Natura 2000",
        "DPR 357/1997 art. 5", "Regione / Ente gestore sito", true);
    }

    // Art. 142 → Autorizzazione paesaggistica
    if (["pa_01", "pa_04", "pa_06"].includes(v.id) && v.presenza === "presente") {
      addStep(v, "step_paesaggistica", "Autorizzazione paesaggistica ordinaria",
        "Autorizzazione ex art. 146 D.Lgs. 42/2004 con parere Soprintendenza",
        "D.Lgs. 42/2004 art. 146", "Regione / Soprintendenza", true);
    }

    // Art. 136 → Autorizzazione paesaggistica + parere vincolante
    if (v.id === "pa_02" && v.presenza === "presente") {
      addStep(v, "step_paesaggistica_136", "Autorizzazione paesaggistica (art. 136)",
        "Autorizzazione con parere vincolante della Soprintendenza ABAP",
        "D.Lgs. 42/2004 artt. 136-146", "Soprintendenza ABAP", true);
    }

    // Vincolo idrogeologico
    if (v.id === "id_01" && v.presenza === "presente") {
      addStep(v, "step_idrogeologico", "Autorizzazione vincolo idrogeologico",
        "Nulla osta ente forestale per trasformazione terreni vincolati",
        "R.D. 3267/1923", "Regione / Città Metropolitana", true);
    }

    // PAI frana P3 → studio geotecnico
    if (v.id === "id_02b" && v.presenza === "presente") {
      addStep(v, "step_geotecnico", "Studio geotecnico + parere AdB",
        "Studio di compatibilità geologica e geotecnica con parere Autorità di Bacino",
        "D.L. 180/1998 - PAI", "Autorità di Bacino Distrettuale", true);
    }

    // Alluvione P2 → studio idraulico
    if (v.id === "id_03b" && v.presenza === "presente") {
      addStep(v, "step_idraulico", "Studio di compatibilità idraulica",
        "Studio idraulico per verifica non aggravamento rischio alluvionale",
        "Dir. 2007/60/CE - D.Lgs. 49/2010", "Autorità di Bacino Distrettuale", true);
    }

    // VIA
    if (v.id === "amb_05") {
      addStep(v, "step_via", "Verifica assoggettabilità VIA",
        "Determinare se il progetto è soggetto a VIA o verifica di assoggettabilità",
        "D.Lgs. 152/2006 Titolo III", "MASE / Regione", true);
    }

    // Aeroportuale
    if (v.id === "mil_02" && v.presenza === "presente") {
      addStep(v, "step_enac", "Nulla osta ENAC",
        "Verifica ostacoli e pericoli alla navigazione aerea",
        "Cod. Navigazione Aerea", "ENAC", true);
    }

    // Zona urbanistica
    if (v.id === "av_01") {
      addStep(v, "step_urbanistica", "Verifica conformità urbanistica",
        "Verifica compatibilità con NTA del PRG/PUC vigente",
        "L. 1150/1942 - DPR 380/2001", "Comune", true);
    }

    // Ferrovia
    if (v.id === "sr_05" && v.presenza === "presente") {
      addStep(v, "step_rfi", "Nulla osta RFI",
        "Autorizzazione per costruzioni in fascia di rispetto ferroviaria",
        "DPR 753/1980", "RFI", true);
    }

    // Gasdotto
    if (v.id === "sr_02" && v.presenza === "presente") {
      addStep(v, "step_snam", "Nulla osta Snam",
        "Verifica distanze di sicurezza da condotte gas",
        "DM 17/4/2008", "Snam Rete Gas", true);
    }

    // Consorzio di bonifica
    if (v.id === "id_06" && (v.presenza === "presente" || v.presenza === "verifica")) {
      addStep(v, "step_bonifica", "Nulla osta Consorzio di Bonifica",
        "Verifica interferenze con reticolo idrografico e opere di bonifica",
        "R.D. 215/1933", "Consorzio di Bonifica competente", false);
    }
  }

  // Always add: Autorizzazione Unica / PAS
  addStep(
    { id: "system", categoria: "", sottocategoria: "", normativa: "", presenza: "verifica", descrizione: "" },
    "step_au_pas", "Autorizzazione Unica o PAS",
    "Determinare l'iter autorizzativo: PAS (<1MW aree idonee), AU, o PAUR",
    "D.Lgs. 387/2003 - D.Lgs. 199/2021", "Regione / Comune", true
  );

  return steps;
}

// ══════════════════════════════════════════════════════════════
// CLASSIFICAZIONE IDONEITÀ
// ══════════════════════════════════════════════════════════════

function computeClassificazione(allVincoli: VincoloItem[]): ClassificazioneIdoneita {
  const hasEscludente = allVincoli.some(v => v.presenza === "presente" && v.criticita === "escludente");
  if (hasEscludente) return "non_idoneo";

  const hasCondizionante = allVincoli.some(v => v.presenza === "presente" && v.criticita === "condizionante");
  if (hasCondizionante) return "condizionato";

  return "potenzialmente_idoneo";
}

function computeRischioComplessivo(allVincoli: VincoloItem[]): AnalisiVincolistica["rischioComplessivo"] {
  const presenti = allVincoli.filter(v => v.presenza === "presente").length;
  const verifica = allVincoli.filter(v => v.presenza === "verifica").length;
  const escludenti = allVincoli.filter(v => v.presenza === "presente" && v.criticita === "escludente").length;

  if (escludenti >= 2) return "molto_alto";
  if (escludenti >= 1 || presenti >= 8) return "alto";
  if (presenti >= 4 || verifica >= 10) return "medio";
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

  const allVincoli = [
    ...partial.vincoliCulturali, ...partial.vincoliPaesaggistici,
    ...partial.vincoliIdrogeologici, ...partial.vincoliAmbientali,
    ...partial.rischioIdrico, ...partial.serviziReti, ...partial.altriVincoli,
    ...partial.vincoliAgricoli, ...partial.vincoliMilitariRadar,
    ...partial.vincoliForestali, ...partial.vincoliSismici,
    ...partial.vincoliCatastali, ...partial.compatibilitaConnessione,
    ...partial.areeIdonee, ...partial.normativaAgrivoltaico,
  ];

  const rischioComplessivo = computeRischioComplessivo(allVincoli);
  const classificazioneIdoneita = computeClassificazione(allVincoli);
  const stepAutorizzativi = generateStepAutorizzativi(allVincoli);

  // AUL / AUN
  const areaUtileLordaHa = particelle.reduce((sum, p) => sum + (p.superficieMq ?? 0), 0) / 10_000;
  
  const vincoliNegativi = allVincoli.filter(v => 
    v.categoria !== "Aree Idonee" && v.categoria !== "Compatibilità Connessione" && v.categoria !== "Normativa Agrivoltaico"
  );
  const areeIdoneeFavorevoli = partial.areeIdonee.filter(v => 
    v.presenza === "presente" && !v.sottocategoria.toLowerCase().includes("esclud") && !v.sottocategoria.toLowerCase().includes("non idon")
  ).length;
  
  const escludentiPresenti = vincoliNegativi.filter(v => v.presenza === "presente" && v.criticita === "escludente").length;
  const condizionantiPresenti = vincoliNegativi.filter(v => v.presenza === "presente" && v.criticita === "condizionante").length;
  const verificare = vincoliNegativi.filter(v => v.presenza === "verifica").length;
  
  // Escludenti riducono 15%, condizionanti 6%, da verificare 2%, idonee +5%
  const riduzioneBase = escludentiPresenti * 0.15 + condizionantiPresenti * 0.06 + verificare * 0.015;
  const bonusIdonee = areeIdoneeFavorevoli * 0.05;
  const riduzionePerc = Math.max(0, Math.min(0.95, riduzioneBase - bonusIdonee));
  const areaUtileNettaHa = Math.max(0, areaUtileLordaHa * (1 - riduzionePerc));

  return {
    ...partial,
    rischioComplessivo,
    classificazioneIdoneita,
    stepAutorizzativi,
    areaUtileLordaHa: Math.round(areaUtileLordaHa * 1000) / 1000,
    areaUtileNettaHa: Math.round(areaUtileNettaHa * 1000) / 1000,
  };
}
