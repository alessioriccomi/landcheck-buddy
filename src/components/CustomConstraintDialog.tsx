import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Link2, Palette } from "lucide-react";

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#0ea5e9", "#6366f1", "#a855f7", "#ec4899", "#6b7280",
];

interface CustomConstraintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; url: string; color: string; description?: string }) => Promise<{ error: any }>;
}

export function CustomConstraintDialog({ open, onOpenChange, onSubmit }: CustomConstraintDialogProps) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setName("");
    setUrl("");
    setColor(PRESET_COLORS[0]);
    setDescription("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !url) return;

    setLoading(true);
    const { error } = await onSubmit({ name, url, color, description: description || undefined });
    setLoading(false);

    if (!error) {
      reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-lg">Aggiungi vincolo personalizzato</DialogTitle>
          <DialogDescription className="text-xs">
            Inserisci l'URL di un servizio WMS o ArcGIS MapServer per visualizzarlo sulla mappa
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-xs">Nome vincolo *</Label>
            <Input
              id="name"
              placeholder="es. Vincolo Regionale XYZ"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 text-sm"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url" className="text-xs">URL servizio WMS/ArcGIS *</Label>
            <div className="relative">
              <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="url"
                type="url"
                placeholder="https://example.com/wms?..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="pl-9 h-9 text-sm font-mono"
                required
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              Formati supportati: WMS GetMap, ArcGIS MapServer/export
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1.5">
              <Palette size={12} />
              Colore
            </Label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-md border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? "hsl(var(--primary))" : "transparent",
                  }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="desc" className="text-xs">Descrizione (opzionale)</Label>
            <Input
              id="desc"
              placeholder="Note aggiuntive..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-9 text-sm">
              Annulla
            </Button>
            <Button type="submit" className="h-9 text-sm" disabled={loading || !name || !url}>
              {loading && <Loader2 size={14} className="animate-spin mr-2" />}
              Aggiungi vincolo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
