import { useState } from "react";
import { Save, FolderOpen, Trash2, Calendar, Loader2, FileText, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SavedAnalysis } from "@/hooks/useSavedAnalyses";
import { AnalisiVincolistica, Particella } from "@/types/vincoli";

interface SavedAnalysesPanelProps {
  analyses: SavedAnalysis[];
  loading: boolean;
  isAuthenticated: boolean;
  currentAnalisi: AnalisiVincolistica | null;
  currentParticelle: Particella[];
  onSave: (name: string, particelle: Particella[], results: AnalisiVincolistica, desc?: string) => Promise<{ error: any }>;
  onDelete: (id: string) => void;
  onLoad: (analysis: SavedAnalysis) => void;
  onAuthOpen: () => void;
}

export function SavedAnalysesPanel({
  analyses, loading, isAuthenticated, currentAnalisi, currentParticelle,
  onSave, onDelete, onLoad, onAuthOpen,
}: SavedAnalysesPanelProps) {
  const [saveName, setSaveName] = useState("");
  const [saveDesc, setSaveDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const canSave = currentParticelle.length > 0;
  const hasAnalysis = !!currentAnalisi;

  const handleSave = async () => {
    if (!saveName.trim() || !canSave) return;
    setSaving(true);
    const emptyVincoli: any[] = [];
    const results = currentAnalisi ?? ({
      particelle: currentParticelle,
      dataAnalisi: new Date().toISOString(),
      vincoliCulturali: emptyVincoli,
      vincoliPaesaggistici: emptyVincoli,
      vincoliIdrogeologici: emptyVincoli,
      vincoliAmbientali: emptyVincoli,
      rischioIdrico: emptyVincoli,
      serviziReti: emptyVincoli,
      altriVincoli: emptyVincoli,
      vincoliAgricoli: emptyVincoli,
      vincoliMilitariRadar: emptyVincoli,
      vincoliForestali: emptyVincoli,
      vincoliSismici: emptyVincoli,
      vincoliCatastali: emptyVincoli,
      compatibilitaConnessione: emptyVincoli,
      areeIdonee: emptyVincoli,
      normativaAgrivoltaico: emptyVincoli,
      rischioComplessivo: "nessuno",
      areaUtileLordaHa: 0,
      areaUtileNettaHa: 0,
      classificazioneIdoneita: "potenzialmente_idoneo",
      stepAutorizzativi: emptyVincoli,
    } as AnalisiVincolistica);
    await onSave(saveName.trim(), currentParticelle, results, saveDesc.trim() || undefined);
    setSaveName("");
    setSaveDesc("");
    setSaving(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="text-center py-6">
        <FolderOpen size={20} className="mx-auto mb-2 text-muted-foreground/50" />
        <p className="text-[10px] text-muted-foreground mb-2">Accedi per salvare e caricare i tuoi progetti</p>
        <Button variant="outline" size="sm" onClick={onAuthOpen} className="h-7 text-[10px]">Accedi</Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Save current project */}
      {canSave && (
        <div className="space-y-1.5 pb-2 border-b border-border">
          <p className="text-[10px] font-semibold text-foreground">
            Salva progetto {hasAnalysis ? "(con analisi)" : "(solo particelle)"}
          </p>
          <Input
            value={saveName}
            onChange={e => setSaveName(e.target.value)}
            placeholder="Nome progetto..."
            className="h-7 text-[10px]"
          />
          <Input
            value={saveDesc}
            onChange={e => setSaveDesc(e.target.value)}
            placeholder="Descrizione (opzionale)..."
            className="h-7 text-[10px]"
          />
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!saveName.trim() || saving}
            className="w-full h-7 text-[10px] gap-1"
          >
            {saving ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
            Salva {hasAnalysis ? "analisi" : "progetto"}
          </Button>
        </div>
      )}

      {/* List */}
      <div>
        <p className="text-[10px] font-semibold text-foreground mb-1.5">Progetti salvati</p>
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 size={16} className="animate-spin text-muted-foreground" />
          </div>
        ) : analyses.length === 0 ? (
          <p className="text-[10px] text-muted-foreground text-center py-4 bg-muted/30 rounded-lg">
            Nessun progetto salvato
          </p>
        ) : (
          <div className="space-y-1.5">
            {analyses.map(a => {
              const hasResults = a.results?.vincoliCulturali?.length > 0 || a.results?.vincoliPaesaggistici?.length > 0;
              return (
                <div key={a.id} className="flex items-center gap-2 bg-card border border-border rounded-md px-2 py-1.5 group">
                  <div className="flex-shrink-0">
                    {hasResults
                      ? <BarChart3 size={12} className="text-primary" />
                      : <FileText size={12} className="text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium truncate text-foreground">{a.name}</p>
                    <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                      <Calendar size={8} />
                      <span>{new Date(a.updated_at).toLocaleDateString("it-IT")}</span>
                      <span>· {a.particelle.length} part.</span>
                      {a.description && <span className="truncate">· {a.description}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onLoad(a)}
                      className="h-6 w-6 p-0"
                      title="Carica"
                    >
                      <FolderOpen size={11} className="text-primary" />
                    </Button>
                    <button
                      onClick={() => onDelete(a.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all"
                      title="Elimina"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
