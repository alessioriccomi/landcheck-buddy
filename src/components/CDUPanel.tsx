import { useState } from "react";
import { Particella, AnalisiVincolistica, VincoloItem, CRITICITA_CONFIG, CLASSIFICAZIONE_CONFIG } from "@/types/vincoli";
import { Download, FileText, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportCDUPDF } from "@/lib/exportCDU";
import { getVincoliPresenti } from "@/lib/vincoliUtils";
import { cn } from "@/lib/utils";

interface CDUPanelProps {
  particelle: Particella[];
  analisi: AnalisiVincolistica | null;
}

/** Heuristic: infer zona urbanistica from vincoli + location context */
function inferZonaUrbanistica(vincoli: VincoloItem[]): {
  zona: string;
  sottozona: string;
  descrizione: string;
  fonte: string;
} {
  const ids = new Set(vincoli.map(v => v.id));
  const categorie = new Set(vincoli.map(v => v.categoria));

  // Check for industrial/productive indicators
  if (ids.has("siti_contaminati") || ids.has("cave_miniere")) {
    return {
      zona: "D",
      sottozona: "D1",
      descrizione: "Zona industriale/produttiva",
      fonte: "Inferenza da layer SIN/cave — verificare con PRG/PUC comunale",
    };
  }

  // Default to agricultural since this tool focuses on FV/agrivoltaico on agricultural land
  const hasAgriVincoli = ids.has("doc_docg") || ids.has("dop_igp") || ids.has("puglia_olivi");
  if (hasAgriVincoli) {
    return {
      zona: "E",
      sottozona: "E1",
      descrizione: "Zona agricola di pregio (DOC/DOP/IGP)",
      fonte: "Inferenza da vincoli agricoli — verificare con PRG/PUC comunale",
    };
  }

  return {
    zona: "E",
    sottozona: "E",
    descrizione: "Zona agricola (presunta)",
    fonte: "Destinazione presunta per terreni non urbanizzati — verificare con PRG/PUC comunale",
  };
}

const ZONA_COLORS: Record<string, string> = {
  A: "bg-amber-600",
  B: "bg-orange-500",
  C: "bg-yellow-500",
  D: "bg-violet-500",
  E: "bg-emerald-600",
  F: "bg-sky-500",
};

export function CDUPanel({ particelle, analisi }: CDUPanelProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);

  if (particelle.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-[10px]">
        <FileText size={20} className="mx-auto mb-2 opacity-40" />
        Nessuna particella disponibile
      </div>
    );
  }

  const idx = Math.min(selectedIdx, particelle.length - 1);
  const particella = particelle[idx];
  const vincoliParticella = analisi ? getVincoliPresenti(analisi) : [];
  const zonaInfo = inferZonaUrbanistica(vincoliParticella);

  const classificazione = analisi?.classificazioneIdoneita ?? "potenzialmente_idoneo";
  const classConfig = CLASSIFICAZIONE_CONFIG[classificazione];

  return (
    <div className="space-y-3">
      {/* Header with parcel selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-primary" />
          <h3 className="text-xs font-bold text-foreground">CDU Sintetico</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-6 text-[10px] gap-1"
          onClick={() => exportCDUPDF(particella, analisi, zonaInfo)}
        >
          <Download size={10} /> Esporta PDF
        </Button>
      </div>

      {/* Parcel navigator (when multiple) */}
      {particelle.length > 1 && (
        <div className="flex items-center gap-2 bg-muted/40 rounded-lg px-2 py-1.5">
          <button
            onClick={() => setSelectedIdx(Math.max(0, idx - 1))}
            disabled={idx === 0}
            className="p-0.5 rounded hover:bg-muted/60 disabled:opacity-30"
          >
            <ChevronLeft size={12} />
          </button>
          <div className="flex-1 text-center">
            <p className="text-[10px] font-semibold text-foreground">
              <MapPin size={9} className="inline mr-1" />
              Particella {idx + 1} di {particelle.length}
            </p>
            <p className="text-[9px] text-muted-foreground">
              {particella.comune} — Fg. {particella.foglio} P. {particella.particella}
            </p>
          </div>
          <button
            onClick={() => setSelectedIdx(Math.min(particelle.length - 1, idx + 1))}
            disabled={idx === particelle.length - 1}
            className="p-0.5 rounded hover:bg-muted/60 disabled:opacity-30"
          >
            <ChevronRight size={12} />
          </button>
        </div>
      )}

      {/* Dati catastali */}
      <div className="bg-muted/40 rounded-lg p-2.5 space-y-1.5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Dati Catastali</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <InfoRow label="Comune" value={particella.comune} />
          <InfoRow label="Provincia" value={particella.provincia || "—"} />
          <InfoRow label="Foglio" value={particella.foglio} />
          <InfoRow label="Particella" value={particella.particella} />
          <InfoRow label="Sezione" value={particella.sezione || "—"} />
          <InfoRow label="Subalterno" value={particella.subalterno || "—"} />
          <InfoRow
            label="Superficie"
            value={particella.superficieMq ? `${particella.superficieMq.toLocaleString("it-IT")} m²` : "N/D"}
          />
          <InfoRow
            label="Ettari"
            value={particella.superficieMq ? `${(particella.superficieMq / 10000).toFixed(4)} ha` : "N/D"}
          />
        </div>
      </div>

      {/* Zona urbanistica */}
      <div className="bg-muted/40 rounded-lg p-2.5 space-y-1.5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Zona Urbanistica (PRG/PUC)</p>
        <div className="flex items-center gap-2">
          <span className={cn(
            "inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-bold text-white",
            ZONA_COLORS[zonaInfo.zona] || "bg-muted-foreground"
          )}>
            {zonaInfo.sottozona}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-foreground">{zonaInfo.descrizione}</p>
            <p className="text-[9px] text-muted-foreground italic leading-tight mt-0.5">{zonaInfo.fonte}</p>
          </div>
        </div>
        <div className="mt-1 text-[9px] text-muted-foreground space-y-0.5">
          <p>• <strong>Zona A/B/C</strong> — residenziale (storica/completamento/espansione)</p>
          <p>• <strong>Zona D</strong> — industriale/produttiva</p>
          <p>• <strong>Zona E</strong> — agricola (E1 pregio, E2 normale, E3 marginale)</p>
          <p>• <strong>Zona F</strong> — servizi e attrezzature pubbliche</p>
        </div>
      </div>

      {/* Vincoli sovraordinati */}
      <div className="bg-muted/40 rounded-lg p-2.5 space-y-1.5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Vincoli Sovraordinati ({vincoliParticella.length})
        </p>
        {vincoliParticella.length === 0 ? (
          <p className="text-[10px] text-muted-foreground italic">Nessun vincolo rilevato</p>
        ) : (
          <div className="space-y-1.5">
            {vincoliParticella.map(v => {
              const cfg = v.criticita ? CRITICITA_CONFIG[v.criticita] : null;
              return (
                <div key={v.id} className="bg-card/60 rounded-md p-1.5 border border-border/50">
                  <div className="flex items-start gap-1.5">
                    <span className="text-[10px] flex-shrink-0 mt-0.5">{cfg?.emoji ?? "⚪"}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-foreground leading-tight font-medium">{v.descrizione}</p>
                      <div className="flex flex-wrap gap-x-3 mt-0.5">
                        {v.normativa && (
                          <span className="text-[9px] text-primary/80">{v.normativa}</span>
                        )}
                        {v.fonte && (
                          <span className="text-[9px] text-muted-foreground">{v.fonte}</span>
                        )}
                        {cfg && (
                          <span className={cn("text-[9px] font-semibold", cfg.color)}>
                            {cfg.label}
                          </span>
                        )}
                      </div>
                      {v.azioneRichiesta && (
                        <p className="text-[9px] text-amber-foreground mt-0.5">↳ {v.azioneRichiesta}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Classificazione idoneità */}
      <div className={cn("rounded-lg p-2.5 space-y-1", classConfig.bg)}>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Idoneità FV/Agrivoltaico</p>
        <p className={cn("text-sm font-bold", classConfig.color)}>{classConfig.label}</p>
        <p className="text-[9px] text-muted-foreground leading-tight">{classConfig.description}</p>
      </div>

      {/* AUL / AUN if available */}
      {analisi && (
        <div className="bg-muted/40 rounded-lg p-2.5 space-y-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Riepilogo Aree</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[9px] text-muted-foreground">AUL (lorda)</span>
              <p className="text-[11px] font-bold text-foreground">{analisi.areaUtileLordaHa.toFixed(4)} ha</p>
            </div>
            <div>
              <span className="text-[9px] text-muted-foreground">AUN (netta)</span>
              <p className="text-[11px] font-bold text-safe">{analisi.areaUtileNettaHa.toFixed(4)} ha</p>
            </div>
          </div>
          {analisi.areaUtileLordaHa > 0 && (
            <div className="mt-1">
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-safe rounded-full transition-all"
                  style={{ width: `${Math.min(100, (analisi.areaUtileNettaHa / analisi.areaUtileLordaHa) * 100)}%` }}
                />
              </div>
              <p className="text-[9px] text-muted-foreground mt-0.5 text-right">
                {((analisi.areaUtileNettaHa / analisi.areaUtileLordaHa) * 100).toFixed(1)}% area utilizzabile
              </p>
            </div>
          )}
        </div>
      )}

      {/* Disclaimer */}
      <div className="border border-border rounded-lg p-2">
        <p className="text-[8px] text-muted-foreground leading-relaxed">
          ⚠️ Il presente CDU sintetico è generato automaticamente da WMS pubblici e NON sostituisce il Certificato
          di Destinazione Urbanistica rilasciato dal Comune ai sensi dell'art. 30 DPR 380/2001.
          Verificare sempre con l'Ufficio Tecnico Comunale.
        </p>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[9px] text-muted-foreground">{label}</span>
      <p className="text-[11px] font-medium text-foreground leading-tight">{value}</p>
    </div>
  );
}
