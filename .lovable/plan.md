
## Diagnosi dei due problemi

### Problema 1: Particella sbagliata (bounding box troppo piccolo)

Il flusso attuale è:
1. `geocodeComune("Montecatini Terme")` → restituisce coordinate del centro città `[43.8847, 10.7735]`
2. `fetchParcelGeometry(lat, lng, foglio, particella, radius=0.01)` → costruisce bbox di soli ±0.01° (~1 km) intorno al centro
3. Il WFS viene interrogato con `CQL_FILTER` su quel piccolo bbox
4. Se non trova nulla (la particella è fuori da quel piccolo quadrato), fa fallback bbox-only e restituisce le prime 50 particelle trovate in quel punto — che sono particelle generiche del centro città, non quella richiesta

**La causa radice**: il bbox fisso ±0.01° è troppo piccolo. Per comuni grandi, la particella richiesta può trovarsi a kmm dal centro. Serve un bbox che copra l'intero territorio comunale.

### Problema 2: Etichette non visibili

Il `L.divIcon` con `iconSize: [0, 0]` e `iconAnchor: [0, 0]` crea un marker il cui "punto" è l'angolo in alto a sinistra dell'icona di dimensione zero. Il div HTML (`.leaflet-parcel-label`) viene posizionato con `left: 0; top: 0` e poi `transform: translate(-50%, -50%)`. In pratica però Leaflet aggiunge un wrapper div intorno all'html del DivIcon, quindi il posizionamento CSS non si applica correttamente e le etichette escono fuori dal poligono.

---

## Soluzione

### Fix 1: Bbox dinamico per il comune (risolve la selezione errata)

**Strategia**: usare Nominatim per ottenere il `boundingbox` del comune (non solo le coordinate centrali), poi usare quel bbox per interrogare il WFS. Nominatim restituisce `[south, north, west, east]` del comune completo.

Modifiche all'**Edge Function `wfs-proxy`**:
- Aggiungere un nuovo parametro `mode=geocode` che accetta un nome di comune e restituisce le coordinate + bounding box del comune tramite la Nominatim API (chiamata server-side dall'edge function per evitare problemi CORS/rate limiting).

Modifiche a **`src/components/MapView.tsx`**:
- Rimpiazzare `geocodeComune` (che restituisce solo lat/lng) con una nuova funzione `geocodeComuneWithBbox` che chiama l'edge function in modalità `mode=geocode` e ottiene anche il bounding box del comune.
- La `fetchParcelGeometry` userà il bbox del comune anziché il bbox fisso dal centro — così il WFS copre tutto il territorio comunale.
- Aumentare `COUNT` da 50 a 100 nella richiesta WFS per avere più probabilità di trovare la particella.

Flusso corretto dopo il fix:
1. `geocodeComuneWithBbox("Montecatini Terme")` → `{ lat, lng, bbox: [43.85, 43.92, 10.73, 10.82] }`
2. Il WFS viene interrogato con `BBOX=43.85,10.73,43.92,10.82` (intero comune) + `CQL_FILTER` per foglio/particella
3. Se CQL_FILTER funziona → risultato corretto
4. Se CQL_FILTER non funziona → fallback con bbox intero comune + filtraggio lato client per foglio/particella sul `nationalRef` o `label`

### Fix 2: Etichette visibili (risolve i numeri sui poligoni)

Sostituire il DivIcon con approccio corretto:
- `iconSize: [1, 1]` e `iconAnchor: [0, 0]`
- Il div `.leaflet-parcel-label` usa `position: absolute; transform: translate(-50%, -50%); left: 0; top: 0` — questo funziona solo se il marker ha `iconAnchor` che punta al centro del div
- **Fix corretto**: usare `iconAnchor` dinamico calcolato in base alla dimensione stimata del testo, oppure semplicemente usare `L.tooltip` con `permanent: true, direction: 'center', className: 'leaflet-parcel-label'` sul poligono stesso — Leaflet gestisce il posizionamento automaticamente

La soluzione più robusta: usare `polygon.bindTooltip(text, { permanent: true, direction: 'center', className: 'leaflet-parcel-label', opacity: 1 })` — questo è il metodo nativo di Leaflet per etichette permanenti centrate sui layer, più affidabile del DivIcon.

Aggiornare il CSS `.leaflet-parcel-label` rimuovendo i posizionamenti che conflittano con il tooltip nativo.

---

## File da modificare

### `supabase/functions/wfs-proxy/index.ts`
- Aggiungere modalità `mode=geocode`: chiama Nominatim con `?q=COMUNE&format=json&limit=1&countrycodes=it` e restituisce `{ lat, lng, bbox: [south, north, west, east] }`.
- Nella modalità WFS: il chiamante fornirà i parametri `minLat`, `minLng`, `maxLat`, `maxLng` diretti (bbox del comune) invece di `lat/lng/radius`. Mantenere backward-compat accettando entrambi.
- Aumentare `COUNT=100`.
- Nel fallback senza CQL_FILTER: migliorare il filtraggio lato server sul `nationalRef` cercando sia foglio che particella in AND (non OR).

### `src/components/MapView.tsx`
- Sostituire `geocodeComune` con `geocodeComuneWithBbox` che chiama `wfs-proxy?mode=geocode&comune=...` e ottiene lat/lng + bbox del comune.
- Modificare `fetchParcelGeometry` per accettare bbox completo `[minLat, minLng, maxLat, maxLng]` anziché `lat/lng/radius`.
- Sostituire `addParcelLabel` (che usa DivIcon) con `polygon.bindTooltip` con `permanent: true` — più affidabile per le etichette.
- Aggiornare il CSS delle etichette per il tooltip permanente.

### `src/index.css`
- Aggiornare `.leaflet-parcel-label` per funzionare con i tooltip permanenti Leaflet (rimuovere `position: absolute`, `transform: translate(-50%, -50%)`, `left: 0`, `top: 0` che erano per il DivIcon).
- Aggiungere `.leaflet-tooltip.leaflet-parcel-label` con sfondo bianco, bordo, font grassetto — stile coerente col design.

---

## Ordine di implementazione

1. Aggiornare `wfs-proxy/index.ts` con `mode=geocode` e bbox-first WFS.
2. Aggiornare `MapView.tsx` con geocoding bbox-aware e tooltip permanenti.
3. Aggiornare `src/index.css` con stili tooltip corretti.
