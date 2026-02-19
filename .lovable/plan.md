
## La risposta alla tua domanda: come funziona realmente

L'Agenzia delle Entrate ha confermato ufficialmente (risposta scritta a onData) che **il CQL_FILTER per attributi non e' abilitato** sul WFS pubblico. Sono abilitate solo le richieste spaziali per bounding box. Questo e' il motivo per cui tutto quello che abbiamo tentato finora non funzionava: non e' un problema del nostro codice.

Il segreto di strumenti come forMaps e il tool QGIS di pigreco e' un **database di coordinate pre-calcolate** pubblicato dall'associazione onData su GitHub (licenza CC BY 4.0, uso libero). Per ogni particella catastale italiana e' stata precalcolata una coordinata interna (via `ST_PointOnSurface`) e salvata in file Parquet per regione.

### Il flusso corretto (quello che usano tutti)

```text
1. Utente inserisce: Comune="Montecatini Terme", Foglio=1, Particella=1

2. Query su index.parquet (raw GitHub):
   WHERE DENOMINAZIONE_IT LIKE 'MONTECATINI TERME'
   → codice_comune = "F445", file = "09_Toscana.parquet"

3. Query su 09_Toscana.parquet:
   WHERE comune='F445' AND foglio='0001' AND particella='1'
   → x=10773210, y=43882100
   → lon=10.773210, lat=43.882100

4. WFS con bbox minuscolo (±0.0001°) attorno a quel punto:
   BBOX=43.8820,10.7731,43.8822,10.7733
   → Restituisce geometria con properties complete (nationalRef, label)

5. Poligono disegnato sulla mappa + popup al click con foglio/particella
```

---

## Modifiche tecniche

### `supabase/functions/wfs-proxy/index.ts` — Nuova modalita' `mode=parcel`

Aggiungere la modalita' `mode=parcel` che accetta `comune` (nome), `foglio`, `particella` e:

1. Chiama `index.parquet` su raw.githubusercontent.com via fetch HTTP (il parquet e' interrogabile direttamente con una semplice GET range request tramite la libreria Apache Arrow/Parquet in Deno, oppure tramite un endpoint REST intermedio). Siccome Deno nell'edge function non ha DuckDB, si usera' l'approccio piu' semplice: **un'API REST gia' pronta che espone i dati parquet** — sql.js-httpvfs o direttamente `https://data.datasette.io` oppure, ancora piu' semplicemente, i file parquet possono essere letti in Deno tramite `fetch` parziale con il modulo `hyparquet` (parser parquet puro JS/TS senza dipendenze native).

   In alternativa piu' robusta: pubblicare una piccola **Cloud Function** (o usare l'edge function stessa) che scarica il parquet rilevante la prima volta e lo cachea, poi interroga con logica JS nativa.

   La soluzione piu' pragmatica per l'edge function Deno: **fetch il file parquet intero** (09_Toscana.parquet e' circa 2-5 MB, accettabile) e parsarlo con `hyparquet` (libreria TypeScript/Deno compatibile, nessuna dipendenza nativa). Questa operazione viene fatta solo al momento della ricerca, non su ogni richiesta di mappa.

2. Con le coordinate trovate, costruisce un bbox di ±0.0001° e chiama il WFS.

3. Restituisce le feature GeoJSON con geometria e properties complete.

### `src/components/MapView.tsx`

- Sostituire `fetchParcelGeometry` (che usava bbox del comune intero) con una chiamata a `mode=parcel`.
- Mantenere la modalita' click sulla mappa (gia' funzionante a zoom alto con bbox piccolo).
- I poligoni vengono disegnati con `bindPopup` al click (foglio, particella, comune, superficie) — nessuna etichetta permanente, come concordato.

### Parsing del Parquet nell'edge function

I file parquet di onData sono file binari standard. In Deno si puo' usare `hyparquet` importato via esm.sh:

```typescript
import { parquetRead, parquetMetadata } from 'https://esm.sh/hyparquet@1.9.1'
```

Il file `index.parquet` (~150KB) viene fetchato una volta, parsato in memoria per trovare `codice_comune` e `file_regione`. Poi il file regionale (es. `09_Toscana.parquet`, ~3-5MB) viene fetchato e filtrato per trovare `x` e `y`.

L'edge function cachera' i file parquet con un semplice Map in-memory (persiste per la durata della warm instance).

---

## Struttura del piano

### Step 1 — Edge Function `wfs-proxy/index.ts`
- Aggiungere `mode=parcel` con:
  - Lookup `index.parquet` → codice comune + file regionale
  - Lookup file regionale → x, y della particella
  - WFS con bbox ±0.0001° attorno al punto trovato
  - Restituzione GeoJSON

### Step 2 — `src/components/MapView.tsx`
- Aggiungere `searchParcelByAttribute(comune, foglio, particella)` → chiama `mode=parcel`
- Rimpiazza la vecchia logica bbox-del-comune
- Popup al click con i dati della particella

### Step 3 — `src/index.css`
- Aggiornare stili popup Leaflet (bianco, bordo navy, font)
- Rimuovere stili obsoleti per tooltip permanenti

---

## Vantaggi di questo approccio

- Funziona sempre: le coordinate sono pre-calcolate offline da dati ufficiali AdE
- Veloce: ~1-2 secondi totali (due fetch parquet + una WFS piccola)
- Preciso: il bbox WFS e' di ±0.0001° (circa 10 metri), garantisce properties complete
- Open data: dati onData con licenza CC BY 4.0, citabili in footer
- Nessuna API a pagamento, nessuna chiave segreta necessaria

