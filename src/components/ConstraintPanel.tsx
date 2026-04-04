import { VincoloItem, VincoloPresenza, RischioLevel, AnalisiVincolistica, CriticitaLevel, CRITICITA_CONFIG, CLASSIFICAZIONE_CONFIG, StepAutorizzativo } from "@/types/vincoli";
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle, ChevronDown, ChevronUp, FileText, ExternalLink, Shield, ArrowRight, Info } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

const presenzaConfig: Record<VincoloPresenza, { label: string; icon: React.ReactNode; className: string; dot: string }> = {
  assente: { label: "Assente", icon: <CheckCircle2 size={13} />, className: "text-safe bg-safe-light border-safe/30", dot: "bg-safe" },
  presente: { label: "Presente", icon: <XCircle size={13} />, className: "text-danger bg-danger-light border-danger/30", dot: "bg-danger" },
  verifica: { label: "Da verificare", icon: <AlertTriangle size={13} />, className: "text-amber bg-amber-light border-amber/30", dot: "bg-amber" },
  non_rilevabile: { label: "Non rilevabile", icon: <HelpCircle size={13} />, className: "text-muted-foreground bg-muted border-border", dot: "bg-muted-foreground" },
};

const rischioConfig: Record<RischioLevel, { label: string; color: string; bg: string; bar: number }> = {
  nessuno: { label: "Nessun rischio", color: "text-safe", bg: "bg-safe", bar: 0 },
  basso: { label: "Rischio basso", color: "text-safe", bg: "bg-safe", bar: 25 },
  medio: { label: "Rischio medio", color: "text-amber", bg: "bg-amber", bar: 50 },
  alto: { label: "Rischio alto", color: "text-danger", bg: "bg-danger", bar: 75 },
  molto_alto: { label: "Rischio molto alto", color: "text-danger", bg: "bg-danger", bar: 100 },
};

function CriticitaBadge({ criticita }: { criticita?: CriticitaLevel }) {
  if (!criticita) return null;
  const cfg = CRITICITA_CONFIG[criticita];
  return (
    <span className={cn("text-[9px] font-bold", cfg.color)} title={cfg.label}>
      {cfg.emoji}
    </span>
  );
}

function PresenzaBadge({ presenza }: { presenza: VincoloPresenza }) {
  const cfg = presenzaConfig[presenza];
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border", cfg.className)}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

function VincoloRow({ v }: { v: VincoloItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("border rounded-lg overflow-hidden transition-all", v.presenza === "presente" ? "border-danger/30" : v.presenza === "verifica" ? "border-amber/30" : "border-border")}>
      <button className="w-full flex items-start gap-2 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors" onClick={() => setOpen(o => !o)}>
        <CriticitaBadge criticita={v.criticita} />
        <div className={cn("mt-0.5 w-2 h-2 rounded-full flex-shrink-0", presenzaConfig[v.presenza].dot)} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground leading-snug">{v.sottocategoria}</p>
          {v.azioneRichiesta && v.presenza === "presente" && (
            <p className="text-[10px] text-danger mt-0.5 flex items-center gap-1">
              <ArrowRight size={9} />{v.azioneRichiesta}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex cursor-help text-muted-foreground hover:text-primary transition-colors" onClick={(e) => e.stopPropagation()}>
                <Info size={13} />
              </span>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs space-y-1 text-xs">
              <p><strong>Categoria:</strong> {v.categoria}</p>
              <p><strong>Normativa:</strong> {v.normativa}</p>
              {v.fonte && <p><strong>Fonte:</strong> {v.fonte}</p>}
              {v.criticita && (
                <p><strong>Criticità:</strong> <span className={CRITICITA_CONFIG[v.criticita].color}>{CRITICITA_CONFIG[v.criticita].emoji} {CRITICITA_CONFIG[v.criticita].label}</span></p>
              )}
            </TooltipContent>
          </Tooltip>
          <PresenzaBadge presenza={v.presenza} />
          {open ? <ChevronUp size={12} className="text-muted-foreground" /> : <ChevronDown size={12} className="text-muted-foreground" />}
        </div>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1 bg-muted/20 border-t border-border space-y-2">
          <p className="text-xs text-foreground/80">{v.descrizione}</p>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-muted-foreground font-medium">Norma:</span>
            <span className="text-xs text-muted-foreground italic">{v.normativa}</span>
          </div>
          {v.criticita && (
            <div className="flex items-center gap-1.5">
              <Shield size={10} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Criticità: <strong className={CRITICITA_CONFIG[v.criticita].color}>{CRITICITA_CONFIG[v.criticita].label}</strong></span>
            </div>
          )}
          {v.azioneRichiesta && (
            <div className="flex items-center gap-1.5">
              <ArrowRight size={10} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Azione: <strong>{v.azioneRichiesta}</strong></span>
            </div>
          )}
          {v.fonte && (
            <div className="flex items-center gap-1.5">
              <ExternalLink size={10} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Fonte: {v.fonte}</span>
            </div>
          )}
          {v.note && (
            <div className="bg-amber-light border border-amber/20 rounded p-2 flex gap-2">
              <AlertTriangle size={11} className="text-amber mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-foreground">{v.note}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CategorySection({ title, icon, items, defaultOpen = false }: {
  title: string; icon: React.ReactNode; items: VincoloItem[]; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const presenti = items.filter(i => i.presenza === "presente").length;
  const verifica = items.filter(i => i.presenza === "verifica").length;
  const escludenti = items.filter(i => i.presenza === "presente" && i.criticita === "escludente").length;

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button className="w-full flex items-center gap-3 px-4 py-3 bg-card hover:bg-muted/30 transition-colors text-left" onClick={() => setOpen(o => !o)}>
        <span className="text-primary">{icon}</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {escludenti > 0 && <span className="text-xs text-danger font-bold">🔴 {escludenti} escludent{escludenti > 1 ? "i" : "e"}</span>}
            {presenti > 0 && escludenti === 0 && <span className="text-xs text-danger font-medium">{presenti} presente{presenti > 1 ? "i" : ""}</span>}
            {verifica > 0 && <span className="text-xs text-amber font-medium">{verifica} da verificare</span>}
            {presenti === 0 && verifica === 0 && <span className="text-xs text-safe font-medium">Nessun vincolo rilevato</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{items.length}</span>
          {open ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
        </div>
      </button>
      {open && (
        <div className="p-3 space-y-2 bg-background/50 border-t border-border">
          {items.map(v => <VincoloRow key={v.id} v={v} />)}
        </div>
      )}
    </div>
  );
}

function StepAutorizzativiSection({ steps }: { steps: StepAutorizzativo[] }) {
  const [open, setOpen] = useState(true);
  if (steps.length === 0) return null;

  return (
    <div className="border border-primary/30 rounded-xl overflow-hidden">
      <button className="w-full flex items-center gap-3 px-4 py-3 bg-primary/5 hover:bg-primary/10 transition-colors text-left" onClick={() => setOpen(o => !o)}>
        <Shield size={16} className="text-primary" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">Step Autorizzativi Consigliati</p>
          <p className="text-xs text-muted-foreground">{steps.length} azioni da intraprendere</p>
        </div>
        {open ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
      </button>
      {open && (
        <div className="p-3 space-y-2 border-t border-primary/20">
          {steps.map((s, i) => (
            <div key={s.id} className="flex gap-3 p-2.5 bg-card border border-border rounded-lg">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">{s.titolo}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{s.descrizione}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[9px] text-muted-foreground italic">{s.normativa}</span>
                  <span className="text-[9px] text-primary font-medium">→ {s.ente}</span>
                </div>
              </div>
              {s.obbligatorio && (
                <span className="text-[8px] font-bold text-danger bg-danger-light rounded px-1.5 py-0.5 h-fit flex-shrink-0">OBB.</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface ConstraintPanelProps {
  analisi: AnalisiVincolistica;
}

export function ConstraintPanel({ analisi }: ConstraintPanelProps) {
  const rc = rischioConfig[analisi.rischioComplessivo];
  const cc = CLASSIFICAZIONE_CONFIG[analisi.classificazioneIdoneita];
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
  const totEscludenti = allVincoli.filter(v => v.presenza === "presente" && v.criticita === "escludente").length;
  const totCondizionanti = allVincoli.filter(v => v.presenza === "presente" && v.criticita === "condizionante").length;

  const hasPugliaOlives = analisi.vincoliAgricoli.some(v => v.id === "ag_06");

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-foreground text-sm">Risultato Analisi Vincolistica</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {analisi.particelle.length} particella/e · {analisi.dataAnalisi}
            </p>
          </div>
          <FileText size={16} className="text-muted-foreground mt-0.5" />
        </div>

        {/* Classificazione Idoneità */}
        <div className={cn("p-3 rounded-lg border mb-3", cc.bg, analisi.classificazioneIdoneita === "non_idoneo" ? "border-danger/30" : analisi.classificazioneIdoneita === "condizionato" ? "border-amber/30" : "border-safe/30")}>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={14} className={cc.color} />
            <span className={cn("text-sm font-bold", cc.color)}>{cc.label}</span>
          </div>
          <p className="text-[10px] text-muted-foreground">{cc.description}</p>
        </div>

        {/* Rischio complessivo */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">Rischio autorizzativo</span>
            <span className={cn("text-xs font-bold", rc.color)}>{rc.label}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className={cn("h-full rounded-full transition-all duration-700", rc.bg)} style={{ width: `${rc.bar}%` }} />
          </div>
        </div>

        {/* Summary grid */}
        <div className="grid grid-cols-4 gap-1.5">
          <div className="text-center bg-danger-light border border-danger/20 rounded-lg p-1.5">
            <p className="text-sm font-bold text-danger">{totEscludenti}</p>
            <p className="text-[9px] text-muted-foreground leading-tight">🔴 Esclu-<br/>denti</p>
          </div>
          <div className="text-center bg-amber-light border border-amber/20 rounded-lg p-1.5">
            <p className="text-sm font-bold text-amber">{totCondizionanti}</p>
            <p className="text-[9px] text-muted-foreground leading-tight">🟠 Condi-<br/>zionanti</p>
          </div>
          <div className="text-center bg-muted/40 border border-border rounded-lg p-1.5">
            <p className="text-sm font-bold text-foreground">{totPresenti}</p>
            <p className="text-[9px] text-muted-foreground leading-tight">Vincoli<br/>presenti</p>
          </div>
          <div className="text-center bg-safe-light border border-safe/20 rounded-lg p-1.5">
            <p className="text-sm font-bold text-safe">{allVincoli.length - totPresenti - totVerifica}</p>
            <p className="text-[9px] text-muted-foreground leading-tight">Assenti<br/>/ OK</p>
          </div>
        </div>

        {hasPugliaOlives && (
          <div className="mt-3 flex items-start gap-2 p-2.5 bg-amber-light border border-amber/40 rounded-lg">
            <span className="text-base">🌳</span>
            <p className="text-xs text-amber-foreground font-medium">Area in Puglia: verifica olivi monumentali (L. 168/2017)</p>
          </div>
        )}

        {/* AUL / AUN */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="bg-muted/40 border border-border rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-0.5">AUL (Lorda)</p>
            <p className="text-lg font-bold text-foreground">{analisi.areaUtileLordaHa.toFixed(2)} <span className="text-xs font-normal text-muted-foreground">ha</span></p>
          </div>
          <div className={cn("border rounded-lg p-3 text-center", analisi.areaUtileNettaHa < analisi.areaUtileLordaHa * 0.5 ? "bg-danger-light border-danger/20" : "bg-safe-light border-safe/20")}>
            <p className="text-xs text-muted-foreground mb-0.5">AUN (Netta)</p>
            <p className={cn("text-lg font-bold", analisi.areaUtileNettaHa < analisi.areaUtileLordaHa * 0.5 ? "text-danger" : "text-safe")}>
              {analisi.areaUtileNettaHa.toFixed(2)} <span className="text-xs font-normal text-muted-foreground">ha</span>
            </p>
            <p className="text-[10px] text-muted-foreground">
              {analisi.areaUtileLordaHa > 0 ? `${((analisi.areaUtileNettaHa / analisi.areaUtileLordaHa) * 100).toFixed(0)}% dell'AUL` : "–"}
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-2.5">{allVincoli.length} controlli · {analisi.stepAutorizzativi.length} step autorizzativi</p>
      </div>

      {/* Step Autorizzativi */}
      <StepAutorizzativiSection steps={analisi.stepAutorizzativi} />

      {/* Sezioni vincoli */}
      <CategorySection title="Beni Culturali e Archeologia" icon={<span className="text-base">🏛️</span>} items={analisi.vincoliCulturali} defaultOpen={true} />
      <CategorySection title="Vincoli Paesaggistici" icon={<span className="text-base">🌄</span>} items={analisi.vincoliPaesaggistici} defaultOpen={true} />
      <CategorySection title="Vincoli Idrogeologici" icon={<span className="text-base">⛰️</span>} items={analisi.vincoliIdrogeologici} />
      <CategorySection title="Rischio Idrico (PAI/PGRA)" icon={<span className="text-base">💧</span>} items={analisi.rischioIdrico} />
      <CategorySection title="Vincoli Ambientali e Natura 2000" icon={<span className="text-base">🌿</span>} items={analisi.vincoliAmbientali} />
      <CategorySection title="Servizi e Reti (servitù)" icon={<span className="text-base">⚡</span>} items={analisi.serviziReti} />
      <CategorySection title="Urbanistica e Altri Vincoli" icon={<span className="text-base">📋</span>} items={analisi.altriVincoli} />

      <div className="pt-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">Vincoli specifici agrivoltaico</p>
      </div>
      <CategorySection title="Vincoli Agricoli" icon={<span className="text-base">🌾</span>} items={analisi.vincoliAgricoli} defaultOpen={true} />
      <CategorySection title="Aree Idonee FV/Agrivoltaico" icon={<span className="text-base">☀️</span>} items={analisi.areeIdonee} defaultOpen={true} />
      <CategorySection title="Normativa Agrivoltaico (DM 22/2022)" icon={<span className="text-base">📐</span>} items={analisi.normativaAgrivoltaico} />
      <CategorySection title="Compatibilità Connessione Rete" icon={<span className="text-base">🔌</span>} items={analisi.compatibilitaConnessione} />
      <CategorySection title="Vincoli Catastali e Proprietà" icon={<span className="text-base">📜</span>} items={analisi.vincoliCatastali} />
      <CategorySection title="Vincoli Forestali e Incendi" icon={<span className="text-base">🌲</span>} items={analisi.vincoliForestali} />
      <CategorySection title="Vincoli Sismici" icon={<span className="text-base">〰️</span>} items={analisi.vincoliSismici} />
      <CategorySection title="Vincoli Militari e Radar" icon={<span className="text-base">📡</span>} items={analisi.vincoliMilitariRadar} />
    </div>
  );
}
