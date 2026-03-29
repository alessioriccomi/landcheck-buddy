import jsPDF from "jspdf";
import { Particella, AnalisiVincolistica, CRITICITA_CONFIG } from "@/types/vincoli";

export function exportCDUPDF(particella: Particella, analisi: AnalisiVincolistica | null) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("CDU SINTETICO", w / 2, y, { align: "center" });
  y += 8;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);
  doc.text("Generato da GeoVincoli — Analisi Vincolistica Terreni", w / 2, y, { align: "center" });
  doc.setTextColor(0, 0, 0);
  y += 10;

  // Dati catastali
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("DATI CATASTALI", 15, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const rows = [
    ["Comune", particella.comune],
    ["Foglio", particella.foglio],
    ["Particella", particella.particella],
    ["Sezione", particella.sezione || "—"],
    ["Superficie", particella.superficieMq ? `${particella.superficieMq.toLocaleString("it-IT")} m²` : "N/D"],
    ["Ettari", particella.superficieMq ? `${(particella.superficieMq / 10000).toFixed(4)} ha` : "N/D"],
  ];

  for (const [label, value] of rows) {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, 15, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, 55, y);
    y += 5;
  }
  y += 5;

  // Zona urbanistica
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("ZONA URBANISTICA", 15, y);
  y += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Zona E (agricola) — da verificare con PRG/PUC comunale", 15, y);
  y += 10;

  // Vincoli rilevati
  const allVincoli = analisi ? [
    ...analisi.vincoliCulturali, ...analisi.vincoliPaesaggistici, ...analisi.vincoliIdrogeologici,
    ...analisi.vincoliAmbientali, ...analisi.rischioIdrico, ...analisi.serviziReti,
    ...analisi.altriVincoli, ...analisi.vincoliAgricoli, ...analisi.vincoliMilitariRadar,
    ...analisi.vincoliForestali, ...analisi.vincoliSismici, ...analisi.vincoliCatastali,
    ...analisi.compatibilitaConnessione, ...analisi.areeIdonee, ...analisi.normativaAgrivoltaico,
  ] : [];
  const vincoli = allVincoli.filter(v => v.presenza === "presente" || v.presenza === "verifica");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`VINCOLI RILEVATI (${vincoli.length})`, 15, y);
  y += 6;

  if (vincoli.length === 0) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text("Nessun vincolo rilevato", 15, y);
    y += 6;
  } else {
    doc.setFontSize(8);
    for (const v of vincoli) {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      const cfg = v.criticita ? CRITICITA_CONFIG[v.criticita] : null;
      const prefix = cfg?.label ?? "—";
      doc.setFont("helvetica", "bold");
      doc.text(`[${prefix}]`, 15, y);
      doc.setFont("helvetica", "normal");
      const nameLines = doc.splitTextToSize(v.nome, 140);
      doc.text(nameLines, 40, y);
      y += nameLines.length * 4 + 2;
      if (v.fonte) {
        doc.setTextColor(120, 120, 120);
        doc.text(v.fonte, 40, y);
        doc.setTextColor(0, 0, 0);
        y += 4;
      }
    }
  }
  y += 5;

  // Classificazione
  const classificazione = analisi?.classificazioneIdoneita ?? "potenzialmente_idoneo";
  const classLabel = classificazione === "non_idoneo"
    ? "NON IDONEO"
    : classificazione === "condizionato"
    ? "CONDIZIONATO"
    : "POTENZIALMENTE IDONEO";

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("CLASSIFICAZIONE IDONEITÀ FV/AGRIVOLTAICO", 15, y);
  y += 6;
  doc.setFontSize(12);
  if (classificazione === "non_idoneo") doc.setTextColor(220, 38, 38);
  else if (classificazione === "condizionato") doc.setTextColor(217, 119, 6);
  else doc.setTextColor(22, 163, 74);
  doc.text(classLabel, 15, y);
  doc.setTextColor(0, 0, 0);
  y += 12;

  // Disclaimer
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(120, 120, 120);
  const disclaimer = "Il presente CDU sintetico è generato automaticamente da WMS pubblici e NON sostituisce il Certificato di Destinazione Urbanistica rilasciato dal Comune ai sensi dell'art. 30 DPR 380/2001. Verificare sempre con l'Ufficio Tecnico Comunale.";
  const discLines = doc.splitTextToSize(disclaimer, w - 30);
  doc.text(discLines, 15, y);
  doc.setTextColor(0, 0, 0);

  // Footer
  doc.setFontSize(7);
  doc.text(`Data: ${new Date().toLocaleDateString("it-IT")} — GeoVincoli`, w / 2, 290, { align: "center" });

  doc.save(`CDU_${particella.comune}_Fg${particella.foglio}_P${particella.particella}.pdf`);
}
