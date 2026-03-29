import { useState } from "react";
import { Save, FolderOpen, Trash2, Calendar, Loader2 } from "lucide-react";
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
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!saveName.trim() || !currentAnalisi) return;
    setSaving(true);
    await onSave(saveName.trim(), currentParticelle, currentAnalisi);
    setSaveName("");
    setSaving(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="text-center py-6">
        <FolderOpen size={20} className="mx-auto mb-2 text-muted-foreground/50" />
        <p className="text-[10px] text-muted-foreground mb-2">Accedi per salvare e caricare le tue analisi</p>
        <Button variant="outline" size="sm" onClick={onAuthOpen} className="h-7 text-[10px]">Accedi</Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Save current */}
      {currentAnalisi && (
        <div className="space-y-1.5 pb-2 border-b border-border">
          <p className="text-[10px] font-semibold text-foreground">Salva analisi corrente</p>
          <div className="flex gap-1.5">
            <Input
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              placeholder="Nome analisi..."
              className="h-7 text-[10px]"
            />
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!saveName.trim() || saving}
              className="h-7 text-[10px] gap-1 flex-shrink-0"
            >
              {saving ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
              Salva
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      <div>
        <p className="text-[10px] font-semibold text-foreground mb-1.5">Analisi salvate</p>
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 size={16} className="animate-spin text-muted-foreground" />
          </div>
        ) : analyses.length === 0 ? (
          <p className="text-[10px] text-muted-foreground text-center py-4 bg-muted/30 rounded-lg">
            Nessuna analisi salvata
          </p>
        ) : (
          <div className="space-y-1.5">
            {analyses.map(a => (
              <div key={a.id} className="flex items-center gap-2 bg-card border border-border rounded-md px-2 py-1.5 group">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-medium truncate text-foreground">{a.name}</p>
                  <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                    <Calendar size={8} />
                    <span>{new Date(a.updated_at).toLocaleDateString("it-IT")}</span>
                    <span>· {a.particelle.length} part.</span>
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
