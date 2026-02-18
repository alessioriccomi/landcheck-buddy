export interface Particella {
  id: string;
  comune: string;
  provincia: string;
  foglio: string;
  particella: string;
  subalterno?: string;
  color?: string;
}

export type RischioLevel = "nessuno" | "basso" | "medio" | "alto" | "molto_alto";
export type VincoloPresenza = "assente" | "presente" | "verifica" | "non_rilevabile";

export interface VincoloItem {
  id: string;
  categoria: string;
  sottocategoria: string;
  normativa: string;
  presenza: VincoloPresenza;
  descrizione: string;
  note?: string;
  fonte?: string;
}

export interface AnalisiVincolistica {
  particelle: Particella[];
  dataAnalisi: string;
  vincoliCulturali: VincoloItem[];
  vincoliPaesaggistici: VincoloItem[];
  vincoliIdrogeologici: VincoloItem[];
  vincoliAmbientali: VincoloItem[];
  rischioIdrico: VincoloItem[];
  serviziReti: VincoloItem[];
  altriVincoli: VincoloItem[];
  rischioComplessivo: RischioLevel;
}

export const PARCEL_COLORS = [
  "#e84c3d", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6",
  "#06b6d4", "#f97316", "#84cc16", "#ec4899", "#6366f1"
];
