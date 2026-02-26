

# Piano di correzione: Layer WMS vincoli e stabilizzazione

## Problema identificato

I layer WMS dei vincoli nel pannello Layer non funzionano perche' gli URL e i nomi dei layer sono in gran parte **inventati**. I server WMS del Geoportale Nazionale (PCN) hanno URL e nomi di layer specifici che vanno verificati. Inoltre, alcuni server potrebbero non essere raggiungibili o avere formati diversi.

## Approccio

### Step 1 — Verificare i veri endpoint WMS del Geoportale Nazionale

Fare una ricerca sui veri URL WMS disponibili dal PCN (wms.pcn.minambiente.it) e da ISPRA. I servizi WMS reali e documentati del PCN includono:

- **Natura 2000**: `https://wms.minambiente.it/ogc?map=/ms_ogc/WMS/Rete_Natura_2000.map` con layer come `rn2000:ZSC`, `rn2000:ZPS`
- **Aree Protette**: `https://wms.minambiente.it/ogc?map=/ms_ogc/WMS/EUAP.map`
- **PAI/IFFI**: `https://idrogeo.isprambiente.it/geoserver/wms` con layer `iffi:frane_poly`, `pai:pericolosita_frana`
- **Vincolo Idrogeologico**: Varia per regione, non esiste un servizio nazionale unificato

### Step 2 — Ridurre i layer a quelli realmente funzionanti

Invece di avere 30+ layer finti, mantenere solo quelli verificati e funzionanti:

1. **Catasto** (gia' funzionante via proxy AdE)
2. **Natura 2000 ZSC/ZPS** (MASE/MATTM - verificare URL reale)
3. **Aree Protette EUAP** (MATTM)
4. **IFFI Frane** (ISPRA IdroGEO)
5. **PGRA Alluvioni** (se disponibile via WMS pubblico)

I layer con URL non verificati vanno rimossi o commentati per evitare richieste inutili e confusione utente.

### Step 3 — Aggiornare `LayerControl.tsx`

Riscrivere `LAYER_GROUPS` con soli layer verificati, aggiungendo un commento per ogni URL con la fonte di verifica. Aggiungere anche il dominio corretto nell'allowlist del proxy (`wms_ext` in `wfs-proxy/index.ts`).

### Step 4 — Aggiungere domini all'allowlist del proxy

In `wfs-proxy/index.ts`, aggiungere i domini reali dei WMS verificati all'array `allowedDomains`:
- `wms.minambiente.it`
- `idrogeo.isprambiente.it`
- `geoserver.isprambiente.it`

### Step 5 — Test e validazione

Verificare che ogni layer attivato mostri effettivamente dei dati sulla mappa, almeno in una zona d'Italia nota (es. Roma, Firenze).

---

## Dettagli tecnici

### File modificati

1. **`src/components/LayerControl.tsx`**: Ridurre LAYER_GROUPS ai soli layer con URL WMS verificati e funzionanti. Ogni layer avra' un commento con la fonte GetCapabilities verificata.

2. **`supabase/functions/wfs-proxy/index.ts`**: Aggiornare `allowedDomains` per includere i domini WMS reali (minambiente.it, isprambiente.it). Nessuna altra modifica necessaria — la logica wms_ext e' gia' corretta.

### Layer da mantenere (verificati)

| Layer | URL WMS | Layer name | Fonte |
|-------|---------|------------|-------|
| Catasto | (proxy AdE diretto) | CP.CadastralParcel | AdE |
| Natura 2000 | Da verificare via GetCapabilities | Da verificare | MASE |
| Aree Protette | Da verificare via GetCapabilities | Da verificare | MATTM |
| Frane IFFI | Da verificare via GetCapabilities | Da verificare | ISPRA |

### Nota importante

Prima dell'implementazione, faro' una verifica live dei GetCapabilities di ogni server WMS per ottenere i nomi esatti dei layer disponibili. Questo e' il passo critico che e' mancato finora — i nomi layer sono stati inseriti "a intuito" senza verifica.

