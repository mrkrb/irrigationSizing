# Irrigation Sizer 💧

Webapp per il dimensionamento e la taratura dell'irrigazione a goccia di vasi da terrazzo.

**[Apri l'app →](https://mrkrb.github.io/irrigationSizing/)**

## Cosa fa

Irrigation Sizer aiuta a gestire un impianto di irrigazione a goccia dove più vasi condividono la stessa linea e la stessa valvola (stesso tempo di apertura). Ogni vaso può avere un numero diverso di gocciolatori con portata regolabile.

L'app offre due modalità:

- **Verifica** — Dati la portata dei gocciolatori e il tempo di accensione, calcola quanti litri riceve ciascun vaso.
- **Taratura** — Dati i litri desiderati per ciascun vaso e il tempo di accensione, calcola a che portata impostare i gocciolatori.

## Funzionalità principali

- Gestione illimitata di vasi, ciascuno con 1–20 gocciolatori
- Portata configurabile in l/h, l/min, o gocce/min (con fattore di conversione personalizzabile)
- Modalità "stessa portata" o "portate differenziate" per vaso
- Ripartizione pesata dei gocciolatori in modalità taratura
- Vasi collassabili per una vista compatta dei risultati
- Slider tempo 0–60 minuti (sticky, sempre visibile)
- Suggerimento automatico del tempo alternativo quando la portata calcolata è fuori range (1–8 l/h)
- Esportazione/importazione configurazione in JSON
- Salvataggio automatico in localStorage
- Tema chiaro/scuro (con rilevamento preferenza di sistema)
- PWA installabile con funzionamento offline
- Interfaccia in italiano, ottimizzata per smartphone

## Requisiti tecnici

- Webapp statica: solo HTML, CSS e JavaScript vanilla
- Nessun backend, nessuna dipendenza esterna a runtime
- Funziona interamente offline dopo il primo caricamento
- Compatibile con qualsiasi browser moderno (Chrome, Firefox, Safari, Edge)

## Sviluppo

### Prerequisiti

- Node.js (per i test)

### Setup

```bash
git clone https://github.com/mrkrb/irrigationSizing.git
cd irrigationSizing
npm install
```

### Test

```bash
npm test
```

### Deploy

L'app è deployata automaticamente su GitHub Pages dal branch `main`. Basta pushare su main per aggiornare il sito.

URL: https://mrkrb.github.io/irrigationSizing/

## Struttura del progetto

```
├── index.html          # Pagina principale
├── style.css           # Stili (responsive, dark mode)
├── manifest.json       # Manifest PWA
├── sw.js               # Service worker (network-first)
├── js/
│   ├── app.js          # Controller principale
│   ├── calc.js         # Motore di calcolo (funzioni pure)
│   ├── storage.js      # Gestione localStorage
│   ├── io.js           # Import/export JSON
│   └── version.js      # Versione corrente
├── icons/
│   └── icon.svg        # Icona app
└── tests/
    ├── unit/           # Test unitari (vitest)
    ├── property/       # Test property-based (fast-check)
    └── integration/    # Test di integrazione
```

## Licenza

Uso personale.
