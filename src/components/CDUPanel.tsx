import { Particella, AnalisiVincolistica, VincoloItem, CRITICITA_CONFIG } from "@/types/vincoli";
import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportCDUPDF } from "@/lib/exportCDU";

interface CDUPanelProps {
  particella: Particella;
  analisi: AnalisiVincolistica | null;
}

export function CDUPanel({ particella, analisi }: CDUPanelProps) {
  const allVincoli = analisi ? [
    ...analisi.vincoliCulturali, ...analisi.vincoliPaesaggistici, ...analisi.vincoliIdrogeologici,
    ...analisi.vincoliAmbientali, ...analisi.rischioIdrico, ...analisi.serviziReti,
    ...analisi.altriVincoli, ...analisi.vincoliAgricoli, ...analisi.vincoliMilitariRadar,
    ...analisi.vincoliForestali, ...analisi.vincoliSismici, ...analisi.vincoliCatastali,
    ...analisi.compatibilitaConnessione, ...analisi.areeIdonee, ...analisi.normativaAgrivoltaico,
  ] : [];
  const vincoliParticella = allVincoli.filter(v => v.presenza === "presente" || v.presenza === "verifica");

  const classificazione = analisi?.classificazioneIdoneita ?? "potenzialmente_idoneo";
  const classLabel = classificazione === "non_idoneo"
    ? "NON IDONEO"
    : classificazione === "condizionato"
    ? "CONDIZIONATO"
    : "POTENZIALMENTE IDONEO";
  const classColor = classificazione === "non_idoneo"
    ? "text-destructive"
    : classificazione === "condizionato"
    ? "text-amber-foreground"
    : "text-safe";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-primary" />
          <h3 className="text-xs font-bold text-foreground">CDU Sintetico</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-6 text-[10px] gap-1"
          onClick={() => exportCDUPDF(particella, analisi)}
        >
          <Download size={10} /> PDF
        </Button>
      </div>

      {/* Dati catastali */}
      <div className="bg-muted/40 rounded-lg p-2.5 space-y-1.5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Dati Catastali</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <InfoRow label="Comune" value={particella.comune} />
          <InfoRow label="Foglio" value={particella.foglio} />
          <InfoRow label="Particella" value={particella.particella} />
          <InfoRow label="Sezione" value={particella.sezione || "—"} />
          <InfoRow label="Superficie" value={particella.superficieMq ? `${particella.superficieMq.toLocaleString("it-IT")} m²` : "N/D"} />
          <InfoRow label="Ettari" value={particella.superficieMq ? `${(particella.superficieMq / 10000).toFixed(4)} ha` : "N/D"} />
        </div>
      </div>

      {/* Zona urbanistica */}
      <div className="bg-muted/40 rounded-lg p-2.5 space-y-1.5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Zona Urbanistica</p>
        <p className="text-xs text-foreground">
          Zona E (agricola) — <span className="text-muted-foreground italic">da verificare con PRG/PUC comunale</span>
        </p>
      </div>

      {/* Vincoli rilevati */}
      <div className="bg-muted/40 rounded-lg p-2.5 space-y-1.5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Vincoli Rilevati ({vincoliParticella.length})
        </p>
        {vincoliParticella.length === 0 ? (
          <p className="text-[10px] text-muted-foreground italic">Nessun vincolo rilevato</p>
        ) : (
          <div className="space-y-1">
            {vincoliParticella.map(v => {
              const cfg = v.criticita ? CRITICITA_CONFIG[v.criticita] : null;
              return (
                <div key={v.id} className="flex items-start gap-1.5">
                  <span className="text-[10px] flex-shrink-0">{cfg?.emoji ?? "⚪"}</span>
                  <div className="min-w-0">
                    <p className="text-[10px] text-foreground leading-tight">{v.nome}</p>
                    {v.fonte && <p className="text-[9px] text-muted-foreground">{v.fonte}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Classificazione */}
      <div className="bg-muted/40 rounded-lg p-2.5 space-y-1">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Idoneità FV/Agrivoltaico</p>
        <p className={`text-xs font-bold ${classColor}`}>{classLabel}</p>
      </div>

      {/* Disclaimer */}
      <div className="border border-border rounded-lg p-2">
        <p className="text-[8px] text-muted-foreground leading-relaxed">
          Il presente CDU sintetico è generato automaticamente da WMS pubblici e NON sostituisce il Certificato
          di Destinazione Urbanistica rilasciato dal Comune ai sensi dell'art. 30 DPR 380/2001. Verificare
          sempre con l'Ufficio Tecnico Comunale.
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
