import { AnalisiVincolistica, VincoloItem } from "@/types/vincoli";

/** Get all vincoli from an analisi as a flat array */
export function getAllVincoli(analisi: AnalisiVincolistica): VincoloItem[] {
  return [
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
}

/** Get only present/verifica vincoli */
export function getVincoliPresenti(analisi: AnalisiVincolistica): VincoloItem[] {
  return getAllVincoli(analisi).filter(v => v.presenza === "presente" || v.presenza === "verifica");
}
