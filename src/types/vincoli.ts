export interface Particella {
  id: string;
  comune: string;
  provincia: string;
  foglio: string;
  particella: string;
  subalterno?: string;
  color?: string;
  superficieMq?: number;
}

export type RischioLevel = "nessuno" | "basso" | "medio" | "alto" | "molto_alto";
export type VincoloPresenza = "assente" | "presente" | "verifica" | "non_rilevabile";
export type CriticitaLevel = "escludente" | "condizionante" | "da_verificare" | "neutro";
export type ClassificazioneIdoneita = "non_idoneo" | "condizionato" | "potenzialmente_idoneo";

export interface VincoloItem {
  id: string;
  categoria: string;
  sottocategoria: string;
  normativa: string;
  presenza: VincoloPresenza;
  descrizione: string;
  note?: string;
  fonte?: string;
  /** Livello di criticità per idoneità FV/agrivoltaico */
  criticita?: CriticitaLevel;
  /** Azione richiesta se il vincolo è presente */
  azioneRichiesta?: string;
}

export interface StepAutorizzativo {
  id: string;
  titolo: string;
  descrizione: string;
  normativa: string;
  ente: string;
  obbligatorio: boolean;
  /** ID del vincolo che genera questo step */
  vincoloId: string;
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
  vincoliAgricoli: VincoloItem[];
  vincoliMilitariRadar: VincoloItem[];
  vincoliForestali: VincoloItem[];
  vincoliSismici: VincoloItem[];
  vincoliCatastali: VincoloItem[];
  compatibilitaConnessione: VincoloItem[];
  areeIdonee: VincoloItem[];
  normativaAgrivoltaico: VincoloItem[];
  rischioComplessivo: RischioLevel;
  areaUtileLordaHa: number;
  areaUtileNettaHa: number;
  /** Classificazione automatica idoneità FV/agrivoltaico */
  classificazioneIdoneita: ClassificazioneIdoneita;
  /** Step autorizzativi consigliati in base ai vincoli rilevati */
  stepAutorizzativi: StepAutorizzativo[];
}

export const PARCEL_COLORS = [
  "#e84c3d", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6",
  "#06b6d4", "#f97316", "#84cc16", "#ec4899", "#6366f1"
];

export const CRITICITA_CONFIG: Record<CriticitaLevel, { label: string; emoji: string; color: string }> = {
  escludente: { label: "Escludente", emoji: "🔴", color: "text-danger" },
  condizionante: { label: "Condizionante", emoji: "🟠", color: "text-amber" },
  da_verificare: { label: "Da verificare", emoji: "🟡", color: "text-yellow-600" },
  neutro: { label: "Neutro", emoji: "🟢", color: "text-safe" },
};

export const CLASSIFICAZIONE_CONFIG: Record<ClassificazioneIdoneita, { label: string; color: string; bg: string; description: string }> = {
  non_idoneo: {
    label: "NON IDONEO",
    color: "text-danger",
    bg: "bg-danger-light",
    description: "Presente almeno un vincolo escludente. L'area non è idonea per impianti FV/agrivoltaici.",
  },
  condizionato: {
    label: "CONDIZIONATO",
    color: "text-amber",
    bg: "bg-amber-light",
    description: "Presenti vincoli condizionanti che richiedono autorizzazioni specifiche e iter complesso.",
  },
  potenzialmente_idoneo: {
    label: "POTENZIALMENTE IDONEO",
    color: "text-safe",
    bg: "bg-safe-light",
    description: "Nessun vincolo escludente o condizionante rilevato. Verifiche standard richieste.",
  },
};
