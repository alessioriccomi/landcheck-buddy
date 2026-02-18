import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { AnalisiVincolistica, VincoloPresenza } from "@/types/vincoli";

const PRESENZA_LABEL: Record<VincoloPresenza, string> = {
  presente: "PRESENTE",
  verifica: "DA VERIFICARE",
  assente: "ASSENTE",
  non_rilevabile: "NON RILEVABILE",
};

const PRESENZA_COLOR: Record<VincoloPresenza, [number, number, number]> = {
  presente: [220, 38, 38],
  verifica: [217, 119, 6],
  assente: [22, 163, 74],
  non_rilevabile: [107, 114, 128],
};

const RISCHIO_LABEL: Record<string, string> = {
  nessuno: "Nessun rischio",
  basso: "Rischio basso",
  medio: "Rischio medio",
  alto: "Rischio alto",
  molto_alto: "Rischio molto alto",
};

const RISCHIO_COLOR: Record<string, [number, number, number]> = {
  nessuno: [22, 163, 74],
  basso: [22, 163, 74],
  medio: [217, 119, 6],
  alto: [220, 38, 38],
  molto_alto: [185, 28, 28],
};

export function exportReportPDF(analisi: AnalisiVincolistica) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin;

  // ── Header band ───────────────────────────────────────────
  doc.setFillColor(22, 47, 99);
  doc.rect(0, 0, pageW, 38, "F");

  doc.setFillColor(245, 158, 11);
  doc.rect(0, 38, pageW, 3, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("GeoVincoli", margin, 14);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Analisi Vincolistica dei Terreni", margin, 22);

  doc.setFontSize(8);
  doc.setTextColor(180, 200, 230);
  doc.text(
    "D.Lgs. 42/2004  ·  D.Lgs. 152/2006  ·  R.D. 3267/1923  ·  D.L. 180/1998",
    margin,
    30
  );

  // Date top-right
  doc.setTextColor(180, 200, 230);
  doc.setFontSize(8);
  doc.text(`Data analisi: ${analisi.dataAnalisi}`, pageW - margin, 14, { align: "right" });

  y = 50;

  // ── Parcel info ───────────────────────────────────────────
  doc.setTextColor(22, 47, 99);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Particelle catastali analizzate", margin, y);
  y += 5;

  const parcelRows = analisi.particelle.map((p, i) => [
    String(i + 1),
    p.comune,
    p.provincia || "—",
    p.foglio,
    p.particella,
    p.subalterno || "—",
  ]);

  autoTable(doc, {
    startY: y,
    head: [["#", "Comune", "Prov.", "Foglio", "Particella", "Sub."]],
    body: parcelRows,
    theme: "grid",
    headStyles: { fillColor: [22, 47, 99], textColor: 255, fontSize: 8, fontStyle: "bold" },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 0: { cellWidth: 8 }, 2: { cellWidth: 14 }, 3: { cellWidth: 18 }, 4: { cellWidth: 22 }, 5: { cellWidth: 14 } },
    margin: { left: margin, right: margin },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Rischio complessivo ───────────────────────────────────
  const rc = RISCHIO_COLOR[analisi.rischioComplessivo] || [100, 100, 100];
  doc.setFillColor(...rc);
  doc.roundedRect(margin, y, pageW - margin * 2, 14, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(
    `Rischio complessivo: ${RISCHIO_LABEL[analisi.rischioComplessivo] || "—"}`,
    margin + 5,
    y + 9
  );

  // count totals
  const allVincoli = [
    ...analisi.vincoliCulturali,
    ...analisi.vincoliPaesaggistici,
    ...analisi.vincoliIdrogeologici,
    ...analisi.vincoliAmbientali,
    ...analisi.rischioIdrico,
    ...analisi.serviziReti,
    ...analisi.altriVincoli,
  ];
  const totPresenti = allVincoli.filter(v => v.presenza === "presente").length;
  const totVerifica = allVincoli.filter(v => v.presenza === "verifica").length;
  const totAssenti = allVincoli.filter(v => v.presenza === "assente").length;

  doc.setFontSize(8);
  doc.text(
    `Presenti: ${totPresenti}   Da verificare: ${totVerifica}   Assenti: ${totAssenti}   Totale: ${allVincoli.length}`,
    pageW - margin,
    y + 9,
    { align: "right" }
  );

  y += 20;

  // ── Section helper ────────────────────────────────────────
  const addSection = (title: string, emoji: string, items: typeof analisi.vincoliCulturali) => {
    // Check remaining space
    if (y > pageH - 50) {
      doc.addPage();
      y = margin;
    }

    doc.setTextColor(22, 47, 99);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`${emoji}  ${title}`, margin, y);
    y += 4;

    const rows = items.map(v => [
      v.sottocategoria,
      PRESENZA_LABEL[v.presenza],
      v.normativa,
      v.note || v.descrizione.substring(0, 80) + (v.descrizione.length > 80 ? "…" : ""),
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Vincolo", "Presenza", "Normativa", "Note"]],
      body: rows,
      theme: "striped",
      headStyles: { fillColor: [40, 70, 130], textColor: 255, fontSize: 7, fontStyle: "bold" },
      bodyStyles: { fontSize: 6.5, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 25 },
        2: { cellWidth: 45 },
        3: { cellWidth: 50 },
      },
      didParseCell(data) {
        if (data.column.index === 1 && data.section === "body") {
          const val = data.cell.raw as string;
          if (val === "PRESENTE") {
            data.cell.styles.textColor = [185, 28, 28];
            data.cell.styles.fontStyle = "bold";
          } else if (val === "DA VERIFICARE") {
            data.cell.styles.textColor = [180, 100, 0];
            data.cell.styles.fontStyle = "bold";
          } else if (val === "ASSENTE") {
            data.cell.styles.textColor = [22, 100, 50];
          }
        }
      },
      margin: { left: margin, right: margin },
    });

    y = (doc as any).lastAutoTable.finalY + 8;
  };

  addSection("Beni Culturali", "🏛", analisi.vincoliCulturali);
  addSection("Vincoli Paesaggistici", "🌄", analisi.vincoliPaesaggistici);
  addSection("Vincoli Idrogeologici", "⛰️", analisi.vincoliIdrogeologici);
  addSection("Rischio Idrico", "💧", analisi.rischioIdrico);
  addSection("Vincoli Ambientali", "🌿", analisi.vincoliAmbientali);
  addSection("Servizi e Reti (servitù)", "⚡", analisi.serviziReti);
  addSection("Altri Vincoli Urbanistici", "📋", analisi.altriVincoli);

  // ── Disclaimer ────────────────────────────────────────────
  if (y > pageH - 30) {
    doc.addPage();
    y = margin;
  }

  doc.setFillColor(255, 251, 235);
  doc.setDrawColor(217, 119, 6);
  doc.rect(margin, y, pageW - margin * 2, 22, "FD");
  doc.setTextColor(100, 60, 0);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("⚠  AVVERTENZA LEGALE", margin + 3, y + 5);
  doc.setFont("helvetica", "normal");
  const disclaimer =
    "I risultati del presente report hanno carattere esclusivamente indicativo e non costituiscono parere legale o tecnico. " +
    "L'analisi è prodotta sulla base di banche dati pubbliche e potrebbe non rispecchiare aggiornamenti recenti degli enti competenti. " +
    "È indispensabile verificare i vincoli presso gli uffici tecnici comunali, la Soprintendenza, l'Autorità di Bacino e gli altri enti " +
    "competenti, nonché acquisire il parere di un professionista abilitato prima di qualsiasi intervento sul terreno.";
  const lines = doc.splitTextToSize(disclaimer, pageW - margin * 2 - 6);
  doc.text(lines, margin + 3, y + 10);

  y += 28;

  // ── Footer on all pages ───────────────────────────────────
  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(22, 47, 99);
    doc.rect(0, pageH - 10, pageW, 10, "F");
    doc.setTextColor(160, 190, 230);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.text("GeoVincoli — Analisi Vincolistica Terreni", margin, pageH - 4);
    doc.text(`Pag. ${i} di ${pageCount}`, pageW - margin, pageH - 4, { align: "right" });
  }

  // Save
  const safeComune = analisi.particelle[0]?.comune?.replace(/\s+/g, "_") || "terreno";
  doc.save(`GeoVincoli_${safeComune}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
