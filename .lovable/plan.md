
# Problema e Soluzione: Mappa Catastale + Poligoni Particelle

## Diagnosi del Problema

Ci sono due problemi separati che si sommano:

**Problema 1 — WMS Catasto bloccato da CORS**
Il servizio WMS di `wms.cartografia.agenziaentrate.gov.it` non invia le intestazioni `Access-Control-Allow-Origin` nelle risposte. Leaflet usa `L.tileLayer.wms` che, con certe configurazioni, tenta di usare `crossOrigin`, provocando il blocco. Le tile semplicemente non appaiono.

**Problema 2 — Il WFS dell'Agenzia delle Entrate è irraggiungibile dal browser**
Il servizio `wfs.cartografia.agenziaentrate.gov.it` blocca le chiamate dal browser (CORS). Quindi la geometria reale delle particelle non arriva mai, e al momento il codice mostra dei placeholder demo fissi nell'area di Roma — indipendentemente da quale comune si inserisce.

**Problema 3 — Il basemap "Catasto" è identico al "Satellite"**
In `makeBaselayer("catasto")` viene caricata la stessa tile Esri del satellite, senza la sovrapposizione WMS catastale (che non funziona per CORS). L'utente seleziona "Catasto" e vede la stessa identica vista satellite.

---

## Soluzioni

### Per la mappa catastale (basemap)

Il servizio WMS dell'Agenzia delle Entrate **funziona senza CORS** se chiamato come semplice richiesta `GetMap` (le tile WMS caricate come `<img>` non sono soggette a CORS). Il trucco è impostare `crossOrigin: false` o non impostarlo, e usare il parametro corretto.

URL WMS che funziona:
```
https://wms.cartografia.agenziaentrate.gov.it/inspire/wms/ows01.php
?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap
&LAYERS=CP.CadastralParcel
&FORMAT=image/png
&TRANSPARENT=true
&CRS=EPSG:3857
&BBOX={bbox-epsg-3857}
&WIDTH=256&HEIGHT=256
```

In Leaflet, `L.tileLayer.wms` costruisce esattamente questo URL e lo carica via `<img>`, quindi **non è soggetto a CORS**. Il problema attuale è che la pane WMS ha `zIndex: 300` ma Leaflet non applica zIndex alle pane delle tile WMS nello stesso modo.

**Alternativa robusta e gratuita**: Usare **Google Maps Tile API** (satellite) + overlay WMS catasto, oppure usare il **servizio tile XYZ del Geoportale Nazionale** disponibile su:
```
https://servizi.protezionecivile.it/geo/geoserver/...
```

Oppure, la soluzione più semplice e affidabile: usare **OpenStreetMap** come base e sovrapporre il WMS catasto su di essa, impostando `crossOrigin: undefined` (null) in Leaflet — questo evita che il browser invii l'header CORS.

### Per i poligoni delle particelle

Abbandonare il tentativo di caricare i dati WFS dal browser. Invece:
- Mantenere i **poligoni placeholder** ma renderli chiaramente visibili con stile più marcato
- Aggiungere un **sistema di coordinate basato sul comune**: quando l'utente inserisce "Roma" il placeholder viene posizionato nell'area reale di Roma (non sempre nell'area demo fissa), usando un dizionario di coordinate comunali italiane
- Questo renderà l'esperienza molto più utile: l'utente vedrà il placeholder nella posizione corretta della città

---

## Modifiche Pianificate

### 1. `src/components/MapView.tsx` — Riscrittura basemap e poligoni

**Basemap "Catasto"**: Cambiare approccio. Invece di usare le tile Esri + WMS sovrapposto (che fallisce per CORS), usare:
- Base: OpenStreetMap standard
- Overlay: WMS `CP.CadastralParcel` dell'Agenzia delle Entrate con `crossOrigin: false` e la proiezione corretta `EPSG:4326` (più compatibile con il server AdE)

**Fix pane zIndex**: Assicurarsi che `parcelsPane` venga creata correttamente e che i poligoni vengano effettivamente aggiunti ad essa. Aggiungere un log di debug visuale (badge "Stima") per confermare visivamente che il poligono esiste.

**Poligoni placeholder geolocalizzati**: Aggiungere un dizionario dei capoluoghi italiani con coordinate approssimative, così il placeholder viene posizionato nella città giusta invece che sempre a Roma.

**Stile poligono migliorato**: 
- `fillOpacity: 0.4` (era 0.55, va bene)
- `weight: 4`
- `color` vivace con `opacity: 1`
- Bordo con colore bianco attorno per massimo contrasto su qualsiasi sfondo

### 2. Dizionario coordinate comuni italiani

Aggiungere in `MapView.tsx` un dizionario con le coordinate lat/lng dei principali capoluoghi e comuni italiani (circa 120 comuni), per posizionare correttamente i placeholder.

### 3. Indicatore visivo placeholder vs reale

Aggiungere nella legenda un'icona che distingua:
- Tratteggio = perimetro stimato (placeholder)
- Pieno = perimetro reale (da WFS)

---

## Dettaglio Tecnico

### Perché il WMS catasto non appariva

Il `L.tileLayer.wms` in Leaflet invia le richieste tile come elementi `<img>`, che normalmente non sono bloccati da CORS (le immagini non sono soggette alla Same-Origin Policy). **Tuttavia**, se `crossOrigin` è impostato, il browser aggiunge l'header `Origin` alla richiesta e aspetta la risposta CORS dal server — se il server non risponde con `Access-Control-Allow-Origin`, la tile viene bloccata.

La correzione: non impostare `crossOrigin` (default = non inviato), oppure impostare esplicitamente `crossOrigin: false` o `crossOrigin: undefined`.

### Come si costruirà il basemap catastale

```text
Layer "Catasto":
  [1] Base: OpenStreetMap (visibile, cartografia stradale)
  [2] Overlay: WMS AdE CP.CadastralParcel (transparent PNG, opacity 0.7)
              crossOrigin non impostato → nessun blocco CORS
              le immagini vengono caricate normalmente
  [3] Pane: parcelsPane (zIndex 650) → poligoni vettoriali SOPRA a tutto
```

### Dizionario comuni (esempi)

```text
Roma      → [41.9028, 12.4964]
Milano    → [45.4654, 9.1859]
Napoli    → [40.8518, 14.2681]
Torino    → [45.0703, 7.6869]
Palermo   → [38.1157, 13.3615]
Firenze   → [43.7696, 11.2558]
Bologna   → [44.4949, 11.3426]
Venezia   → [45.4408, 12.3155]
... (circa 120 comuni)
```

Il placeholder verrà posizionato in prossimità del centroide del comune indicato, con un offset di ±0.002 gradi per ogni particella aggiuntiva.
