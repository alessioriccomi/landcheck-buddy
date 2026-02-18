import { useState } from "react";
import { Plus, Trash2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Particella, PARCEL_COLORS } from "@/types/vincoli";

interface ParcelInputProps {
  particelle: Particella[];
  onChange: (p: Particella[]) => void;
}

const EMPTY_FORM = { comune: "", provincia: "", foglio: "", particella: "", subalterno: "" };

export function ParcelInput({ particelle, onChange }: ParcelInputProps) {
  const [form, setForm] = useState(EMPTY_FORM);

  const addParticella = () => {
    if (!form.comune || !form.foglio || !form.particella) return;
    const newP: Particella = {
      id: crypto.randomUUID(),
      comune: form.comune.toUpperCase(),
      provincia: form.provincia.toUpperCase(),
      foglio: form.foglio,
      particella: form.particella,
      subalterno: form.subalterno || undefined,
      color: PARCEL_COLORS[particelle.length % PARCEL_COLORS.length],
    };
    onChange([...particelle, newP]);
    setForm(EMPTY_FORM);
  };

  const removeParticella = (id: string) => {
    onChange(particelle.filter(p => p.id !== id));
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") addParticella();
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Form inserimento */}
      <div className="bg-primary-muted/50 border border-border rounded-lg p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nuova particella</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2">
            <Label className="text-xs text-muted-foreground mb-1 block">Comune *</Label>
            <Input
              placeholder="es. Roma"
              value={form.comune}
              onChange={e => setForm(f => ({ ...f, comune: e.target.value }))}
              onKeyDown={handleKey}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Provincia</Label>
            <Input
              placeholder="es. RM"
              value={form.provincia}
              onChange={e => setForm(f => ({ ...f, provincia: e.target.value }))}
              onKeyDown={handleKey}
              className="h-8 text-sm uppercase"
              maxLength={2}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Foglio *</Label>
            <Input
              placeholder="es. 123"
              value={form.foglio}
              onChange={e => setForm(f => ({ ...f, foglio: e.target.value }))}
              onKeyDown={handleKey}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Particella *</Label>
            <Input
              placeholder="es. 456"
              value={form.particella}
              onChange={e => setForm(f => ({ ...f, particella: e.target.value }))}
              onKeyDown={handleKey}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Sub.</Label>
            <Input
              placeholder="opz."
              value={form.subalterno}
              onChange={e => setForm(f => ({ ...f, subalterno: e.target.value }))}
              onKeyDown={handleKey}
              className="h-8 text-sm"
            />
          </div>
        </div>
        <Button
          onClick={addParticella}
          disabled={!form.comune || !form.foglio || !form.particella}
          className="w-full h-8 text-xs gap-1"
          variant="default"
        >
          <Plus size={14} />
          Aggiungi particella
        </Button>
      </div>

      {/* Lista particelle inserite */}
      {particelle.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Particelle ({particelle.length})
          </p>
          {particelle.map((p, idx) => (
            <div
              key={p.id}
              className="flex items-center gap-2 bg-card border border-border rounded-md px-3 py-2 group"
            >
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: p.color }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">
                  {p.comune} {p.provincia && `(${p.provincia})`}
                </p>
                <p className="text-xs text-muted-foreground">
                  Fg. <span className="font-mono">{p.foglio}</span> / Part. <span className="font-mono">{p.particella}</span>
                  {p.subalterno && ` / Sub. ${p.subalterno}`}
                </p>
              </div>
              <button
                onClick={() => removeParticella(p.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-danger"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {particelle.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <MapPin size={28} className="text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground">
            Nessuna particella inserita.<br />Aggiungi i dati catastali per iniziare.
          </p>
        </div>
      )}
    </div>
  );
}
