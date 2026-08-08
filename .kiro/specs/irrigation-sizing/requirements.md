# Requirements Document

## Introduction

Webapp statica (HTML/CSS/JS, nessun backend) eseguita interamente client-side e ospitata su GitHub Pages. L'applicazione aiuta a gestire l'irrigazione a goccia di vasi su un terrazzo, dove ogni vaso ha un numero variabile di gocciolatori con portata regolabile, ma tutti i vasi condividono la stessa valvola e lo stesso tempo di apertura. L'applicazione offre due modalità operative: Verifica (calcola i litri erogati dati portata e tempo) e Taratura (calcola la portata necessaria dati i litri desiderati e il tempo).

## Glossary

- **Sistema**: la webapp di irrigazione, eseguita interamente nel browser senza backend
- **Vaso**: unità di irrigazione con un nome/etichetta e uno o più gocciolatori
- **Gocciolatore**: erogatore con portata tarabile, con range valido 1–8 l/h
- **Tempo_di_accensione**: durata in minuti in cui la valvola resta aperta; valore unico e condiviso tra tutti i vasi, impostabile tramite uno slider (range input) con intervallo 0–60 minuti, step 1 minuto (solo valori interi)
- **Modalità_Verifica**: modalità in cui, dati portata gocciolatori e tempo, il Sistema calcola i litri erogati per vaso
- **Modalità_Taratura**: modalità in cui, dati litri desiderati per vaso e tempo, il Sistema calcola la portata necessaria per i gocciolatori
- **Portata**: flusso del gocciolatore espresso in litri/minuto (l/min), litri/ora (l/h) o gocce/minuto (gocce/min)
- **Fattore_di_conversione**: parametro configurabile per la conversione gocce→ml (default: 20 gocce = 1 ml)
- **localStorage**: meccanismo di persistenza lato browser utilizzato per salvare la configurazione
- **Irrigation Sizer**: il nome dell'applicazione (ex "Irrigazione Terrazzo")

## Requirements

### Requirement 1: Visualizzazione elenco vasi all'avvio

**User Story:** Come utente, voglio vedere l'elenco dei vasi configurati all'apertura della webapp, così da avere subito la situazione sotto controllo.

#### Acceptance Criteria

1. WHEN l'utente apre la webapp, THE Sistema SHALL mostrare l'elenco dei vasi salvati in localStorage, visualizzando per ciascun vaso il nome/etichetta e il numero di gocciolatori configurati, nell'ordine in cui sono stati creati dall'utente
2. IF non esistono dati in localStorage (primo accesso o dopo un reset), THEN THE Sistema SHALL mostrare un elenco vuoto con un elemento interattivo (pulsante o link) che invita ad aggiungere il primo vaso e permette di avviare direttamente l'aggiunta
3. IF i dati in localStorage risultano non validi o corrotti (formato non riconosciuto o parsing fallito), THEN THE Sistema SHALL sempre mostrare un messaggio di errore indicante il problema di lettura dei dati e un elenco vuoto, indipendentemente dalla gravità della corruzione, e non alterare i dati in localStorage fino a un'azione esplicita dell'utente

### Requirement 2: Aggiunta di un vaso

**User Story:** Come utente, voglio aggiungere nuovi vasi alla configurazione, così da rappresentare tutti i vasi del mio terrazzo.

#### Acceptance Criteria

1. WHEN l'utente richiede di aggiungere un vaso, THE Sistema SHALL presentare un campo per il nome/etichetta (massimo 40 caratteri) e un campo per il numero di gocciolatori (valore intero compreso tra 1 e 20)
2. IF l'utente non specifica un nome per il vaso, THEN THE Sistema SHALL assegnare un nome di default nel formato "Vaso N" dove N è il più piccolo intero positivo non ancora utilizzato come default tra i vasi attualmente presenti nella configurazione
3. WHEN l'utente conferma il numero di gocciolatori per un vaso, THE Sistema SHALL generare un campo di portata per ciascun gocciolatore del vaso, con valore iniziale vuoto e range ammesso equivalente a 1–8 l/min
4. IF l'utente inserisce un numero di gocciolatori fuori dal range 1–20 o un valore non intero, THEN THE Sistema SHALL segnalare l'errore visivamente accanto al campo e impedire la conferma fino alla correzione del valore
5. WHEN l'utente preme Conferma e il vaso viene creato, THE Sistema SHALL chiudere automaticamente il pannello di inserimento
6. WHEN il vaso è in modalità 'stessa portata', THE Sistema SHALL mostrare un campo numerico editabile per modificare il numero di gocciolatori (1–20) in qualsiasi momento

### Requirement 3: Configurazione portata gocciolatori

**User Story:** Come utente, voglio configurare la portata dei gocciolatori di ciascun vaso, così da rispecchiare la configurazione reale o impostare valori target.

#### Acceptance Criteria

1. THE Sistema SHALL permettere di impostare una portata comune a tutti i gocciolatori di un vaso tramite un singolo campo ("stessa portata per tutti"), accettando valori il cui equivalente in litri/ora sia compreso tra 1 e 8
2. THE Sistema SHALL permettere di impostare una portata indipendente per ciascun gocciolatore ("portate differenziate"), accettando per ciascuno valori il cui equivalente in litri/ora sia compreso tra 1 e 8
3. WHEN l'utente passa dalla modalità "stessa portata" a "portate differenziate", THE Sistema SHALL copiare il valore comune in ciascun campo gocciolatore, mantenendo l'unità di misura selezionata
4. WHEN l'utente passa esplicitamente dalla modalità "portate differenziate" a "stessa portata" e tutti i gocciolatori hanno lo stesso valore e la stessa unità, THE Sistema SHALL utilizzare quel valore come portata comune; il passaggio avviene solo su azione esplicita dell'utente (mai automaticamente)
5. IF l'utente passa dalla modalità "portate differenziate" a "stessa portata" e i gocciolatori hanno valori o unità diversi tra loro, THEN THE Sistema SHALL impostare il campo comune con il valore del primo gocciolatore e segnalare visivamente che i valori differenti sono stati sovrascritti
6. THE Sistema SHALL permettere di esprimere la portata di ciascun gocciolatore in una delle seguenti unità: litri/minuto, litri/ora, gocce/minuto
7. THE Sistema SHALL permettere di impostare l'unità di misura per ogni singolo gocciolatore indipendentemente dagli altri gocciolatori dello stesso vaso
8. WHEN il Sistema esegue calcoli interni, THE Sistema SHALL convertire tutte le portate in litri/minuto utilizzando le seguenti regole: litri/ora diviso 60; gocce/minuto diviso (Fattore_di_conversione × 1000), dove Fattore_di_conversione è configurabile dall'utente con un valore predefinito di 20 gocce = 1 ml e un range ammesso tra 5 e 100 gocce per ml
9. THE Sistema SHALL mostrare all'utente il valore della portata nell'unità di misura originariamente selezionata dall'utente

### Requirement 4: Fattore di conversione gocce

**User Story:** Come utente, voglio poter configurare il fattore di conversione gocce→ml, così da adattare il calcolo al tipo di gocciolatore in uso.

#### Acceptance Criteria

1. THE Sistema SHALL fornire un parametro configurabile per il Fattore_di_conversione gocce→ml con valore di default pari a 20 gocce = 1 ml, accettando valori interi compresi tra 1 e 100 gocce per ml
2. WHEN l'utente modifica il Fattore_di_conversione, THE Sistema SHALL ricalcolare immediatamente tutte le portate espresse in gocce/minuto convertendole in litri/minuto tramite la formula portata_lpm = (gocce_al_minuto / fattore_conversione) / 1000, aggiornando i risultati nelle modalità Verifica e Taratura
3. IF l'utente inserisce un valore per il Fattore_di_conversione minore di 1, maggiore di 100, non numerico o vuoto, THEN THE Sistema SHALL segnalare visivamente l'errore e mantenere l'ultimo valore valido per i calcoli
4. THE Sistema SHALL salvare il Fattore_di_conversione in localStorage insieme alla configurazione dei vasi, ripristinandolo al successivo accesso

### Requirement 5: Validazione portata gocciolatori

**User Story:** Come utente, voglio essere avvisato se una portata è fuori dal range supportato dal gocciolatore, così da evitare configurazioni non realizzabili.

#### Acceptance Criteria

1. WHEN l'utente inserisce o modifica una portata per un gocciolatore (espressa in litri/minuto, litri/ora o gocce/minuto), THE Sistema SHALL convertire il valore nell'equivalente in litri/ora usando il fattore di conversione configurato e validare che il risultato sia compreso tra 1 e 8 l/h (estremi inclusi) entro 500 ms dalla modifica
2. IF la portata convertita risulta inferiore a 1 l/h o superiore a 8 l/h, THEN THE Sistema SHALL evidenziare il campo con bordo rosso e mostrare un messaggio di avviso indicante il range consentito e il valore convertito corrente, senza bloccare l'inserimento né cancellare il valore digitato
3. WHEN la portata convertita torna nel range 1–8 l/h (estremi inclusi), THE Sistema SHALL rimuovere il bordo rosso e il messaggio di avviso entro 500 ms dalla modifica
4. IF il campo portata è vuoto, contiene il valore zero, o contiene un valore non numerico, THEN THE Sistema SHALL non mostrare l'avviso di range (nessun bordo rosso né messaggio di warning) ed escludere il gocciolatore dai calcoli finché non viene inserito un valore numerico positivo valido
5. IF l'unità di misura è gocce/min, THEN THE Sistema SHALL accettare e mostrare solo valori interi (numeri senza decimali)

### Requirement 6: Rimozione e duplicazione vasi

**User Story:** Come utente, voglio poter rimuovere vasi non più necessari o duplicare vasi simili, così da gestire rapidamente la configurazione.

#### Acceptance Criteria

1. WHEN l'utente richiede la rimozione di un vaso, THE Sistema SHALL richiedere conferma dell'azione e, solo dopo conferma, eliminare atomicamente il vaso e tutti i relativi gocciolatori dalla configurazione in un'unica operazione indivisibile
2. WHEN l'utente richiede la rimozione di un singolo gocciolatore da un vaso, THE Sistema SHALL eliminare solo quel gocciolatore mantenendo gli altri
3. IF il vaso contiene un solo gocciolatore e l'utente richiede la rimozione di quel gocciolatore, THEN THE Sistema SHALL impedire la rimozione e indicare che un vaso deve contenere almeno 1 gocciolatore
4. WHEN l'utente richiede la duplicazione di un vaso, THE Sistema SHALL creare un nuovo vaso con la stessa configurazione (numero di gocciolatori, portate, unità di misura) e un nome generato aggiungendo un suffisso numerico incrementale al nome originale (es. "Geranio" → "Geranio (2)")
5. WHEN un vaso o gocciolatore viene rimosso o un vaso viene duplicato, THE Sistema SHALL aggiornare automaticamente il localStorage con la configurazione risultante

### Requirement 7: Persistenza in localStorage

**User Story:** Come utente, voglio che la configurazione venga salvata automaticamente, così da ritrovarla al prossimo accesso senza doverla reinserire.

#### Acceptance Criteria

1. WHEN l'utente modifica la configurazione dei vasi (aggiunta, rimozione, modifica portate, modifica unità di misura dei gocciolatori, modifica del fattore di conversione goccia→ml), THE Sistema SHALL salvare lo stato completo in localStorage entro 1 secondo dalla modifica, includendo: elenco vasi con nomi, numero e portate dei gocciolatori, unità di misura per ciascun gocciolatore, e fattore di conversione configurato
2. WHEN l'utente richiede il reset della configurazione, THE Sistema SHALL richiedere una conferma esplicita prima di procedere; WHEN l'utente conferma il reset, THE Sistema SHALL cancellare tutti i dati salvati in localStorage e ripristinare lo stato iniziale (nessun vaso configurato, fattore di conversione al valore di default)
3. WHEN l'utente apre la webapp e localStorage contiene dati salvati in precedenza, THE Sistema SHALL caricare e ripristinare integralmente la configurazione salvata (vasi, gocciolatori, portate, unità, fattore di conversione), presentandola come era all'ultima modifica
4. IF i dati in localStorage risultano assenti, corrotti o non interpretabili al caricamento, THEN THE Sistema SHALL avviare l'applicazione con lo stato iniziale vuoto (nessun vaso, fattore di conversione al valore di default), mostrare una notifica non bloccante (toast o banner) informando l'utente della perdita di configurazione dovuta a dati corrotti, e permettere la normale prosecuzione dell'uso

### Requirement 8: Esportazione e importazione configurazione

**User Story:** Come utente, voglio poter esportare e importare la configurazione, così da fare backup o condividerla tra dispositivi.

#### Acceptance Criteria

1. WHEN l'utente richiede l'esportazione, THE Sistema SHALL generare un file JSON scaricabile contenente la configurazione completa (nomi vasi, numero gocciolatori, portate, unità di misura di ciascun gocciolatore, Fattore_di_conversione)
2. WHEN l'utente seleziona un file JSON da importare, THE Sistema SHALL mostrare una richiesta di conferma prima di sovrascrivere la configurazione corrente con quella contenuta nel file
3. IF il file importato non è in formato JSON valido o non contiene tutti i campi obbligatori della configurazione (nomi vasi, numero gocciolatori, portate, unità di misura, Fattore_di_conversione), THEN THE Sistema SHALL mostrare un messaggio di errore che indichi il tipo di problema riscontrato (JSON non valido, campi mancanti, o valori fuori range) senza alterare la configurazione corrente
4. IF il file importato contiene valori di portata che, convertiti in l/min, risultano inferiori a 1 o superiori a 8, THEN THE Sistema SHALL importare la configurazione e segnalare visivamente i gocciolatori con portata fuori range, come previsto dal Requisito 5

### Requirement 9: Modalità Verifica — calcolo litri erogati

**User Story:** Come utente, voglio calcolare quanti litri eroga ciascun vaso con la configurazione attuale, così da verificare che ogni pianta riceva la giusta quantità d'acqua.

#### Acceptance Criteria

1. WHEN l'utente seleziona la Modalità_Verifica, THE Sistema SHALL mostrare per ogni vaso i campi portata dei gocciolatori e un unico slider Tempo_di_accensione (range input con intervallo 0–60 minuti, step 1 minuto (solo minuti interi)) condiviso da tutti i vasi, con un'etichetta numerica accanto allo slider che mostra il valore corrente selezionato in minuti
2. WHEN l'utente modifica il Tempo_di_accensione o una portata di un gocciolatore, THE Sistema SHALL ricalcolare entro 200 ms il volume totale d'acqua erogato per ciascun vaso come somma delle portate dei gocciolatori del vaso (convertite in l/min) moltiplicata per il Tempo_di_accensione
3. THE Sistema SHALL mostrare il risultato per ciascun vaso in litri arrotondati a 2 cifre decimali
4. THE Sistema SHALL mostrare il totale complessivo d'acqua erogata (somma di tutti i vasi) in litri arrotondati a 2 cifre decimali. THE Sistema SHALL mostrare il totale complessivo d'acqua erogata in entrambe le modalità (Verifica e Taratura)
5. IF lo slider Tempo_di_accensione è posizionato su 0, THEN THE Sistema SHALL inibire il calcolo e mostrare un messaggio indicante che il tempo deve essere maggiore di zero per effettuare il calcolo

### Requirement 10: Modalità Taratura — calcolo portata necessaria

**User Story:** Come utente, voglio calcolare la portata a cui impostare i gocciolatori per ottenere i litri desiderati, così da tarare correttamente l'impianto.

#### Acceptance Criteria

1. WHEN l'utente seleziona la Modalità_Taratura, THE Sistema SHALL mostrare per ogni vaso un campo "litri desiderati" (valore numerico positivo, massimo 2 decimali, range 0.01–999.99 litri) e un unico slider Tempo_di_accensione (range input con intervallo 0–60 minuti, step 1 minuto (solo minuti interi)) condiviso da tutti i vasi, con un'etichetta numerica accanto allo slider che mostra il valore corrente selezionato in minuti
2. WHEN l'utente modifica il Tempo_di_accensione o i litri desiderati per un vaso, THE Sistema SHALL ricalcolare in tempo reale la portata necessaria per gocciolatore come (litri_desiderati / Tempo_di_accensione / numero_gocciolatori) e mostrare il risultato con precisione di 2 decimali
3. THE Sistema SHALL mostrare il risultato della taratura con un selettore di unità di misura inline per ciascun vaso (in modalità uniforme) o per ciascun gocciolatore (in modalità differenziata). L'unità di default corrisponde a quella configurata per i gocciolatori del vaso. Quando l'unità selezionata è gocce/min, il risultato deve essere arrotondato all'intero più vicino.
4. IF la portata calcolata per un gocciolatore è inferiore a 1 l/min, THEN THE Sistema SHALL segnalare visivamente il valore fuori range e mostrare un Tempo_di_accensione alternativo calcolato come litri_desiderati / (numero_gocciolatori × 1) che riporterebbe la portata al limite minimo
5. IF la portata calcolata per un gocciolatore è superiore a 8 l/min, THEN THE Sistema SHALL segnalare visivamente il valore fuori range e mostrare un Tempo_di_accensione alternativo calcolato come litri_desiderati / (numero_gocciolatori × 8) che riporterebbe la portata al limite massimo

### Requirement 11: Ripartizione non uniforme in taratura

**User Story:** Come utente avanzato, voglio poter specificare pesi diversi tra i gocciolatori di uno stesso vaso, così da erogare più acqua in punti specifici del vaso.

#### Acceptance Criteria

1. WHERE l'utente abilita la ripartizione non uniforme per un vaso, THE Sistema SHALL permettere di specificare un peso numerico per ciascun gocciolatore del vaso, con valore di default pari a 1 e range ammesso da 1 a 10 (incrementi di 0.1)
2. WHEN i pesi sono specificati e l'utente inserisce i litri desiderati, THE Sistema SHALL calcolare la portata di ciascun gocciolatore come: portata_i = (peso_i / somma_di_tutti_i_pesi) × (litri_desiderati / Tempo_di_accensione)
3. IF l'utente inserisce un peso pari a zero, negativo o non numerico per un gocciolatore, THEN THE Sistema SHALL segnalare il valore non valido e bloccare tutti i calcoli per quel vaso fino a quando ogni gocciolatore del vaso ha un peso valido

### Requirement 12: Navigazione tra modalità

**User Story:** Come utente, voglio passare liberamente tra modalità Verifica e Taratura senza perdere dati, così da confrontare facilmente i risultati.

#### Acceptance Criteria

1. WHEN l'utente cambia dalla Modalità_Verifica alla Modalità_Taratura (o viceversa), THE Sistema SHALL mantenere integralmente la configurazione dei vasi (nomi, numero di gocciolatori, portate impostate, unità di misura selezionate) e il Tempo_di_accensione già inserito, indipendentemente dalla completezza dei dati (configurazioni parziali incluse)
2. THE Sistema SHALL permettere di passare da una modalità all'altra tramite un controllo sempre presente nell'area visibile senza necessità di scorrimento (posizione fissa o in cima alla pagina)
3. WHEN l'utente passa dalla Modalità_Taratura alla Modalità_Verifica e poi torna alla Modalità_Taratura, THE Sistema SHALL mantenere i valori di "litri desiderati" precedentemente inseriti per ciascun vaso
4. WHEN l'utente effettua il cambio di modalità, THE Sistema SHALL completare la transizione con una singola interazione (un solo tap o click sul controllo di navigazione)

### Requirement 13: Validazione tempo di accensione

**User Story:** Come utente, voglio che il sistema impedisca calcoli con tempo non valido, così da evitare risultati errati o divisioni per zero.

#### Acceptance Criteria

1. IF lo slider Tempo_di_accensione è posizionato su 0, THEN THE Sistema SHALL impedire il calcolo, nascondere eventuali risultati precedentemente mostrati per tutti i vasi, e mostrare un messaggio indicante che il tempo deve essere maggiore di zero; i messaggi di validazione dei singoli campi (es. portata fuori range) possono comunque rimanere visibili indipendentemente dallo stato dei calcoli
2. THE Sistema SHALL garantire tramite lo slider che il Tempo_di_accensione sia sempre un valore numerico compreso tra 0 e 60 minuti (step 1 (solo minuti interi)), eliminando la possibilità di input non numerici o fuori range
3. IF un vaso non ha alcun gocciolatore configurato, THEN THE Sistema SHALL escludere quel vaso dai calcoli e indicarlo visivamente (ad esempio con un'icona o un'etichetta accanto al nome del vaso) informando l'utente che il vaso non partecipa ai calcoli perché privo di gocciolatori
4. WHEN lo slider Tempo_di_accensione viene spostato da 0 a un valore positivo, THE Sistema SHALL abilitare immediatamente il calcolo e aggiornare i risultati per tutti i vasi
5. THE Sistema SHALL mostrare un indicatore visivo positivo (come un segno di spunta) accanto ai vasi che hanno gocciolatori configurati, per confermare visivamente che sono inclusi nei calcoli

### Requirement 14: Funzionamento client-side

**User Story:** Come utente, voglio che la webapp funzioni senza connessione a server esterni, così da poterla usare in qualsiasi condizione di rete.

#### Acceptance Criteria

1. THE Sistema SHALL funzionare interamente lato client senza effettuare alcuna richiesta di rete a runtime (nessuna chiamata API, nessun caricamento da CDN, nessun font o script esterno)
2. THE Sistema SHALL utilizzare esclusivamente localStorage come meccanismo di persistenza dei dati
3. WHEN la webapp è stata caricata completamente almeno una volta, THE Sistema SHALL rimanere pienamente utilizzabile sia in modalità online che offline, senza alcuna dipendenza dalla connessione di rete per le funzionalità applicative
4. IF localStorage non è disponibile o la quota di archiviazione è esaurita, THEN THE Sistema SHALL mostrare un messaggio informativo all'utente e continuare a funzionare nella sessione corrente senza persistenza

### Requirement 15: Layout responsive e mobile-first

**User Story:** Come utente, voglio usare la webapp da smartphone mentre sono in terrazzo a regolare i gocciolatori, così da avere le informazioni a portata di mano.

#### Acceptance Criteria

1. THE Sistema SHALL presentare un layout responsive che non richieda scroll orizzontale su viewport con larghezza da 320px a 428px, impostando il meta viewport a width=device-width con initial-scale=1
2. THE Sistema SHALL dimensionare tutti i campi di input e i pulsanti con area minima di tocco pari a 44×44 pixel CSS
3. THE Sistema SHALL mantenere una spaziatura minima di 8px tra elementi interattivi adiacenti (pulsanti, link, campi di input) per prevenire attivazioni accidentali
4. THE Sistema SHALL utilizzare una dimensione minima del testo di 16px per i campi di input e di 14px per le etichette, in modo che il contenuto sia leggibile senza necessità di zoom
5. WHILE il viewport ha larghezza inferiore a 428px, THE Sistema SHALL disporre gli elementi dell'interfaccia in una singola colonna verticale

### Requirement 16: Interfaccia in italiano

**User Story:** Come utente italiano, voglio un'interfaccia nella mia lingua, così da comprendere immediatamente tutte le etichette e i messaggi.

#### Acceptance Criteria

1. THE Sistema SHALL presentare in lingua italiana tutti i testi generati dall'applicazione, inclusi: etichette dei campi, testi dei pulsanti, messaggi di errore e di conferma, testi segnaposto (placeholder) nei campi di input, e testi di aiuto o suggerimento
2. THE Sistema SHALL utilizzare le abbreviazioni standard italiane per le unità di misura (l/min, l/h, gocce/min, ml) senza necessità di traduzione ulteriore
3. IF un elemento testuale dell'interfaccia risulta in una lingua diversa dall'italiano (esclusi i dialoghi nativi del browser, i nomi dei file, e i termini tecnici privi di equivalente italiano consolidato come "localStorage", "JSON", "GitHub Pages"), THEN THE Sistema SHALL essere considerato non conforme a questo requisito

### Requirement 17: Tema scuro (dark mode)

**User Story:** Come utente, voglio una modalità dark per usare la webapp in terrazzo di sera senza essere abbagliato.

#### Acceptance Criteria

1. THE Sistema SHALL offrire un controllo (toggle) sempre visibile nell'interfaccia per attivare e disattivare il tema scuro
2. WHEN l'utente attiva il tema scuro, THE Sistema SHALL applicare uno sfondo scuro e colori di primo piano con rapporto di contrasto minimo 4.5:1 (WCAG AA) a tutti gli elementi dell'interfaccia entro 300ms
3. WHEN l'utente modifica la preferenza del tema, THE Sistema SHALL salvare la scelta in localStorage e ripristinarla automaticamente alle visite successive
4. WHEN l'utente apre la webapp per la prima volta (nessuna preferenza salvata in localStorage), THE Sistema SHALL rilevare la preferenza di sistema del dispositivo (prefers-color-scheme): se il sistema indica preferenza per il tema scuro, utilizzare il tema scuro; altrimenti utilizzare il tema chiaro come default

### Requirement 18: Semplicità di deploy

**User Story:** Come sviluppatore, voglio che la webapp sia pubblicabile direttamente su GitHub Pages senza build step complessi.

#### Acceptance Criteria

1. THE Sistema SHALL essere composto da file HTML, CSS e JavaScript pubblicabili direttamente su GitHub Pages servendo il contenuto di un branch (gh-pages) o di una cartella (/docs) senza necessità di processi server-side
2. IF viene utilizzato un framework o bundler, THEN THE Sistema SHALL produrre output interamente statico (solo file .html, .css, .js e asset) tramite un singolo comando di build locale eseguibile senza dipendenze server-side
3. THE Sistema SHALL funzionare correttamente quando servito da un path relativo (senza richiedere un dominio root), garantendo che tutti i riferimenti a risorse interne utilizzino percorsi relativi
4. IF un nuovo sviluppatore clona il repository, THEN THE Sistema SHALL essere deployabile su GitHub Pages eseguendo al massimo 3 comandi da terminale documentati nel README

### Requirement 19: Vasi collassabili

**User Story:** Come utente, voglio poter comprimere i vasi nell'elenco così da avere una vista compatta di tutti i risultati senza dover scrollare molto.

#### Acceptance Criteria

1. THE Sistema SHALL permettere di espandere/comprimere ogni vaso cliccando/toccando l'header del vaso
2. WHEN un vaso è compresso, THE Sistema SHALL mostrare solo il nome del vaso e un riepilogo compatto del risultato sulla stessa riga
3. WHEN un vaso è compresso in Modalità_Verifica, THE Sistema SHALL mostrare accanto al nome i litri erogati (es. "1.33 l")
4. WHEN un vaso è compresso in Modalità_Taratura con portata uniforme, THE Sistema SHALL mostrare accanto al nome la portata necessaria con selettore unità inline
5. WHEN un vaso è compresso in Modalità_Taratura con portate differenziate, THE Sistema SHALL mostrare "..." ad indicare che è necessario espandere per visualizzare i dettagli
6. WHEN un vaso è compresso, THE Sistema SHALL nascondere i pulsanti di azione (Duplica, Rimuovi), i toggle di configurazione, e i campi di input

### Requirement 20: Separazione impostazioni dalla funzionalità principale

**User Story:** Come utente, voglio che le impostazioni avanzate (fattore di conversione, import/export, reset) siano separate dalla schermata principale, così da non ingombrare l'interfaccia durante l'uso quotidiano.

#### Acceptance Criteria

1. THE Sistema SHALL presentare le impostazioni (fattore di conversione, esportazione, importazione, reset) in un pannello separato accessibile tramite un pulsante nell'header
2. WHEN l'utente apre il pannello impostazioni, THE Sistema SHALL mostrare un overlay sopra il contenuto principale
3. THE Sistema SHALL permettere di chiudere il pannello impostazioni tramite un pulsante di chiusura o cliccando sullo sfondo dell'overlay

### Requirement 21: Versionamento visibile

**User Story:** Come utente, voglio vedere la versione corrente dell'app così da sapere sempre quale versione sto utilizzando.

#### Acceptance Criteria

1. THE Sistema SHALL mostrare il numero di versione corrente (formato x.x.x) nel footer della pagina, allineato a destra
2. THE Sistema SHALL mantenere la versione in un file dedicato (js/version.js) e aggiornarla ad ogni release

### Requirement 22: PWA e funzionamento offline

**User Story:** Come utente, voglio poter installare la webapp sul mio smartphone e utilizzarla anche senza connessione.

#### Acceptance Criteria

1. THE Sistema SHALL essere installabile come PWA tramite manifest.json con nome, icona dedicata, e display standalone
2. THE Sistema SHALL utilizzare un service worker con strategia network-first per garantire aggiornamenti immediati quando online e funzionamento offline quando senza rete
3. WHEN il browser rileva un nuovo service worker, THE Sistema SHALL ricaricare automaticamente la pagina per servire la versione aggiornata
