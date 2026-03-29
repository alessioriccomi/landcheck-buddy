import jsPDF from "jspdf";
import { Particella, AnalisiVincolistica, CRITICITA_CONFIG } from "@/types/vincoli";
import { getVincoliPresenti } from "@/lib/vincoliUtils";

export function exportCDUPDF(
  particella: Particella,
  analisi: AnalisiVincolistica | null,
  zonaInfo?: { zona: string; sottozona: string; descrizione: string; fonte: string },
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  let y = 20;

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

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("DATI CATASTALI", 15, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const rows: [string, string][] = [
    ["Comune", particella.comune],
    ["Provincia", particella.provincia || "—"],
    ["Foglio", particella.foglio],
    ["Particella", particella.particella],
    ["Sezione", particella.sezione || "—"],
    ["Subalterno", particella.subalterno || "—"],
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

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("ZONA URBANISTICA (PRG/PUC)", 15, y);
  y += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  const zDesc = zonaInfo ? `Zona ${zonaInfo.sottozona} — ${zonaInfo.descrizione}` : "Zona E (agricola) — da verificare";
  doc.text(zDesc, 15, y);
  y += 5;
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(120, 120, 120);
  doc.text(zonaInfo?.fonte || "Verificare con PRG/PUC comunale", 15, y);
  doc.setTextColor(0, 0, 0);
  y += 8;

  const vincoli = analisi ? getVincoliPresenti(analisi) : [];
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
      if (y > 250) { doc.addPage(); y = 20; }
      const cfg = v.criticita ? CRITICITA_CONFIG[v.criticita] : null;
      const prefix = cfg?.label ?? "—";
      doc.setFont("helvetica", "bold");
      doc.text(`[${prefix}]`, 15, y);
      doc.setFont("helvetica", "normal");
      const nameLines = doc.splitTextToSize(v.descrizione, 140);
      doc.text(nameLines, 40, y);
      y += nameLines.length * 4 + 2;
      // Normativa reference
      if (v.normativa) {
        doc.setTextColor(60, 60, 180);
        doc.text(`Rif. ${v.normativa}`, 40, y);
        doc.setTextColor(0, 0, 0);
        y += 4;
      }
      if (v.fonte) {
        doc.setTextColor(120, 120, 120);
        doc.text(`Fonte: ${v.fonte}`, 40, y);
        doc.setTextColor(0, 0, 0);
        y += 4;
      }
      if (v.azioneRichiesta) {
        doc.setTextColor(180, 100, 0);
        const actionLines = doc.splitTextToSize(`Azione: ${v.azioneRichiesta}`, 140);
        doc.text(actionLines, 40, y);
        doc.setTextColor(0, 0, 0);
        y += actionLines.length * 4 + 1;
      }
      y += 1;
    }
  }
  y += 5;

  const classificazione = analisi?.classificazioneIdoneita ?? "potenzialmente_idoneo";
  const classLabel = classificazione === "non_idoneo" ? "NON IDONEO"
    : classificazione === "condizionato" ? "CONDIZIONATO" : "POTENZIALMENTE IDONEO";

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

  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(120, 120, 120);
  const disclaimer = "Il presente CDU sintetico è generato automaticamente da WMS pubblici e NON sostituisce il CDU rilasciato dal Comune ai sensi dell'art. 30 DPR 380/2001.";
  doc.text(doc.splitTextToSize(disclaimer, w - 30), 15, y);
  doc.setTextColor(0, 0, 0);

  doc.setFontSize(7);
  doc.text(`Data: ${new Date().toLocaleDateString("it-IT")} — GeoVincoli`, w / 2, 290, { align: "center" });

  doc.save(`CDU_${particella.comune}_Fg${particella.foglio}_P${particella.particella}.pdf`);
}
