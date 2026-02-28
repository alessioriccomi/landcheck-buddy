

# Fix: decodifica foglio da nationalCadastralReference

## Problema

La funzione `decodeNationalRef` nel proxy estrae il foglio in modo errato. Dopo aver rimosso il codice catastale (4 caratteri), il campo contiene una stringa come `A0017B0` con questa struttura:

```text
A    0017   B    0
|    |      |    |
|    foglio |    sviluppo
sezione     allegato
```

Il codice attuale fa `replace(/[^0-9]/g, "")` che rimuove TUTTE le lettere e concatena TUTTI i numeri: `"001700"` -> `parseInt` -> `1700`. Ma il foglio e' solo `0017` -> `17`.

## Correzione

**File: `supabase/functions/wfs-proxy/index.ts`** (riga 346-351)

Cambiare l'estrazione da "rimuovi tutte le lettere" a parsing posizionale:
- Posizione 0: lettera sezione (ignorare)
- Posizioni 1-4: foglio (4 cifre zero-padded)
- Posizioni 5+: allegato e sviluppo (ignorare)

```text
Prima:  foglioEncoded.replace(/[^0-9]/g, "") → "001700" → 1700
Dopo:   foglioEncoded.substring(1, 5)        → "0017"   → 17
```

Aggiungere anche un fallback: se la stringa ha meno di 5 caratteri o le posizioni 1-4 non sono cifre, usare il metodo regex attuale come backup.

### File modificato

1. `supabase/functions/wfs-proxy/index.ts` — Fix parsing posizionale del foglio in `decodeNationalRef` + redeploy
