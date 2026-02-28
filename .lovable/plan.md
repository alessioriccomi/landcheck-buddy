

# Piano: Fix inserimento particelle dalla card

## Problema identificato

Ho verificato il flusso completo interrogando direttamente il WFS dell'Agenzia delle Entrate e analizzando la risposta XML reale. Il problema ha **due cause distinte**:

### Causa 1: Il parser GML non estrae correttamente i campi identificativi

Il parser nel proxy (`gmlToGeoJSON`) cerca `<base:localId>` ma il WFS AdE restituisce `<CP:inspireId_localId>`. Ecco il confronto:

```text
Atteso dal parser:       <base:localId>...</base:localId>
Reale dal WFS AdE:       <CP:inspireId_localId>IT.AGE.PLA.H501A0352B0.1018</CP:inspireId_localId>
```

Risultato: `localId` viene impostato a `"unknown"`, `label` e `nationalRef` rimangono vuoti perche' il parser potrebbe avere problemi di case-sensitivity.

### Causa 2: Il formato del campo `label` non e' quello atteso dal client

Il WFS AdE restituisce:
- `label` = `"1018"` (solo numero particella, **senza** foglio)
- `nationalCadastralReference` = `"H501A0352B0.1018"` (codice catastale + foglio codificato + particella)
- `inspireId_localId` = `"IT.AGE.PLA.H501A0352B0.1018"`

Ma il codice client (`MapView.tsx` linea 642) fa `label.split("/")` aspettandosi il formato `"foglio/particella"`. Poiche' `label` e' solo `"1018"`, il foglio non viene mai estratto e risulta `"--"`.

### Come estrarre foglio e particella dalla risposta reale

Il campo `nationalCadastralReference` contiene tutto: `H501A0352B0.1018` dove:
- `H501` = codice catastale del Comune (Roma = H501)
- `A0352B0` = codice foglio (la decodifica e': la prima lettera e' il tipo sezione, le cifre centrali sono il foglio)
- `.1018` = numero particella

Per estrarre il foglio: dal `nationalRef`, prendere la parte tra il codice catastale (4 caratteri) e il punto, poi parsare le cifre centrali ignorando le lettere di sezione. Esempio: `A0352B0` -> foglio `352`.

---

## Piano di correzione

### 1. Correggere il parser GML nel proxy

**File: `supabase/functions/wfs-proxy/index.ts`**

Nella funzione `gmlToGeoJSON()`:
- Cambiare il regex per `localId` da `<base:localId>` a un pattern che matchi sia `<base:localId>` che `<CP:inspireId_localId>` (case-insensitive)
- Aggiungere anche l'estrazione di `<CP:administrativeUnit>` (codice catastale comune)
- Fare lo stesso fix nella funzione `gmlToGeoJSONZoning()` se necessario

### 2. Aggiungere la decodifica foglio dal `nationalCadastralReference`

**File: `supabase/functions/wfs-proxy/index.ts`**

Creare una funzione `decodeNationalRef(ref)` che estrae foglio e particella dal formato `H501A0352B0.1018`:
- Particella: tutto dopo il punto (es. `1018`)
- Foglio: le cifre nella parte tra codice catastale e punto (es. da `A0352B0` -> `352`)
- Aggiungere i campi decodificati `_foglio` e `_particella` alle properties della feature prima di restituirla

### 3. Aggiornare il client per usare i nuovi campi

**File: `src/components/MapView.tsx`**

Nelle due sezioni che parsano la risposta WFS (click-to-add e click-to-select, circa linee 637-653 e 718-734):
- Usare prima `properties._foglio` e `properties._particella` (i campi decodificati dal proxy)
- Fallback su `label.split("/")` se presenti
- Fallback su decodifica di `nationalRef` lato client come ulteriore backup

### 4. Aggiungere log diagnostico nel proxy

**File: `supabase/functions/wfs-proxy/index.ts`**

Aggiungere un `console.log` con i primi 500 caratteri del GML raw per debug futuro, e loggare i campi estratti (label, localId, nationalRef) per ogni feature parsata.

---

## Dettagli tecnici

### Funzione `decodeNationalRef`

```text
Input:  "H501A0352B0.1018"
Step 1: Split by "." -> ["H501A0352B0", "1018"]
Step 2: particella = "1018"
Step 3: codePart = "H501A0352B0"
Step 4: Remove first 4 chars (codice catastale) -> "A0352B0"
Step 5: Extract digits -> "0352" -> parseInt -> 352
Result: { foglio: "352", particella: "1018" }
```

### Regex fix per `localId`

```text
Da:  /<base:localId>(.*?)<\/base:localId>/
A:   /<(?:base|CP):(?:localId|inspireId_localId)>(.*?)<\/(?:base|CP):(?:localId|inspireId_localId)>/i
```

### File modificati

1. `supabase/functions/wfs-proxy/index.ts` — Fix regex parser GML + aggiunta `decodeNationalRef` + log diagnostico
2. `src/components/MapView.tsx` — Aggiornamento logica estrazione foglio/particella per usare i nuovi campi decodificati

