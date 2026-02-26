

# Piano: Fix layer vincoli + aggiunta layer completi

## Problema principale

I layer vincoli (ArcGIS/WMS) non vengono visualizzati quando attivati dal pannello. L'indagine ha rivelato che:
- Il proxy funziona (verificato con curl: risposta PNG valida da 6KB)
- Il server PCN ArcGIS e' raggiungibile e restituisce dati reali
- Ma ZERO richieste `wms_ext` arrivano al proxy — i tile non vengono mai caricati dal browser

La causa probabile e' un problema nel custom `L.TileLayer.extend()`: il metodo `getTileUrl` accede a `this._map` che puo' essere `null` al momento della prima richiesta tile (restituisce stringa vuota), oppure un problema di timing tra creazione del layer e aggiunta alla mappa.

## Piano di correzione

### 1. Correggere il caricamento dei tile ArcGIS/WMS

**File: `src/components/MapView.tsx`**

- Riscrivere `makeArcGISLayer` e `makeProxiedWmsLayer` usando `L.GridLayer.extend()` con `createTile()` invece di `L.TileLayer.extend()` con `getTileUrl()`. L'approccio `createTile` permette di caricare le immagini via `fetch()` con gestione errori esplicita, eliminando il problema del `_map` nullo
- In alternativa, usare `crossOrigin: "anonymous"` e verificare che `_map` esista prima di generare l'URL
- Aggiungere `console.log` per debug nelle prime tile caricate
- Aggiungere l'`apikey` come query parameter ai tile URL per garantire l'autenticazione (anche se i tile catasto funzionano senza, per sicurezza)

### 2. Espandere la lista layer vincoli

**File: `src/components/LayerControl.tsx`**

Aggiungere tutti i servizi ArcGIS MapServer verificati dal catalogo PCN (www.pcn.minambiente.it/arcgis/rest/services). I servizi disponibili e verificati sono:

**Ambiente e Natura (5 layer)**
- SIC_ZSC_ZPS (Rete Natura 2000) - gia' presente
- EUAP (Aree Protette) - gia' presente
- IBA (Important Bird Areas) - gia' presente
- Aree Ramsar - gia' presente
- Santuario Pelagos

**Idrogeologia e PAI (6 layer)**
- PAI pericolosita idrogeologica (alluvioni, frane, valanghe) - gia' presente
- PAI rischio idrogeologico - gia' presente
- Alluvioni Estensione - gia' presente
- Alluvioni Classi di Rischio (NUOVO)
- Alluvioni Caratteristiche Idrauliche (NUOVO)
- Alluvioni Elementi a Rischio (NUOVO)

**Geologia e Frane (5 layer)**
- Catalogo Frane poligonali - gia' presente
- Catalogo Frane lineari (NUOVO)
- Catalogo Frane Aree (NUOVO)
- Catalogo Frane DGPV (NUOVO)
- Carta geologica - gia' presente
- Carta geolitologica (NUOVO)

**Sismica (4 layer)**
- Classificazione sismica comunale 2012 - gia' presente
- Pericolosita sismica 0.02 (NUOVO)
- Pericolosita sismica 0.05 (NUOVO)
- Zone sismogenetiche ZS9 (NUOVO)

**Uso del suolo (3 layer)**
- CORINE Land Cover 2012 - gia' presente
- CORINE Land Cover 2012 IV livello (NUOVO)
- IUTI - Inventario Uso Terre (NUOVO)

**Idrografia e Costa (5 layer)**
- Aste fluviali (NUOVO)
- Laghi e specchi acqua (NUOVO)
- Linea di costa 2009 (NUOVO)
- Variazione costa 1960-2012 (NUOVO)
- Unita fisiografiche (NUOVO)

**Limiti e Infrastrutture (4 layer)**
- Limiti amministrativi 2020 (NUOVO)
- Ferrovie (NUOVO)
- Porti 2012 (NUOVO)
- ADB - Autorita di Bacino Distrettuale (NUOVO)

**Ambiente e Territorio (4 layer)**
- Carta ecopedologica (NUOVO)
- Fitoclima (NUOVO)
- Rischio erosione (NUOVO)
- Regioni pedologiche desertificazione (NUOVO)

Totale: da 11 a ~35 layer verificati.

### 3. Aggiornare la allowlist del proxy

**File: `supabase/functions/wfs-proxy/index.ts`**

Verificare che `www.pcn.minambiente.it` sia nella allowlist (gia' presente). Nessuna modifica necessaria.

## Dettagli tecnici

### Approccio per il fix tile (createTile)

```text
L.GridLayer.extend({
  createTile(coords, done) {
    const tile = document.createElement('img');
    // Costruisci URL come prima
    const url = buildTileUrl(coords, this._map);
    tile.crossOrigin = 'anonymous';
    tile.onload = () => done(null, tile);
    tile.onerror = () => done(new Error('tile failed'), tile);
    tile.src = url;
    return tile;
  }
})
```

Questo approccio:
- Non dipende dal timing di `_map` (il metodo `createTile` viene chiamato solo quando il layer e' gia' sulla mappa)
- Fornisce gestione errori esplicita
- Funziona con lo stesso pattern del proxy

### File modificati

1. `src/components/LayerControl.tsx` — Espansione LAYER_GROUPS con ~35 layer verificati PCN
2. `src/components/MapView.tsx` — Riscrittura makeArcGISLayer/makeProxiedWmsLayer con L.GridLayer.extend + createTile
3. `supabase/functions/wfs-proxy/index.ts` — Nessuna modifica (allowlist gia' corretta)

