import { useState } from "react";
import { Layers, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface Layer {
  id: string;
  label: string;
  color: string;
  defaultOn: boolean;
}

const LAYERS: Layer[] = [
  { id: "catasto", label: "Catasto particellare", color: "#f59e0b", defaultOn: true },
  { id: "paesaggistici", label: "Vincoli paesaggistici", color: "#8b5cf6", defaultOn: true },
  { id: "idrogeologici", label: "Pericolosità idrogeologica", color: "#3b82f6", defaultOn: false },
  { id: "natura2000", label: "Rete Natura 2000", color: "#10b981", defaultOn: false },
  { id: "pai", label: "PAI - Rischio alluvione", color: "#e84c3d", defaultOn: false },
];

interface LayerControlProps {
  onChange: (active: Record<string, boolean>) => void;
}

export function LayerControl({ onChange }: LayerControlProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<Record<string, boolean>>(
    Object.fromEntries(LAYERS.map(l => [l.id, l.defaultOn]))
  );

  const toggle = (id: string) => {
    const next = { ...active, [id]: !active[id] };
    setActive(next);
    onChange(next);
  };

  return (
    <div className="absolute top-3 right-3 z-[1000]">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 bg-card/95 backdrop-blur border border-border rounded-lg px-3 py-2 shadow-lg text-xs font-medium text-foreground hover:bg-muted/60 transition-colors"
      >
        <Layers size={14} />
        Layer WMS
      </button>
      {open && (
        <div className="mt-1.5 bg-card/98 backdrop-blur border border-border rounded-xl shadow-xl p-3 w-56">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Layer attivi</p>
          {LAYERS.map(l => (
            <button
              key={l.id}
              onClick={() => toggle(l.id)}
              className="w-full flex items-center gap-2.5 py-1.5 px-1 rounded hover:bg-muted/40 transition-colors"
            >
              <div className="w-3.5 h-3.5 rounded-sm border flex-shrink-0 flex items-center justify-center"
                style={{ borderColor: l.color, backgroundColor: active[l.id] ? l.color : "transparent" }}>
                {active[l.id] && <span className="text-white text-[9px]">✓</span>}
              </div>
              <span className="text-xs text-left flex-1">{l.label}</span>
              {active[l.id]
                ? <Eye size={11} className="text-muted-foreground" />
                : <EyeOff size={11} className="text-muted-foreground/50" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
