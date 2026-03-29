import { useState } from "react";
import {
  FileSearch, AlertCircle, Download, RotateCcw, Loader2,
  Search, LogIn, Plus, Trash2, Eye, EyeOff, LogOut, User, FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ParcelInput } from "@/components/ParcelInput";
import { ConstraintPanel } from "@/components/ConstraintPanel";
import { CustomConstraintDialog } from "@/components/CustomConstraintDialog";
import { CDUPanel } from "@/components/CDUPanel";
import { exportAnalisiExcel } from "@/lib/exportExcel";
import { Particella, AnalisiVincolistica } from "@/types/vincoli";

interface AnalysisPanelProps {
  step: "input" | "analyzing" | "results";
  particelle: Particella[];
  analisi: AnalisiVincolistica | null;
  selectedParcelIds: string[];
  pdfLoading: boolean;
  isAuthenticated: boolean;
  user: { id: string; email?: string } | null;
  constraints: Array<{ id: string; name: string; description?: string | null; color: string; active: boolean; url: string }>;
  onSetParticelle: (p: Particella[]) => void;
  onToggleSelectParcel: (id: string) => void;
  onClearSelection: () => void;
  onAnalisi: () => void;
  onReset: () => void;
  onExportPDF: () => void;
  onAuthOpen: () => void;
  onSignOut: () => void;
  onAddConstraint: (data: { name: string; url: string; color: string; description?: string }) => Promise<{ error: any }>;
  onToggleConstraint: (id: string, active: boolean) => void;
  onDeleteConstraint: (id: string) => void;
}

export function AnalysisPanel({
  step,
  particelle,
  analisi,
  selectedParcelIds,
  pdfLoading,
  isAuthenticated,
  user,
  constraints,
  onSetParticelle,
  onToggleSelectParcel,
  onClearSelection,
  onAnalisi,
  onReset,
  onExportPDF,
  onAuthOpen,
  onSignOut,
  onAddConstraint,
  onToggleConstraint,
  onDeleteConstraint,
}: AnalysisPanelProps) {
  const [constraintDialogOpen, setConstraintDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("particelle");

  return (
    <div className="flex flex-col h-full">
      <CustomConstraintDialog
        open={constraintDialogOpen}
        onOpenChange={setConstraintDialogOpen}
        onSubmit={onAddConstraint}
      />

      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-foreground">Pannello Analisi</h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {step === "results" && analisi
              ? `${analisi.particelle.length} particella/e · ${analisi.dataAnalisi}`
              : "Particelle, vincoli e risultati"}
          </p>
        </div>
        {/* Auth */}
        {isAuthenticated ? (
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <User size={11} />
              <span className="max-w-[80px] truncate hidden xl:block">{user?.email}</span>
            </div>
            <button onClick={onSignOut} className="p-1 text-muted-foreground hover:text-foreground" title="Esci">
              <LogOut size={11} />
            </button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={onAuthOpen} className="h-6 text-[10px] gap-1">
            <LogIn size={10} /> Accedi
          </Button>
        )}
      </div>

      {/* Analyzing spinner */}
      {step === "analyzing" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 py-8 text-center px-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Search size={16} className="text-primary" />
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Analisi in corso...</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Interrogazione banche dati nazionali e regionali
            </p>
          </div>
          <div className="w-full space-y-1 text-left bg-muted/30 rounded-lg p-2">
            {[
              "Catasto WFS — Agenzia delle Entrate",
              "Geoportale Nazionale — MiC/Vincoli in Rete",
              "ISPRA — PAI · Frane · Alluvioni",
              "Rete Natura 2000 — ZSC/ZPS",
              "Vincolo Idrogeologico (R.D. 3267/1923)",
              "Aree idonee FV/Agrivoltaico",
              "Vincoli agricoli — DOC · Olivi",
              "Aree non idonee regionali",
            ].map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <Loader2
                  size={9}
                  className="text-primary animate-spin flex-shrink-0"
                  style={{ animationDelay: `${i * 200}ms` }}
                />
                <span className="text-[10px] text-muted-foreground">{s}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main content with tabs */}
      {step !== "analyzing" && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="flex-shrink-0 mx-2 mt-2 h-8">
            <TabsTrigger value="particelle" className="text-[10px] flex-1">
              Particelle
            </TabsTrigger>
            {step === "results" && (
              <TabsTrigger value="risultati" className="text-[10px] flex-1">
                Risultati
              </TabsTrigger>
            )}
            <TabsTrigger value="vincoli" className="text-[10px] flex-1">
              Vincoli custom
            </TabsTrigger>
          </TabsList>

          {/* Tab: Particelle */}
          <TabsContent value="particelle" className="flex-1 overflow-y-auto p-3 space-y-3 mt-0">
            <ParcelInput
              particelle={particelle}
              onChange={onSetParticelle}
              selectedIds={selectedParcelIds}
              onToggleSelect={onToggleSelectParcel}
              onClearSelection={onClearSelection}
            />
            <div className="pt-2 border-t border-border space-y-2">
              {step === "input" && (
                <Button
                  onClick={onAnalisi}
                  disabled={particelle.length === 0}
                  className="w-full gap-2 h-9 text-xs"
                >
                  <FileSearch size={14} />
                  Avvia analisi vincolistica
                </Button>
              )}
              {step === "results" && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onExportPDF}
                    disabled={pdfLoading}
                    className="flex-1 h-8 text-xs gap-1"
                  >
                    {pdfLoading ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
                    PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onReset}
                    className="flex-1 h-8 text-xs gap-1"
                  >
                    <RotateCcw size={11} />
                    Nuova analisi
                  </Button>
                </div>
              )}
              {particelle.length === 0 && step === "input" && (
                <p className="text-[10px] text-muted-foreground text-center">
                  Aggiungi almeno una particella
                </p>
              )}
            </div>
          </TabsContent>

          {/* Tab: Risultati */}
          {step === "results" && analisi && (
            <TabsContent value="risultati" className="flex-1 overflow-y-auto p-3 space-y-3 mt-0">
              <ConstraintPanel analisi={analisi} />
              <div className="pt-2 border-t border-border">
                <div className="flex items-start gap-2 p-2 bg-amber-light border border-amber/30 rounded-lg">
                  <AlertCircle size={12} className="text-amber mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] text-amber-foreground leading-relaxed">
                    I risultati hanno carattere <strong>indicativo</strong>. Verificare presso gli enti competenti.
                  </p>
                </div>
              </div>
            </TabsContent>
          )}

          {/* Tab: Vincoli custom */}
          <TabsContent value="vincoli" className="flex-1 overflow-y-auto p-3 space-y-3 mt-0">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-foreground">Vincoli personalizzati</h3>
                <p className="text-[10px] text-muted-foreground">Layer WMS/ArcGIS aggiuntivi</p>
              </div>
              {isAuthenticated ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConstraintDialogOpen(true)}
                  className="h-6 text-[10px] gap-1"
                >
                  <Plus size={10} /> Aggiungi
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={onAuthOpen} className="h-6 text-[10px] gap-1">
                  <LogIn size={10} /> Accedi
                </Button>
              )}
            </div>

            {!isAuthenticated && (
              <div className="text-[10px] text-muted-foreground bg-muted/40 rounded-lg p-3 text-center">
                <LogIn size={14} className="mx-auto mb-1 opacity-50" />
                Accedi per aggiungere layer personalizzati
              </div>
            )}

            {isAuthenticated && constraints.length === 0 && (
              <div className="text-[10px] text-muted-foreground bg-muted/40 rounded-lg p-3 text-center">
                Nessun vincolo personalizzato.
              </div>
            )}

            {isAuthenticated && constraints.length > 0 && (
              <div className="space-y-1.5">
                {constraints.map(c => (
                  <div key={c.id} className="flex items-center gap-2 bg-card border border-border rounded-md px-2 py-1.5 group">
                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: c.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-medium truncate text-foreground">{c.name}</p>
                      {c.description && (
                        <p className="text-[9px] text-muted-foreground truncate">{c.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => onToggleConstraint(c.id, !c.active)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {c.active ? <Eye size={11} className="text-primary" /> : <EyeOff size={11} />}
                      </button>
                      <button
                        onClick={() => onDeleteConstraint(c.id)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
