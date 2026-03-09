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
  doc.text("Analisi Vincolistica per Impianti Agrivoltaici", margin, 22);

  doc.setFontSize(7.5);
  doc.setTextColor(180, 200, 230);
  doc.text(
    "D.Lgs. 42/2004 · D.Lgs. 152/2006 · R.D. 3267/1923 · D.Lgs. 199/2021 · D.M. 22/12/2022",
    margin,
    30
  );

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

  const totalMq = analisi.particelle.reduce((s, p) => s + (p.superficieMq ?? 0), 0);
  const hasAreas = analisi.particelle.some(p => p.superficieMq && p.superficieMq > 0);

  const parcelRows = analisi.particelle.map((p, i) => {
    const mq = p.superficieMq;
    const superficieStr = mq && mq > 0
      ? `${mq.toLocaleString("it-IT")} m²\n${(mq / 10000).toFixed(4)} ha`
      : "—";
    return [
      String(i + 1),
      p.comune,
      p.provincia || "—",
      p.foglio,
      p.particella,
      p.subalterno || "—",
      superficieStr,
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [["#", "Comune", "Prov.", "Foglio", "Particella", "Sub.", "Superficie reale (WFS)"]],
    body: parcelRows,
    theme: "grid",
    headStyles: { fillColor: [22, 47, 99], textColor: 255, fontSize: 8, fontStyle: "bold" },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 8 },
      2: { cellWidth: 12 },
      3: { cellWidth: 14 },
      4: { cellWidth: 18 },
      5: { cellWidth: 12 },
      6: { cellWidth: 36 },
    },
    didParseCell(data) {
      if (data.column.index === 6 && data.section === "body") {
        const val = data.cell.raw as string;
        if (val !== "—") {
          data.cell.styles.textColor = [22, 100, 50];
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
    margin: { left: margin, right: margin },
  });

  y = (doc as any).lastAutoTable.finalY + 4;

  // Total area row
  if (hasAreas && totalMq > 0) {
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(22, 163, 74);
    doc.rect(margin, y, pageW - margin * 2, 10, "FD");
    doc.setTextColor(22, 100, 50);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Superficie totale complessiva (WFS):", margin + 4, y + 7);
    doc.text(
      `${totalMq.toLocaleString("it-IT")} m²  ·  ${(totalMq / 10000).toFixed(4)} ha`,
      pageW - margin - 4,
      y + 7,
      { align: "right" }
    );
    y += 14;
  } else {
    y += 4;
  }

  // ── AUL / AUN Summary Box ──────────────────────────────────
  const aul = analisi.areaUtileLordaHa;
  const aun = analisi.areaUtileNettaHa;
  const percNetta = aul > 0 ? (aun / aul) * 100 : 0;
  const percRiduzione = 100 - percNetta;

  // Draw the box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(100, 116, 139);
  doc.roundedRect(margin, y, pageW - margin * 2, 28, 2, 2, "FD");

  // Title
  doc.setTextColor(22, 47, 99);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Riepilogo Aree", margin + 4, y + 6);

  // AUL box
  const boxW = 50;
  const boxH = 16;
  const boxY = y + 9;

  doc.setFillColor(226, 232, 240);
  doc.roundedRect(margin + 4, boxY, boxW, boxH, 1, 1, "F");
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Area Utile Lorda (AUL)", margin + 4 + boxW / 2, boxY + 5, { align: "center" });
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`${aul.toFixed(2)} ha`, margin + 4 + boxW / 2, boxY + 12, { align: "center" });

  // AUN box
  const aunColor: [number, number, number] = percNetta >= 50 ? [220, 252, 231] : [254, 226, 226];
  const aunTextColor: [number, number, number] = percNetta >= 50 ? [22, 101, 52] : [185, 28, 28];
  doc.setFillColor(...aunColor);
  doc.roundedRect(margin + 4 + boxW + 6, boxY, boxW, boxH, 1, 1, "F");
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Area Utile Netta (AUN)", margin + 4 + boxW + 6 + boxW / 2, boxY + 5, { align: "center" });
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...aunTextColor);
  doc.text(`${aun.toFixed(2)} ha`, margin + 4 + boxW + 6 + boxW / 2, boxY + 12, { align: "center" });

  // Reduction bar visualization
  const barX = margin + 4 + boxW * 2 + 18;
  const barW = pageW - margin * 2 - barX + margin - 8;
  const barH = 8;
  const barY = boxY + 4;

  doc.setTextColor(51, 65, 85);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Riduzione vincoli", barX, boxY + 2);

  // Background bar (AUL = 100%)
  doc.setFillColor(226, 232, 240);
  doc.roundedRect(barX, barY, barW, barH, 1, 1, "F");

  // Green bar (AUN %)
  if (percNetta > 0) {
    doc.setFillColor(34, 197, 94);
    doc.roundedRect(barX, barY, barW * (percNetta / 100), barH, 1, 1, "F");
  }

  // Percentage labels
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(22, 101, 52);
  doc.text(`${percNetta.toFixed(0)}% netta`, barX + 2, barY + barH + 6);
  doc.setTextColor(185, 28, 28);
  doc.text(`-${percRiduzione.toFixed(0)}% vincoli`, barX + barW, barY + barH + 6, { align: "right" });

  y += 34;

  // ── Rischio complessivo ───────────────────────────────────
  const rc = RISCHIO_COLOR[analisi.rischioComplessivo] || [100, 100, 100];
  doc.setFillColor(...rc);
  doc.roundedRect(margin, y, pageW - margin * 2, 14, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(
    `Rischio autorizzativo complessivo: ${RISCHIO_LABEL[analisi.rischioComplessivo] || "—"}`,
    margin + 5,
    y + 9
  );

  const allVincoli = [
    ...analisi.vincoliCulturali, ...analisi.vincoliPaesaggistici,
    ...analisi.vincoliIdrogeologici, ...analisi.vincoliAmbientali,
    ...analisi.rischioIdrico, ...analisi.serviziReti, ...analisi.altriVincoli,
    ...analisi.vincoliAgricoli, ...analisi.vincoliMilitariRadar,
    ...analisi.vincoliForestali, ...analisi.vincoliSismici,
    ...analisi.vincoliCatastali, ...analisi.compatibilitaConnessione,
    ...analisi.areeIdonee, ...analisi.normativaAgrivoltaico,
  ];
  const totPresenti = allVincoli.filter(v => v.presenza === "presente").length;
  const totVerifica = allVincoli.filter(v => v.presenza === "verifica").length;
  const totAssenti = allVincoli.filter(v => v.presenza === "assente").length;

  doc.setFontSize(8);
  doc.text(
    `Presenti: ${totPresenti}   Da verificare: ${totVerifica}   Assenti: ${totAssenti}   Tot. controlli: ${allVincoli.length}`,
    pageW - margin,
    y + 9,
    { align: "right" }
  );

  y += 20;

  // ── Section helper ────────────────────────────────────────
  const addSection = (title: string, emoji: string, items: typeof analisi.vincoliCulturali) => {
    if (items.length === 0) return;
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
      head: [["Vincolo / Requisito", "Presenza", "Normativa", "Note"]],
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

  // ── Sezioni principali ────────────────────────────────────
  addSection("Beni Culturali e Archeologia", "🏛", analisi.vincoliCulturali);
  addSection("Vincoli Paesaggistici", "🌄", analisi.vincoliPaesaggistici);
  addSection("Vincoli Idrogeologici", "⛰️", analisi.vincoliIdrogeologici);
  addSection("Rischio Idrico (PAI/PGRA)", "💧", analisi.rischioIdrico);
  addSection("Vincoli Ambientali e Natura 2000", "🌿", analisi.vincoliAmbientali);
  addSection("Servizi e Reti (servitù)", "⚡", analisi.serviziReti);
  addSection("Urbanistica e Altri Vincoli", "📋", analisi.altriVincoli);

  // ── Sezioni agrivoltaico ──────────────────────────────────
  // Separator
  if (y > pageH - 40) { doc.addPage(); y = margin; }
  doc.setFillColor(22, 47, 99);
  doc.rect(margin, y, pageW - margin * 2, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("VINCOLI SPECIFICI AGRIVOLTAICO", pageW / 2, y + 5.5, { align: "center" });
  y += 13;

  addSection("Vincoli Agricoli", "🌾", analisi.vincoliAgricoli);
  addSection("Aree Idonee FV/Agrivoltaico (D.Lgs. 199/2021)", "☀️", analisi.areeIdonee);
  addSection("Normativa Agrivoltaico (DM 22/2022)", "📐", analisi.normativaAgrivoltaico);
  addSection("Compatibilità Connessione Rete", "🔌", analisi.compatibilitaConnessione);
  addSection("Vincoli Catastali, Usi Civici e Proprietà", "📜", analisi.vincoliCatastali);
  addSection("Vincoli Forestali e Incendi Boschivi", "🌲", analisi.vincoliForestali);
  addSection("Vincoli Sismici", "〰️", analisi.vincoliSismici);
  addSection("Vincoli Militari e Radar", "📡", analisi.vincoliMilitariRadar);

  // ── Disclaimer ────────────────────────────────────────────
  if (y > pageH - 35) {
    doc.addPage();
    y = margin;
  }

  doc.setFillColor(255, 251, 235);
  doc.setDrawColor(217, 119, 6);
  doc.rect(margin, y, pageW - margin * 2, 28, "FD");
  doc.setTextColor(100, 60, 0);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("⚠  AVVERTENZA LEGALE", margin + 3, y + 5);
  doc.setFont("helvetica", "normal");
  const disclaimer =
    "I risultati del presente report hanno carattere esclusivamente indicativo e non costituiscono parere legale o tecnico. " +
    "L'analisi è prodotta sulla base di banche dati pubbliche e potrebbe non rispecchiare aggiornamenti recenti degli enti competenti. " +
    "Per un impianto agrivoltaico è indispensabile: (1) verificare i vincoli presso gli uffici tecnici comunali, la Soprintendenza, " +
    "l'Autorità di Bacino, ENAC/ENAV, il Commissariato Usi Civici e gli altri enti competenti; (2) effettuare una due diligence " +
    "cartografica completa con strumenti GIS (QGIS/ArcGIS) sui SIT regionali; (3) acquisire il parere di un professionista abilitato " +
    "prima di qualsiasi impegno o investimento sul terreno.";
  const lines = doc.splitTextToSize(disclaimer, pageW - margin * 2 - 6);
  doc.text(lines, margin + 3, y + 11);

  y += 34;

  // ── Footer on all pages ───────────────────────────────────
  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(22, 47, 99);
    doc.rect(0, pageH - 10, pageW, 10, "F");
    doc.setTextColor(160, 190, 230);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.text("GeoVincoli — Analisi Vincolistica Agrivoltaico · Tuscany Engineering", margin, pageH - 4);
    doc.text(`Pag. ${i} di ${pageCount}`, pageW - margin, pageH - 4, { align: "right" });
  }

  const safeComune = analisi.particelle[0]?.comune?.replace(/\s+/g, "_") || "terreno";
  doc.save(`GeoVincoli_${safeComune}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
