import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Particella, PARCEL_COLORS } from "@/types/vincoli";
import { cn } from "@/lib/utils";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

interface GeocodeSuggestion {
  displayName: string;
  shortName: string;
  provincia: string; // 2-letter province code
  lat: number;
  lng: number;
}

interface ParcelInputProps {
  particelle: Particella[];
  onChange: (p: Particella[]) => void;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onClearSelection: () => void;
}

const EMPTY_FORM = { comune: "", provincia: "", foglio: "", particella: "", subalterno: "" };

// Geocode cache to avoid duplicate API calls
const geocodeCache = new Map<string, GeocodeSuggestion[]>();

// Debounce helper
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function ParcelInput({ particelle, onChange, selectedIds, onToggleSelect, onClearSelection }: ParcelInputProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const comuneInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debouncedComune = useDebounce(form.comune, 350);

  // Fetch suggestions when comune input changes
  useEffect(() => {
    const query = debouncedComune.trim();
    if (query.length < 2) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      return;
    }

    let cancelled = false;
    setLoadingSuggestions(true);

    const fetchSuggestions = async () => {
      try {
        // Use Nominatim directly for autocomplete (no CORS issue for GET requests to nominatim)
        const q = encodeURIComponent(`${query}, Italia`);
        const resp = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=6&countrycodes=it&featuretype=city,town,village,municipality&addressdetails=1`,
          { headers: { "User-Agent": "GeoVincoli/1.0" } }
        );
        if (!resp.ok || cancelled) return;
        const data = await resp.json();

        const results: GeocodeSuggestion[] = data
          .filter((r: any) => r.type !== "postcode")
          .slice(0, 6)
          .map((r: any) => ({
            displayName: r.display_name,
            shortName: buildShortName(r),
            provincia: extractProvincia(r),
            lat: parseFloat(r.lat),
            lng: parseFloat(r.lon),
          }));

        if (!cancelled) {
          setSuggestions(results);
          setSuggestionsOpen(results.length > 0);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoadingSuggestions(false);
      }
    };

    fetchSuggestions();
    return () => { cancelled = true; };
  }, [debouncedComune]);

  function extractProvincia(r: any): string {
    const addr = r.address ?? {};
    // ISO3166-2-lvl6 is "IT-PT" → extract "PT"
    const iso = addr["ISO3166-2-lvl6"] as string | undefined;
    if (iso) return iso.replace("IT-", "").toUpperCase();
    return "";
  }

  function buildShortName(r: any): string {
    const addr = r.address ?? {};
    const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || r.name || "";
    const province = addr.county || addr.state_district || "";
    const region = addr.state || "";
    if (city && province) return `${city} — ${province}`;
    if (city && region) return `${city} — ${region}`;
    return r.display_name.split(",").slice(0, 2).join(",").trim();
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        comuneInputRef.current && !comuneInputRef.current.contains(e.target as Node)
      ) {
        setSuggestionsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectSuggestion = (s: GeocodeSuggestion) => {
    const cityName = s.shortName.split("—")[0].trim();
    setForm(f => ({ ...f, comune: cityName, provincia: s.provincia }));
    setSuggestions([]);
    setSuggestionsOpen(false);
    // Focus foglio (provincia already filled)
    setTimeout(() => {
      const next = document.querySelector<HTMLInputElement>('[data-field="foglio"]');
      next?.focus();
    }, 50);
  };

  const addParticella = () => {
    if (!form.comune || !form.foglio || !form.particella) return;
    const newP: Particella = {
      id: crypto.randomUUID(),
      comune: form.comune.trim(),
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
    if (e.key === "Enter" && !suggestionsOpen) addParticella();
    if (e.key === "Escape") setSuggestionsOpen(false);
    if (e.key === "ArrowDown" && suggestionsOpen && suggestions.length > 0) {
      e.preventDefault();
      const items = dropdownRef.current?.querySelectorAll<HTMLButtonElement>("[data-suggestion]");
      items?.[0]?.focus();
    }
  };

  const formatArea = (mq: number) => {
    if (mq >= 10000) return `${(mq / 10000).toFixed(2)} ha`;
    return `${mq.toLocaleString("it-IT")} m²`;
  };

  const totalMq = particelle.reduce((s, p) => s + (p.superficieMq ?? 0), 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Form inserimento */}
      <div className="bg-primary-muted/50 border border-border rounded-lg p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nuova particella</p>
        <div className="grid grid-cols-2 gap-2">
          {/* Comune with autocomplete */}
          <div className="col-span-2 relative">
            <Label className="text-xs text-muted-foreground mb-1 block">Comune *</Label>
            <div className="relative">
              <Input
                ref={comuneInputRef}
                placeholder="es. Montecatini Terme"
                value={form.comune}
                onChange={e => {
                  setForm(f => ({ ...f, comune: e.target.value }));
                  setSuggestionsOpen(true);
                }}
                onFocus={() => suggestions.length > 0 && setSuggestionsOpen(true)}
                onKeyDown={handleKey}
                className="h-8 text-sm pr-7"
                autoComplete="off"
              />
              {loadingSuggestions && (
                <Loader2 size={12} className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>
            {/* Dropdown suggestions */}
            {suggestionsOpen && suggestions.length > 0 && (
              <div
                ref={dropdownRef}
                className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden"
              >
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    data-suggestion
                    className="w-full text-left px-3 py-2 text-xs hover:bg-primary-muted focus:bg-primary-muted focus:outline-none transition-colors border-b border-border/40 last:border-b-0"
                    onMouseDown={e => { e.preventDefault(); selectSuggestion(s); }}
                    onKeyDown={e => {
                      if (e.key === "Enter") selectSuggestion(s);
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        const items = dropdownRef.current?.querySelectorAll<HTMLButtonElement>("[data-suggestion]");
                        items?.[i + 1]?.focus();
                      }
                      if (e.key === "ArrowUp") {
                        e.preventDefault();
                        if (i === 0) comuneInputRef.current?.focus();
                        else {
                          const items = dropdownRef.current?.querySelectorAll<HTMLButtonElement>("[data-suggestion]");
                          items?.[i - 1]?.focus();
                        }
                      }
                    }}
                  >
                    <span className="font-medium text-foreground">{s.shortName.split("—")[0]}</span>
                    {s.shortName.includes("—") && (
                      <span className="text-muted-foreground"> — {s.shortName.split("—")[1]?.trim()}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Provincia</Label>
            <Input
              data-field="provincia"
              placeholder="es. PT"
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
              data-field="foglio"
              placeholder="es. 1"
              value={form.foglio}
              onChange={e => setForm(f => ({ ...f, foglio: e.target.value }))}
              onKeyDown={handleKey}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Particella *</Label>
            <Input
              placeholder="es. 1"
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
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Particelle ({particelle.length})
            </p>
            {selectedIds.length > 0 && (
              <button
                onClick={onClearSelection}
                className="text-[10px] text-muted-foreground hover:text-foreground underline"
              >
                Deseleziona ({selectedIds.length})
              </button>
            )}
          </div>
          {particelle.map((p) => {
            const isSelected = selectedIds.includes(p.id);
            return (
              <div
                key={p.id}
                onClick={() => onToggleSelect(p.id)}
                className={cn(
                  "flex items-center gap-2 border rounded-md px-3 py-2 group cursor-pointer transition-all",
                  isSelected
                    ? "bg-primary/10 border-primary/40 ring-1 ring-primary/30"
                    : "bg-card border-border hover:bg-muted/50"
                )}
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
                  {p.superficieMq && p.superficieMq > 0 && (
                    <p className="text-[10px] font-semibold text-safe mt-0.5">
                      ✓ {formatArea(p.superficieMq)}
                    </p>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); removeParticella(p.id); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}

          {/* Totale superficie */}
          {totalMq > 0 && (
            <div className="flex items-center justify-between px-3 py-2 bg-safe-light border border-safe/30 rounded-md">
              <span className="text-xs font-semibold text-safe-foreground">Superficie totale WFS</span>
              <span className="text-xs font-bold text-safe">{formatArea(totalMq)}</span>
            </div>
          )}
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
