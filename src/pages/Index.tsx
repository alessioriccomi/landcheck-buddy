import { useState, useCallback } from "react";
import {
  Search, FileSearch, RotateCcw, AlertCircle, ChevronLeft, ChevronRight,
  Loader2, Map, Download, LogIn, LogOut, User, Plus, Trash2, Eye, EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ParcelInput } from "@/components/ParcelInput";
import { ConstraintPanel } from "@/components/ConstraintPanel";
import { LayerControl, ALL_LAYERS } from "@/components/LayerControl";
import { WmsLegend } from "@/components/WmsLegend";
import { MapView } from "@/components/MapView";
import { AuthDialog } from "@/components/AuthDialog";
import { CustomConstraintDialog } from "@/components/CustomConstraintDialog";
import { useAuth } from "@/hooks/useAuth";
import { useCustomConstraints } from "@/hooks/useCustomConstraints";
import { Particella, AnalisiVincolistica } from "@/types/vincoli";
import { runAnalisiVincolistica } from "@/lib/analisiVincoli";
import { exportReportPDF } from "@/lib/exportPDF";
import { cn } from "@/lib/utils";

type Step = "input" | "analyzing" | "results";

export default function Index() {
  const [step, setStep] = useState<Step>("input");
  const [particelle, setParticelle] = useState<Particella[]>([]);
  const [analisi, setAnalisi] = useState<AnalisiVincolistica | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [selectedParcelIds, setSelectedParcelIds] = useState<string[]>([]);
  const [layerState, setLayerState] = useState<Record<string, boolean>>(
    Object.fromEntries(ALL_LAYERS.map(l => [l.id, l.defaultOn]))
  );
  const [authOpen, setAuthOpen] = useState(false);
  const [constraintDialogOpen, setConstraintDialogOpen] = useState(false);

  const { user, isAuthenticated, signOut } = useAuth();
  const { constraints, addConstraint, toggleConstraint, deleteConstraint } = useCustomConstraints(user?.id);

  const handleToggleSelectParcel = useCallback((id: string) => {
    setSelectedParcelIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedParcelIds([]);
  }, []);

  const handleParcelAreaUpdate = useCallback((id: string, mq: number) => {
    setParticelle(prev =>
      prev.map(p => p.id === id ? { ...p, superficieMq: mq } : p)
    );
  }, []);

  const handleAnalisi = async () => {
    if (particelle.length === 0) return;
    setStep("analyzing");
    try {
      const result = await runAnalisiVincolistica(particelle);
      setAnalisi(result);
      setStep("results");
    } catch {
      setStep("input");
    }
  };

  const handleReset = () => {
    setStep("input");
    setAnalisi(null);
    setParticelle([]);
  };

  const handleExportPDF = async () => {
    if (!analisi) return;
    const analisiWithAreas: AnalisiVincolistica = { ...analisi, particelle };
    setPdfLoading(true);
    try {
      exportReportPDF(analisiWithAreas);
    } finally {
      setPdfLoading(false);
    }
  };

  // Custom constraints active in map (only active ones)
  const activeCustomConstraints = constraints.filter(c => c.active);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
      {/* Dialogs */}
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
      <CustomConstraintDialog
        open={constraintDialogOpen}
        onOpenChange={setConstraintDialogOpen}
        onSubmit={addConstraint}
      />

      {/* Header */}
      <header className="flex-shrink-0 h-14 flex items-center px-4 gap-3 border-b border-border bg-primary text-primary-foreground z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "hsl(var(--amber, 38 92% 50%))" }}>
            <Map size={15} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight leading-none">GeoVincoli</h1>
            <p className="text-xs text-primary-foreground/60 leading-none mt-0.5">Analisi Vincolistica Terreni</p>
          </div>
        </div>
        <div className="flex-1" />
        <span className="hidden sm:block text-xs text-primary-foreground/60">
          D.Lgs. 42/2004 · D.Lgs. 152/2006 · R.D. 3267/1923
        </span>
        {step === "results" && analisi && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportPDF}
              disabled={pdfLoading}
              className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-light h-8 gap-1.5 text-xs border border-primary-foreground/20"
            >
              {pdfLoading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              Esporta PDF
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-light h-8 gap-1.5 text-xs"
            >
              <RotateCcw size={13} />
              Nuova analisi
            </Button>
          </div>
        )}

        {/* Auth button */}
        {isAuthenticated ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-primary-foreground/70">
              <User size={13} />
              <span className="hidden md:block max-w-[120px] truncate">{user?.email}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut()}
              className="text-primary-foreground/70 hover:text-primary-foreground h-8 gap-1 text-xs"
              title="Esci"
            >
              <LogOut size={13} />
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAuthOpen(true)}
            className="text-primary-foreground/80 hover:text-primary-foreground h-8 gap-1.5 text-xs border border-primary-foreground/20"
          >
            <LogIn size={13} />
            Accedi
          </Button>
        )}
      </header>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* Sidebar */}
        <aside
          className={cn(
            "flex-shrink-0 flex flex-col border-r border-border bg-card transition-all duration-300 overflow-hidden",
            sidebarOpen ? "w-80" : "w-0"
          )}
        >
          <div className="flex-1 overflow-y-auto p-4 min-w-80 space-y-4">
            {step === "input" && (
              <>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Particelle catastali</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Inserisci le particelle da analizzare. Puoi aggiungere terreni di Comuni diversi.
                  </p>
                </div>
                <ParcelInput
                  particelle={particelle}
                  onChange={setParticelle}
                  selectedIds={selectedParcelIds}
                  onToggleSelect={handleToggleSelectParcel}
                  onClearSelection={handleClearSelection}
                />
                <div className="pt-2 border-t border-border">
                  <Button
                    onClick={handleAnalisi}
                    disabled={particelle.length === 0}
                    className="w-full gap-2"
                  >
                    <FileSearch size={15} />
                    Avvia analisi vincolistica
                  </Button>
                  {particelle.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Aggiungi almeno una particella
                    </p>
                  )}
                </div>

                {/* Vincoli personalizzati */}
                <div className="pt-2 border-t border-border">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">Vincoli personalizzati</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">Layer WMS/ArcGIS aggiuntivi</p>
                    </div>
                    {isAuthenticated ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConstraintDialogOpen(true)}
                        className="h-7 text-xs gap-1 flex-shrink-0"
                      >
                        <Plus size={11} />
                        Aggiungi
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAuthOpen(true)}
                        className="h-7 text-xs text-muted-foreground gap-1"
                        title="Accedi per aggiungere vincoli personalizzati"
                      >
                        <LogIn size={11} />
                        Accedi
                      </Button>
                    )}
                  </div>

                  {!isAuthenticated && (
                    <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3 text-center">
                      <LogIn size={16} className="mx-auto mb-1 opacity-50" />
                      Accedi per aggiungere e salvare<br />layer vincolistici personalizzati
                    </div>
                  )}

                  {isAuthenticated && constraints.length === 0 && (
                    <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3 text-center">
                      Nessun vincolo personalizzato.<br />Aggiungi un URL WMS o ArcGIS.
                    </div>
                  )}

                  {isAuthenticated && constraints.length > 0 && (
                    <div className="space-y-1.5">
                      {constraints.map(c => (
                        <div
                          key={c.id}
                          className="flex items-center gap-2 bg-card border border-border rounded-md px-2.5 py-2 group"
                        >
                          <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: c.color }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate text-foreground">{c.name}</p>
                            {c.description && (
                              <p className="text-[10px] text-muted-foreground truncate">{c.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => toggleConstraint(c.id, !c.active)}
                              className="text-muted-foreground hover:text-foreground transition-colors"
                              title={c.active ? "Nascondi layer" : "Mostra layer"}
                            >
                              {c.active
                                ? <Eye size={12} className="text-primary" />
                                : <EyeOff size={12} />}
                            </button>
                            <button
                              onClick={() => deleteConstraint(c.id)}
                              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                              title="Elimina vincolo"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {step === "analyzing" && (
              <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                <div className="relative">
                  <div className="w-14 h-14 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Search size={18} className="text-primary" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Analisi in corso...</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Interrogazione banche dati<br />nazionali e regionali
                  </p>
                </div>
                <div className="w-full space-y-1.5 text-left bg-muted/30 rounded-lg p-3">
                  {[
                    "Catasto WFS — Agenzia delle Entrate",
                    "Geoportale Nazionale — MiC/Vincoli in Rete",
                    "ISPRA — PAI · Frane · Alluvioni (PGRA)",
                    "Rete Natura 2000 — ZSC/ZPS (MASE)",
                    "Catasto Vincolo Idrogeologico (R.D. 3267/1923)",
                    "Aree idonee FV/Agrivoltaico (D.Lgs. 199/2021)",
                    "Vincoli agricoli — LCC · DOC · Olivi monumentali",
                    "Aree non idonee regionali — art. 20",
                    "Normativa agrivoltaico DM 22/2022 (GSE)",
                    "Connessione rete — Terna/Distributori",
                    "Militari/Radar — ENAC/ENAV · Difesa",
                    "Usi civici · Catasto · Proprietà",
                    "Vincoli forestali · Sismici · Servitù reti",
                  ].map((s, i) => (
                    <div key={s} className="flex items-center gap-2">
                      <Loader2
                        size={10}
                        className="text-primary animate-spin flex-shrink-0"
                        style={{ animationDelay: `${i * 200}ms` }}
                      />
                      <span className="text-xs text-muted-foreground">{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === "results" && analisi && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Analisi vincolistica</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {analisi.particelle.length} particella/e · {analisi.dataAnalisi}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportPDF}
                    disabled={pdfLoading}
                    className="h-7 text-xs gap-1 flex-shrink-0"
                  >
                    {pdfLoading
                      ? <Loader2 size={11} className="animate-spin" />
                      : <Download size={11} />}
                    PDF
                  </Button>
                </div>
                <ConstraintPanel analisi={analisi} />
                <div className="pt-2 border-t border-border">
                  <div className="flex items-start gap-2 p-3 bg-amber-light border border-amber/30 rounded-lg">
                    <AlertCircle size={14} className="text-amber mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-foreground leading-relaxed">
                      I risultati hanno carattere <strong>indicativo</strong>. È necessario verificare presso gli enti competenti e consultare un professionista abilitato.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </aside>

        {/* Sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(o => !o)}
          className="absolute top-1/2 -translate-y-1/2 z-20 w-5 h-10 bg-card border border-border rounded-r-lg flex items-center justify-center shadow-md hover:bg-muted transition-colors"
          style={{ left: sidebarOpen ? "320px" : "0px" }}
        >
          {sidebarOpen
            ? <ChevronLeft size={12} className="text-muted-foreground" />
            : <ChevronRight size={12} className="text-muted-foreground" />}
        </button>

        {/* Map area */}
        <main className="flex-1 relative overflow-hidden">
          <MapView
            particelle={particelle}
            activeLayers={layerState}
            customConstraints={activeCustomConstraints}
            onParcelAreaUpdate={handleParcelAreaUpdate}
            selectedParcelIds={selectedParcelIds}
            onToggleSelectParcel={handleToggleSelectParcel}
            onClearSelection={handleClearSelection}
            onAddParticella={(p) => {
              if (step === "input") setParticelle(prev => [...prev, p]);
            }}
          />

          {/* Layer control */}
          <LayerControl onChange={(next) => setLayerState(prev => ({ ...prev, ...next }))} />

          {/* WMS Legend for active vincoli layers */}
          <WmsLegend activeLayers={layerState} />
        </main>
      </div>
    </div>
  );
}
