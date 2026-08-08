# Steering — Filosofia comune progetti Kiro

Questo documento descrive il "modus operandi" condiviso tra i progetti webapp sviluppati con Kiro (es. barattoli QR/AR, irrigazione vasi terrazzo). Va copiato nella cartella `.kiro/steering/` di ogni nuovo progetto che deve seguirne lo stile.

## Stack e vincoli tecnici

- Webapp statica, interamente client-side: solo HTML/CSS/JS (vanilla o framework leggero senza build step complesso).
- Nessun backend, nessun server esterno, nessuna dipendenza da devkit nativi (niente Android Studio, Xcode, ecc.).
- Persistenza dei dati solo lato client (localStorage o simili), salvo diversa indicazione esplicita nei requisiti del singolo progetto.
- Hosting su GitHub Pages: la struttura del repository deve essere compatibile con la pubblicazione diretta (es. root o cartella `/docs`), senza step di build obbligatori per andare online.

## Git e deployment

- Il progetto è hostato in una repository Git (GitHub).
- L'agente (Kiro) è responsabile di gestire commit e push automaticamente al completamento di ogni task o modifica.
- L'agente deve usare le API di GitHub (tramite `gh` CLI) per configurare la repository come GitHub Pages (deploy dal branch `main`, root `/`).
- Dopo ogni push sul branch `main`, l'agente deve verificare lo stato del deployment della pagina usando le API di GitHub (es. `gh api repos/{owner}/{repo}/pages`).

## Metodologia di sviluppo

- Sviluppo spec-driven: i requisiti vengono scritti in formato EARS (WHEN/IF/THE SYSTEM SHALL) prima di iniziare l'implementazione.
- Le funzionalità complesse vengono scomposte in specifiche (requisiti, design, task) prima di generare codice.

## UI/UX

- Interfaccia in italiano.
- Design mobile-first e responsive: le webapp vengono usate prevalentemente da smartphone, spesso sul campo (es. in terrazzo, davanti ai barattoli).
- La schermata di configurazione/gestione dei dati è separata dalla schermata di funzionalità principale.
- Deve essere disponibile una modalità dark (tema scuro).

## Versionamento

- Ogni progetto deve avere un numero di versione nel formato `x.x.x` (major.minor.patch), seguendo il versionamento semantico.
- La versione corrente deve essere sempre visibile in calce alla webapp (footer), così che l'utente abbia sempre ben chiaro quale versione sta utilizzando.
- La versione deve essere mantenuta in un file dedicato (es. `js/version.js`) e riportata anche nel `package.json`.
- Ogni volta che la versione viene aggiornata, deve essere creato un tag git corrispondente (es. `v1.4.0`).

## Installabilità e identità dell'app

- La webapp deve essere installabile come PWA (Progressive Web App): manifest.json con nome, short_name, colori del tema, display standalone, e un service worker minimo per il caching degli asset statici (funzionamento offline di base).
- Ogni webapp deve avere una propria icona (set di icone nelle dimensioni richieste dal manifest, es. 192x192 e 512x512), generata in base allo scopo/tema specifico dell'app — non un'icona generica o quella di default del framework/editor.
- Il service worker deve utilizzare una strategia di fetch "network-first con fallback cache": quando l'utente è online, i contenuti vengono sempre serviti dal network (garantendo l'aggiornamento immediato); la cache viene usata solo come fallback in assenza di connessione (modalità offline).
- Quando il browser rileva un nuovo service worker, la pagina deve ricaricarsi automaticamente per servire la versione aggiornata (auto-reload on SW update).
