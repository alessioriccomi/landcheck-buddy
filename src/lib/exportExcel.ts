import ExcelJS from "exceljs";
import { AnalisiVincolistica, CRITICITA_CONFIG, CLASSIFICAZIONE_CONFIG } from "@/types/vincoli";

export async function exportAnalisiExcel(analisi: AnalisiVincolistica) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "GeoVincoli";
  wb.created = new Date();

  // ── Sheet 1: Riepilogo ──
  const ws1 = wb.addWorksheet("Riepilogo");
  ws1.columns = [
    { header: "Campo", key: "campo", width: 30 },
    { header: "Valore", key: "valore", width: 50 },
  ];

  const classificazione = analisi.classificazioneIdoneita ?? "potenzialmente_idoneo";
  const classConfig = CLASSIFICAZIONE_CONFIG[classificazione];

  ws1.addRows([
    { campo: "Data Analisi", valore: analisi.dataAnalisi },
    { campo: "Numero Particelle", valore: String(analisi.particelle.length) },
    { campo: "AUL (Area Utile Lorda)", valore: `${(analisi.areaUtileLordaHa ?? 0).toFixed(4)} ha` },
    { campo: "AUN (Area Utile Netta)", valore: `${(analisi.areaUtileNettaHa ?? 0).toFixed(4)} ha` },
    { campo: "Classificazione Idoneità", valore: classConfig?.label ?? classificazione },
    { campo: "Vincoli Escludenti", valore: String(analisi.vincoli.filter(v => v.presente && v.criticita === "escludente").length) },
    { campo: "Vincoli Condizionanti", valore: String(analisi.vincoli.filter(v => v.presente && v.criticita === "condizionante").length) },
    { campo: "Vincoli Da Verificare", valore: String(analisi.vincoli.filter(v => v.presente && v.criticita === "da_verificare").length) },
  ]);

  // Style header
  ws1.getRow(1).font = { bold: true };
  ws1.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
  ws1.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  // ── Sheet 2: Particelle ──
  const ws2 = wb.addWorksheet("Particelle");
  ws2.columns = [
    { header: "Comune", key: "comune", width: 25 },
    { header: "Foglio", key: "foglio", width: 10 },
    { header: "Particella", key: "particella", width: 12 },
    { header: "Sezione", key: "sezione", width: 10 },
    { header: "Superficie (m²)", key: "mq", width: 16 },
    { header: "Superficie (ha)", key: "ha", width: 14 },
  ];

  for (const p of analisi.particelle) {
    ws2.addRow({
      comune: p.comune,
      foglio: p.foglio,
      particella: p.particella,
      sezione: p.sezione || "",
      mq: p.superficieMq ?? 0,
      ha: p.superficieMq ? (p.superficieMq / 10000).toFixed(4) : "N/D",
    });
  }
  ws2.getRow(1).font = { bold: true };
  ws2.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
  ws2.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  // ── Sheet 3: Vincoli ──
  const ws3 = wb.addWorksheet("Vincoli");
  ws3.columns = [
    { header: "Categoria", key: "categoria", width: 25 },
    { header: "Vincolo", key: "vincolo", width: 45 },
    { header: "Presente", key: "presente", width: 10 },
    { header: "Criticità", key: "criticita", width: 18 },
    { header: "Azione Richiesta", key: "azione", width: 50 },
    { header: "Fonte Normativa", key: "fonte", width: 40 },
  ];

  for (const v of analisi.vincoli) {
    const cfg = v.criticita ? CRITICITA_CONFIG[v.criticita] : null;
    ws3.addRow({
      categoria: v.categoria,
      vincolo: v.nome,
      presente: v.presente ? "SÌ" : "NO",
      criticita: cfg ? `${cfg.emoji} ${cfg.label}` : "—",
      azione: v.azioneRichiesta ?? "",
      fonte: v.fonte ?? "",
    });
  }
  ws3.getRow(1).font = { bold: true };
  ws3.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
  ws3.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  // Color-code criticità
  for (let i = 2; i <= ws3.rowCount; i++) {
    const row = ws3.getRow(i);
    const vincolo = analisi.vincoli[i - 2];
    if (vincolo?.presente) {
      const colors: Record<string, string> = {
        escludente: "FFFEE2E2",
        condizionante: "FFFFF7ED",
        da_verificare: "FFFFFBEB",
        neutro: "FFF0FDF4",
      };
      const c = vincolo.criticita ? colors[vincolo.criticita] : undefined;
      if (c) {
        row.eachCell(cell => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: c } };
        });
      }
    }
  }

  // ── Sheet 4: Step Autorizzativi ──
  if (analisi.stepAutorizzativi && analisi.stepAutorizzativi.length > 0) {
    const ws4 = wb.addWorksheet("Step Autorizzativi");
    ws4.columns = [
      { header: "#", key: "num", width: 5 },
      { header: "Ente Competente", key: "ente", width: 30 },
      { header: "Procedura", key: "procedura", width: 50 },
      { header: "Riferimento Normativo", key: "norma", width: 40 },
    ];

    analisi.stepAutorizzativi.forEach((s, i) => {
      ws4.addRow({
        num: i + 1,
        ente: s.ente,
        procedura: s.procedura,
        norma: s.riferimentoNormativo,
      });
    });
    ws4.getRow(1).font = { bold: true };
    ws4.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
    ws4.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  }

  // Generate and download
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Analisi_Vincolistica_${analisi.dataAnalisi.replace(/\//g, "-")}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
