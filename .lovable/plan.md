

# Fix: ricerca particelle dalla card laterale

## Problema

Quando si inserisce una particella dalla card (es. Montecatini Terme, Foglio 1, Particella 2), il sistema:
1. Trova correttamente il comune (codice catastale A561) e le coordinate del centro
2. Cerca i fogli catastali (CadastralZoning) attorno al centro del comune con bbox progressivi
3. A delta=0.02 trova 38 fogli (17, 18, 19, 21, 23, 24...) ma **non** il foglio 1, perche' e' troppo lontano dal centro
4. A delta maggiori (0.05, 0.1, 0.2) il WFS restituisce 0 risultati (limite del servizio)
5. Il fallback con bbox diretto fallisce per lo stesso motivo
6. Risultato: il rettangolo placeholder rimane visibile, dando l'impressione che sia stato trovato qualcosa

## Soluzione

Utilizzare una **query diretta per proprieta'** al WFS, sfruttando il codice catastale gia' disponibile dal parquet per costruire il `nationalCadastralReference` esatto della particella, eliminando la dipendenza dalla posizione geografica.

### Formato nationalCadastralReference

Dai log sappiamo il formato: `CODICE_FFFFAA.PPPP` dove:
- `CODICE` = codice catastale (es. A561)
- `FFFF` = foglio zero-padded a 4 cifre
- `AA` = allegato (solitamente "00")
- `PPPP` = numero particella

Esempio: Foglio 1, Particella 2 di Montecatini Terme = `A561_000100.2`

---

## Modifiche

### 1. Edge function: aggiungere query WFS diretta per proprieta' (`wfs-proxy/index.ts`)

Aggiungere una funzione `wfsQueryByNationalRef` che usa il parametro OGC FILTER per cercare direttamente una particella specifica senza dipendere dalla bbox:

```text
WFS GetFeature con FILTER XML:
  PropertyIsEqualTo nationalCadastralReference = "A561_000100.2"
```

Se il filtro esatto non trova risultati (l'allegato potrebbe non essere "00"), provare con un filtro LIKE: `A561_0001%.2`

Modificare `progressiveParcelSearch` per:
1. Accettare il `codiceComune` come parametro
2. Provare PRIMA la query diretta per nationalRef
3. Solo se fallisce, ricadere sulla ricerca bbox attuale

### 2. Edge function: passare il codice catastale alla ricerca (`wfs-proxy/index.ts`)

Nel handler `mode=parcel`, passare `codiceComune` (gia' disponibile dalla lookup parquet) a `progressiveParcelSearch`.

### 3. Client: rimuovere placeholder quando la ricerca fallisce (`MapView.tsx`)

Quando `searchParcelByAttribute` restituisce 0 features:
- Rimuovere il rettangolo placeholder dalla mappa
- Mostrare un toast di errore ("Particella non trovata nel catasto WFS")
- Non lasciare il rettangolo visibile

### 4. Client: gestire il caso "comune non trovato" (`MapView.tsx`)

Mostrare un toast di errore anche quando il comune non viene trovato nell'indice catastale.

---

## Dettagli tecnici

### Query WFS diretta

```text
URL: https://wfs.cartografia.agenziaentrate.gov.it/inspire/wfs/owfs01.php
  ?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature
  &TYPENAMES=CP:CadastralParcel
  &SRSNAME=urn:ogc:def:crs:EPSG::6706
  &FILTER=<Filter xmlns="http://www.opengis.net/fes/2.0">
    <PropertyIsEqualTo>
      <ValueReference>nationalCadastralReference</ValueReference>
      <Literal>A561_000100.2</Literal>
    </PropertyIsEqualTo>
  </Filter>
```

Fallback con LIKE (se allegato diverso da 00):
```text
  &FILTER=<Filter xmlns="http://www.opengis.net/fes/2.0">
    <PropertyIsLike wildCard="*" singleChar="?" escapeChar="\">
      <ValueReference>nationalCadastralReference</ValueReference>
      <Pattern>A561_0001*.2</Pattern>
    </PropertyIsLike>
  </Filter>
```

### Costruzione nationalRef

```text
codiceComune = "A561"  (dal parquet)
foglio = "1"           (dall'input utente)
particella = "2"       (dall'input utente)

foglioPadded = "0001"  (zero-pad a 4 cifre)
allegato = "00"        (default)

nationalRef = "A561_000100.2"
```

### File modificati

1. `supabase/functions/wfs-proxy/index.ts` — Query diretta WFS per nationalRef + passaggio codice catastale
2. `src/components/MapView.tsx` — Rimozione placeholder su fallimento + toast errore

