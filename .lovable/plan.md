

## Piano: Aggiungere icona info (ℹ️) su ogni vincolo

### Situazione attuale
Ogni `VincoloRow` in `ConstraintPanel.tsx` si espande al click mostrando descrizione, normativa, criticità, fonte e note. L'utente vuole un'icona **ℹ️** sempre visibile che mostri un tooltip/popover con la tipologia del vincolo e la normativa di riferimento, senza dover espandere la riga.

### Cosa farò

**File: `src/components/ConstraintPanel.tsx`**

1. Importare `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider` da `@/components/ui/tooltip` e l'icona `Info` da lucide-react.

2. Nel componente `VincoloRow`, aggiungere un'icona `Info` (ℹ️) accanto al nome del vincolo (prima del badge presenza). Al hover/click mostra un tooltip con:
   - **Categoria**: `v.categoria`
   - **Normativa**: `v.normativa`
   - **Fonte**: `v.fonte` (se presente)
   - **Criticità**: livello e label (se presente)

3. Wrappare il `ConstraintPanel` in un `TooltipProvider` per abilitare i tooltip.

### Dettagli tecnici
- Il tooltip apparirà al passaggio del mouse sull'icona ℹ️, senza interferire con il click per espandere la riga.
- L'icona sarà piccola (11px), colorata come `text-muted-foreground` con hover `text-primary`.
- Il contenuto del tooltip sarà compatto, con le info su righe separate.

