import { AnalisiVincolistica, Particella, VincoloItem, VincoloPresenza } from "@/types/vincoli";

// Simulated delay for realistic loading feel
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

function buildVincoliCulturali(particelle: Particella[]): VincoloItem[] {
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
  ];
}

function buildVincoliPaesaggistici(particelle: Particella[]): VincoloItem[] {
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
      sottocategoria: "Piano Paesaggistico Regionale",
      normativa: "D.Lgs. 42/2004 + Piano Paesaggistico Regionale",
      presenza: randomPresenza([["presente", 45], ["verifica", 35], ["assente", 20]]),
      descrizione: "Aree e beni di notevole interesse pubblico soggetti a disciplina paesaggistica regionale",
      fonte: "Regione - Piano Paesaggistico",
    },
    {
      id: "pa_03",
      categoria: "Paesaggio",
      sottocategoria: "Galasso - Fascia di rispetto corsi d'acqua (150m)",
      normativa: "L. 431/1985 - D.Lgs. 42/2004 art. 142 c.1 lett. c",
      presenza: randomPresenza([["assente", 55], ["presente", 25], ["verifica", 20]]),
      descrizione: "Fascia di rispetto di 150m dai fiumi, torrenti, corsi d'acqua iscritti negli elenchi delle acque pubbliche",
      fonte: "PGRA - Piano Gestione Rischio Alluvioni",
    },
    {
      id: "pa_04",
      categoria: "Paesaggio",
      sottocategoria: "Boschi e foreste (art. 142 c.1 lett. g)",
      normativa: "D.Lgs. 42/2004",
      presenza: randomPresenza([["assente", 60], ["presente", 20], ["verifica", 20]]),
      descrizione: "Territori coperti da foreste e da boschi, ancorché percorsi o danneggiati dal fuoco",
      fonte: "Inventario Nazionale delle Foreste e dei Serbatoi Forestali di Carbonio",
    },
  ];
}

function buildVincoliIdrogeologici(particelle: Particella[]): VincoloItem[] {
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
  ];
}

function buildRischioIdrico(particelle: Particella[]): VincoloItem[] {
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
      sottocategoria: "Subsidenza e instabilità dei versanti",
      normativa: "PAI - D.Lgs. 152/2006",
      presenza: randomPresenza([["assente", 55], ["verifica", 30], ["presente", 15]]),
      descrizione: "Fenomeni di subsidenza, erosione costiera o instabilità di versante che possono interessare l'area",
      fonte: "ISPRA - ReNDiS",
    },
  ];
}

function buildVincoliAmbientali(particelle: Particella[]): VincoloItem[] {
  return [
    {
      id: "amb_01",
      categoria: "Vincoli Ambientali",
      sottocategoria: "Siti Rete Natura 2000 - ZSC/SIC",
      normativa: "Dir. 92/43/CEE Habitat - D.P.R. 357/1997",
      presenza: randomPresenza([["assente", 50], ["presente", 25], ["verifica", 25]]),
      descrizione: "Zone Speciali di Conservazione - Siti di Importanza Comunitaria per la tutela di habitat e specie",
      fonte: "MASE - Rete Natura 2000",
    },
    {
      id: "amb_02",
      categoria: "Vincoli Ambientali",
      sottocategoria: "Zone di Protezione Speciale (ZPS)",
      normativa: "Dir. 79/409/CEE Uccelli - D.P.R. 357/1997",
      presenza: randomPresenza([["assente", 55], ["presente", 20], ["verifica", 25]]),
      descrizione: "Aree classificate ZPS per la protezione delle specie di uccelli selvatici",
      fonte: "MASE - Rete Natura 2000",
    },
    {
      id: "amb_03",
      categoria: "Vincoli Ambientali",
      sottocategoria: "Parco Nazionale / Parco Regionale",
      normativa: "L. 394/1991 - Legge Quadro Aree Protette",
      presenza: randomPresenza([["assente", 60], ["presente", 20], ["verifica", 20]]),
      descrizione: "Area ricadente all'interno di un parco nazionale o regionale con relativa zonizzazione",
      fonte: "MASE - Elenco Ufficiale Aree Protette",
    },
    {
      id: "amb_04",
      categoria: "Vincoli Ambientali",
      sottocategoria: "VIA/VAS obbligatoria",
      normativa: "D.Lgs. 152/2006 Titolo III - D.Lgs. 104/2017",
      presenza: randomPresenza([["verifica", 60], ["assente", 30], ["presente", 10]]),
      descrizione: "Obbligo di Valutazione di Impatto Ambientale per interventi nelle aree soggette a verifica",
      fonte: "MASE - Registro VIA",
    },
    {
      id: "amb_05",
      categoria: "Vincoli Ambientali",
      sottocategoria: "Sito Contaminato/Bonifica (art. 242 D.Lgs 152/2006)",
      normativa: "D.Lgs. 152/2006 Titolo V Parte IV",
      presenza: randomPresenza([["assente", 70], ["verifica", 20], ["presente", 10]]),
      descrizione: "Sito soggetto a bonifica o messa in sicurezza per contaminazione del suolo/sottosuolo",
      fonte: "MASE/Regione - Anagrafe Siti Contaminati",
    },
  ];
}

function buildServiziReti(particelle: Particella[]): VincoloItem[] {
  return [
    {
      id: "sr_01",
      categoria: "Servizi e Reti",
      sottocategoria: "Elettrodotto AT/AAT con fascia di rispetto",
      normativa: "DPCM 8/7/2003 - L. 36/2001 Legge Quadro Elettromagnetismo",
      presenza: randomPresenza([["assente", 50], ["verifica", 30], ["presente", 20]]),
      descrizione: "Linee elettriche ad alta e altissima tensione con relative fasce di rispetto da 10 a 100m. DPA da verificare",
      fonte: "Terna SpA / Gestore Distribuzione Locale",
      note: "Richiedere estratto cartografico al gestore per l'esatta individuazione",
    },
    {
      id: "sr_02",
      categoria: "Servizi e Reti",
      sottocategoria: "Metanodotto ad alta pressione (fascia 200m)",
      normativa: "D.Lgs. 1/8/2003 n.93 - D.M. 17/4/2008",
      presenza: randomPresenza([["assente", 55], ["verifica", 30], ["presente", 15]]),
      descrizione: "Condotte di trasporto gas con relative fasce di sicurezza e limitazioni edificatorie",
      fonte: "Snam Rete Gas / Gestore locale",
      note: "Verificare tipologia di gasdotto e pressione massima esercita (MOP)",
    },
    {
      id: "sr_03",
      categoria: "Servizi e Reti",
      sottocategoria: "Acquedotto e fognatura (fascia di rispetto)",
      normativa: "D.Lgs. 152/2006 - Regolamento locale",
      presenza: randomPresenza([["verifica", 45], ["assente", 35], ["presente", 20]]),
      descrizione: "Infrastrutture idriche con fasce di rispetto e servitù. Limitazioni per costruzioni e scavi",
      fonte: "Gestore ATO / Comune",
    },
    {
      id: "sr_04",
      categoria: "Servizi e Reti",
      sottocategoria: "Cavidotti telecomunicazioni / fibra ottica",
      normativa: "D.Lgs. 259/2003 - Codice delle Comunicazioni Elettroniche",
      presenza: randomPresenza([["verifica", 50], ["assente", 30], ["presente", 20]]),
      descrizione: "Reti di telecomunicazione interrate o aeree. Servitù di passaggio e limitazioni scavi",
      fonte: "Operatori TLC / Infratel",
    },
    {
      id: "sr_05",
      categoria: "Servizi e Reti",
      sottocategoria: "Oleodotto (fascia di rispetto)",
      normativa: "D.M. 24/11/1984",
      presenza: randomPresenza([["assente", 75], ["verifica", 20], ["presente", 5]]),
      descrizione: "Condotte per il trasporto di idrocarburi liquidi con relative fasce di rispetto",
      fonte: "Gestore impianto",
    },
    {
      id: "sr_06",
      categoria: "Servizi e Reti",
      sottocategoria: "Strade e ferrovie (fasce di rispetto)",
      normativa: "D.Lgs. 285/1992 - D.P.R. 495/1992 - D.Lgs. 285/2005",
      presenza: randomPresenza([["assente", 40], ["presente", 35], ["verifica", 25]]),
      descrizione: "Fasce di rispetto stradali e ferroviarie con divieti di costruzione e limitazioni d'uso",
      fonte: "ANAS / RFI / Ente gestore",
    },
  ];
}

function buildAltriVincoli(particelle: Particella[]): VincoloItem[] {
  return [
    {
      id: "av_01",
      categoria: "Altri Vincoli",
      sottocategoria: "Piano Regolatore Generale / PUC",
      normativa: "L. 1150/1942 - Legislazione regionale urbanistica",
      presenza: "presente",
      descrizione: "Destinazione d'uso urbanistica vigente. Sempre da verificare con lo strumento urbanistico comunale",
      fonte: "Comune - Ufficio Urbanistica",
    },
    {
      id: "av_02",
      categoria: "Altri Vincoli",
      sottocategoria: "Piani di Lottizzazione e Comparti",
      normativa: "L. 1150/1942 art. 28",
      presenza: randomPresenza([["assente", 65], ["verifica", 25], ["presente", 10]]),
      descrizione: "Piani attuativi vigenti che possono condizionare l'utilizzo del terreno",
      fonte: "Comune",
    },
    {
      id: "av_03",
      categoria: "Altri Vincoli",
      sottocategoria: "Pozzi petroliferi e minerari",
      normativa: "R.D. 1443/1927 - D.Lgs. 625/1996",
      presenza: randomPresenza([["assente", 80], ["verifica", 15], ["presente", 5]]),
      descrizione: "Presenza di concessioni minerarie o idrocarburifere che possono gravare sull'area",
      fonte: "MASE - Ufficio Nazionale Minerario per gli Idrocarburi",
    },
    {
      id: "av_04",
      categoria: "Altri Vincoli",
      sottocategoria: "Vincoli cimiteriali (fascia 200m)",
      normativa: "T.U. Leggi Sanitarie R.D. 1265/1934 art. 338 - D.P.R. 285/1990",
      presenza: randomPresenza([["assente", 70], ["presente", 15], ["verifica", 15]]),
      descrizione: "Zona di rispetto cimiteriale di 200m entro cui è vietata la costruzione di nuovi edifici",
      fonte: "Comune",
    },
    {
      id: "av_05",
      categoria: "Altri Vincoli",
      sottocategoria: "Demanio e proprietà pubblica",
      normativa: "Cod. Civ. art. 822-830 - D.Lgs. 85/2010",
      presenza: randomPresenza([["assente", 60], ["verifica", 30], ["presente", 10]]),
      descrizione: "Interferenza con aree demaniali, uso civico o proprietà collettiva che ne limita la disponibilità",
      fonte: "Agenzie Demanio / Regione",
    },
  ];
}

function computeRischioComplessivo(analisi: Omit<AnalisiVincolistica, "rischioComplessivo">): AnalisiVincolistica["rischioComplessivo"] {
  const allVincoli = [
    ...analisi.vincoliCulturali,
    ...analisi.vincoliPaesaggistici,
    ...analisi.vincoliIdrogeologici,
    ...analisi.vincoliAmbientali,
    ...analisi.rischioIdrico,
    ...analisi.serviziReti,
    ...analisi.altriVincoli,
  ];
  const presenti = allVincoli.filter(v => v.presenza === "presente").length;
  const verifica = allVincoli.filter(v => v.presenza === "verifica").length;

  if (presenti >= 8) return "molto_alto";
  if (presenti >= 5) return "alto";
  if (presenti >= 3 || verifica >= 6) return "medio";
  if (presenti >= 1 || verifica >= 3) return "basso";
  return "nessuno";
}

export async function runAnalisiVincolistica(particelle: Particella[]): Promise<AnalisiVincolistica> {
  await delay(2200);

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
  };

  return {
    ...partial,
    rischioComplessivo: computeRischioComplessivo(partial),
  };
}
