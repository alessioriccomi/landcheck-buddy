import { useState, useCallback, useEffect } from "react";
import { Map, Download, Loader2, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LegendPanel } from "@/components/LegendPanel";
import { AnalysisPanel } from "@/components/AnalysisPanel";
import { MapView } from "@/components/MapView";
import { AuthDialog } from "@/components/AuthDialog";
import { WmsLegend } from "@/components/WmsLegend";
import { ALL_LAYERS, LAYER_GROUPS } from "@/lib/layerDefinitions";
import { getMergedLayers, getMergedGroups } from "@/lib/settingsLayers";
import { useAuth } from "@/hooks/useAuth";
import { useCustomConstraints } from "@/hooks/useCustomConstraints";
import { useSavedAnalyses, SavedAnalysis } from "@/hooks/useSavedAnalyses";
import { useProfile } from "@/hooks/useProfile";
import { Particella, AnalisiVincolistica } from "@/types/vincoli";
import { runAnalisiVincolistica } from "@/lib/analisiVincoli";
import { exportReportPDF } from "@/lib/exportPDF";
import { cn } from "@/lib/utils";
import { probeAllServers, type ServerHealth } from "@/lib/wmsHealthProbe";

type Step = "input" | "analyzing" | "results";

export default function Index() {
  const [step, setStep] = useState<Step>("input");
  const [particelle, setParticelle] = useState<Particella[]>([]);
  const [analisi, setAnalisi] = useState<AnalisiVincolistica | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [selectedParcelIds, setSelectedParcelIds] = useState<string[]>([]);
  const [authOpen, setAuthOpen] = useState(false);

  // Use merged layers (built-in + custom from settings, minus deleted)
  const mergedLayers = getMergedLayers();
  const mergedGroups = getMergedGroups();

  // Layer state
  const [layerState, setLayerState] = useState<Record<string, boolean>>(
    Object.fromEntries(mergedLayers.map(l => [l.id, l.defaultOn]))
  );
  const [layerOpacity, setLayerOpacity] = useState<Record<string, number>>(
    Object.fromEntries(mergedLayers.map(l => [l.id, l.opacity ?? 0.5]))
  );

  // Panel visibility
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  // WMS server health statuses
  const [serverStatuses, setServerStatuses] = useState<Record<string, ServerHealth>>({});

  // Probe WMS servers on mount
  useEffect(() => {
    const urls: string[] = [];
    for (const l of mergedLayers) {
      if (l.arcgisUrl) urls.push(l.arcgisUrl);
      if (l.wmsUrl) urls.push(l.wmsUrl);
      if (l.fallbackUrls) urls.push(...l.fallbackUrls);
    }
    probeAllServers(urls, setServerStatuses);
  }, []);

  const { user, isAuthenticated, signOut } = useAuth();
  const { constraints, addConstraint, toggleConstraint, deleteConstraint } = useCustomConstraints(user?.id);
  const { analyses: savedAnalyses, loading: savedAnalysesLoading, saveAnalysis, deleteAnalysis } = useSavedAnalyses(user?.id);
  const { profile, loading: profileLoading, updateProfile } = useProfile(user?.id);

  const handleLoadAnalysis = useCallback((a: SavedAnalysis) => {
    setParticelle(a.particelle);
    setAnalisi(a.results);
    setStep("results");
  }, []);

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

  const handleToggleLayer = useCallback((id: string) => {
    setLayerState(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleSetOpacity = useCallback((id: string, opacity: number) => {
    setLayerOpacity(prev => ({ ...prev, [id]: opacity }));
  }, []);

  const handleToggleAllInGroup = useCallback((groupId: string, on: boolean) => {
    const group = mergedGroups.find(g => g.id === groupId);
    if (!group) return;
    setLayerState(prev => {
      const next = { ...prev };
      for (const l of group.layers) next[l.id] = on;
      return next;
    });
  }, [mergedGroups]);

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
    setPdfLoading(true);
    try {
      exportReportPDF({ ...analisi, particelle });
    } finally {
      setPdfLoading(false);
    }
  };

  const activeCustomConstraints = constraints.filter(c => c.active);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />

      {/* Header */}
      <header className="flex-shrink-0 h-12 flex items-center px-4 gap-3 border-b border-border bg-primary text-primary-foreground z-10">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "hsl(var(--amber, 38 92% 50%))" }}>
            <Map size={13} className="text-white" />
          </div>
          <div>
            <h1 className="text-xs font-bold tracking-tight leading-none">GeoVincoli</h1>
            <p className="text-[9px] text-primary-foreground/60 leading-none mt-0.5">Analisi Vincolistica Terreni</p>
          </div>
        </div>
        <div className="flex-1" />
        <span className="hidden md:block text-[10px] text-primary-foreground/50">
          D.Lgs. 42/2004 · D.Lgs. 152/2006 · R.D. 3267/1923
        </span>
        {step === "results" && analisi && (
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportPDF}
              disabled={pdfLoading}
              className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-light h-7 gap-1 text-[10px] border border-primary-foreground/20"
            >
              {pdfLoading ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
              PDF
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-light h-7 gap-1 text-[10px]"
            >
              <RotateCcw size={11} />
              Nuova
            </Button>
          </div>
        )}
      </header>

      {/* 3-column body */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* LEFT — Legend Panel */}
        <aside
          className={cn(
            "flex-shrink-0 flex flex-col border-r border-border bg-card transition-all duration-300 overflow-hidden",
            leftOpen ? "w-[280px]" : "w-0"
          )}
        >
          <div className="min-w-[280px] h-full flex flex-col overflow-hidden">
            <LegendPanel
              layerState={layerState}
              layerOpacity={layerOpacity}
              onToggleLayer={handleToggleLayer}
              onSetOpacity={handleSetOpacity}
              onToggleAllInGroup={handleToggleAllInGroup}
              serverStatuses={serverStatuses}
              onRefreshStatuses={() => {
                const urls: string[] = [];
                for (const l of mergedLayers) {
                  if (l.arcgisUrl) urls.push(l.arcgisUrl);
                  if (l.wmsUrl) urls.push(l.wmsUrl);
                }
                probeAllServers(urls, setServerStatuses);
              }}
            />
          </div>
        </aside>

        {/* Left toggle */}
        <button
          onClick={() => setLeftOpen(o => !o)}
          className="absolute top-1/2 -translate-y-1/2 z-20 w-4 h-8 bg-card border border-border rounded-r-md flex items-center justify-center shadow-md hover:bg-muted transition-colors"
          style={{ left: leftOpen ? "280px" : "0px" }}
        >
          {leftOpen ? <ChevronLeft size={10} className="text-muted-foreground" /> : <ChevronRight size={10} className="text-muted-foreground" />}
        </button>

        {/* CENTER — Map */}
        <main className="flex-1 relative overflow-hidden">
          <MapView
            particelle={particelle}
            activeLayers={layerState}
            layerOpacity={layerOpacity}
            customConstraints={activeCustomConstraints}
            onParcelAreaUpdate={handleParcelAreaUpdate}
            selectedParcelIds={selectedParcelIds}
            onToggleSelectParcel={handleToggleSelectParcel}
            onClearSelection={handleClearSelection}
            onAddParticella={(p) => {
              if (step === "input") setParticelle(prev => [...prev, p]);
            }}
            serverStatuses={serverStatuses}
          />
          <WmsLegend activeLayers={layerState} />
        </main>

        {/* Right toggle */}
        <button
          onClick={() => setRightOpen(o => !o)}
          className="absolute top-1/2 -translate-y-1/2 z-20 w-4 h-8 bg-card border border-border rounded-l-md flex items-center justify-center shadow-md hover:bg-muted transition-colors"
          style={{ right: rightOpen ? "320px" : "0px" }}
        >
          {rightOpen ? <ChevronRight size={10} className="text-muted-foreground" /> : <ChevronLeft size={10} className="text-muted-foreground" />}
        </button>

        {/* RIGHT — Analysis Panel */}
        <aside
          className={cn(
            "flex-shrink-0 flex flex-col border-l border-border bg-card transition-all duration-300 overflow-hidden",
            rightOpen ? "w-[320px]" : "w-0"
          )}
        >
          <div className="min-w-[320px] h-full">
            <AnalysisPanel
              step={step}
              particelle={particelle}
              analisi={analisi}
              selectedParcelIds={selectedParcelIds}
              pdfLoading={pdfLoading}
              isAuthenticated={isAuthenticated}
              user={user}
              constraints={constraints}
              savedAnalyses={savedAnalyses}
              savedAnalysesLoading={savedAnalysesLoading}
              profile={profile}
              profileLoading={profileLoading}
              onSetParticelle={setParticelle}
              onToggleSelectParcel={handleToggleSelectParcel}
              onClearSelection={handleClearSelection}
              onAnalisi={handleAnalisi}
              onReset={handleReset}
              onExportPDF={handleExportPDF}
              onAuthOpen={() => setAuthOpen(true)}
              onSignOut={signOut}
              onAddConstraint={addConstraint}
              onToggleConstraint={toggleConstraint}
              onDeleteConstraint={deleteConstraint}
              onSaveAnalysis={saveAnalysis}
              onDeleteAnalysis={deleteAnalysis}
              onLoadAnalysis={handleLoadAnalysis}
              onUpdateProfile={updateProfile}
            />
          </div>
        </aside>
      </div>

      {/* Footer */}
      <footer className="flex-shrink-0 h-6 flex items-center justify-center border-t border-border bg-muted/50">
        <p className="text-[8px] text-muted-foreground">
          Dati da WMS pubblici italiani. Analisi a scopo orientativo. Verificare sempre con gli enti competenti prima di avviare iter autorizzativi.
        </p>
      </footer>
    </div>
  );
}
