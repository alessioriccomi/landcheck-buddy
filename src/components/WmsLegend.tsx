import { ALL_LAYERS, LAYER_GROUPS, type LayerDef } from "@/lib/layerDefinitions";

interface WmsLegendProps {
  activeLayers: Record<string, boolean>;
}

export function WmsLegend({ activeLayers }: WmsLegendProps) {
  // Collect active non-catasto layers with their group info
  const activeDefs: { layer: LayerDef; groupLabel: string; groupIcon: string }[] = [];
  for (const group of LAYER_GROUPS) {
    for (const layer of group.layers) {
      if (layer.id === "catasto") continue;
      if (activeLayers[layer.id]) {
        activeDefs.push({ layer, groupLabel: group.label, groupIcon: group.icon });
      }
    }
  }

  if (activeDefs.length === 0) return null;

  return (
    <div className="absolute bottom-8 right-28 z-[1000] bg-card/95 backdrop-blur border border-border rounded-lg p-2.5 shadow-lg max-w-[220px] max-h-[50vh] overflow-y-auto">
      <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
        Legenda vincoli attivi
      </p>
      <div className="space-y-1">
        {activeDefs.map(({ layer }) => (
          <div key={layer.id} className="flex items-center gap-2">
            <div
              className="w-3.5 h-3 rounded-sm flex-shrink-0 border"
              style={{
                backgroundColor: layer.color + "55",
                borderColor: layer.color,
              }}
            />
            <span className="text-[10px] text-foreground leading-tight">
              {layer.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
