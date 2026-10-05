<img src="assets/georgie.gif" alt="avatar animato di georgie" width=15%>

🇬🇧 [English](README.md) · 🇮🇹 Italiano · 🇪🇸 [Español](README.es.md)

# georgie

un'app web per gestire la nostra biblioteca fisica di casa — sfogliare, catalogare, prestare e scambiare i libri sugli scaffali.

**georgie** era il soprannome di famiglia di jorge luis borges, ereditato dal lato inglese della sua famiglia. prima di essere lo scrittore che immaginò il paradiso come una specie di biblioteca, era un bambino chiamato georgie che crebbe girovagando per la biblioteca di suo padre a buenos aires — il luogo che avrebbe mitizzato per il resto della sua vita, e al quale sarebbe infine tornato come direttore della biblioteca nazionale argentina. questo progetto prende in prestito il suo soprannome per una biblioteca molto più piccola: quella di casa.

> live su [georgie.leandroestrella.com](https://georgie.leandroestrella.com/)

## come funziona?

il catalogo vive in un piccolo database dietro un backend che risponde in una frazione di secondo. un google sheet ne resta una copia completa e modificabile, tenuta sincronizzata nei due sensi: una modifica fatta nell'app arriva nel foglio pochi secondi dopo, e una modifica fatta nel foglio arriva nell'app la prossima volta che qualcuno la apre (o subito, dal menu "sync" del foglio). un'app web statica legge e mostra il catalogo pubblicamente; gli admin accedono con google per apportare modifiche.

```mermaid
%{init: {'theme': 'dark'}}%
flowchart LR
    V[visitatore] -->|sfoglia, cerca, filtra| SPA[app web georgie]
    A[admin] -->|accesso con google| SPA
    A -.->|scansiona codice a barre / cerca isbn| SPA
    SPA -->|letture, e scritture con una sessione| API[backend: cloudflare worker]
    API --> DB[(database)]
    API <-->|sincronizzazione, nei due sensi| SHEET[(google sheet privato)]
    A -.->|modifiche in blocco| SHEET
    SPA -->|metadati| EXT[google books / open library]
    SPA -->|copertine| COV[il tuo host / open library / amazon]
```

## funzionalità

- 📚 catalogo pubblico, di sola lettura — ricerca istantanea; filtra per zona, tema, autore, proprietario, lingua, letto da e stato; ordina per titolo, autore o anno; viste a schede e a tabella, entrambe responsive fino al telefono
- 🔎 dettagli del libro recuperati dal web tramite isbn (google books → open library), riempiendo solo i campi vuoti; ricerca per titolo e autore con selezione tra i candidati per i libri senza isbn
- 📷 **scansione codice a barre** — punta la fotocamera del telefono sul codice a barre in quarta di copertina (l'ean-13 *è* l'isbn) per cercare un libro; nativa su android, con un decoder caricato al bisogno su ios
- 🖼 copertine con una catena di fallback: url salvato → open library → amazon per isbn-10 → un segnaposto colorato secondo la zona; gli admin possono fissare la copertina mostrata — o scattare una foto del libro — sul proprio host, così non scompare mai
- ✏️ accesso admin per aggiungere, modificare, archiviare (eliminazione soft, con una vista archiviati + ripristino) e prestare libri
- 🧹 un filtro "da completare" (anno mancante, `circa`, senza copertina, senza lingua originale) — lo strumento per completare il catalogo direttamente dallo scaffale
- 🤝 tracciamento dei prestiti — presta un libro (chi lo prende + data), segnalo reso; un flusso di scambio a tappe (offerto → confermato → in transito → ricevuto) per i libri scambiati su piattaforme di scambio libri, che collega il libro in uscita al suo sostituto in arrivo
- 🗂 categorie guidate dal foglio stesso: zone (con i propri colori, ed emoji o immagini come marcatori) che raggruppano i temi, rispecchiando gli scaffali fisici; anche i badge di proprietario e lettore vengono dal foglio
- 🌍 interfaccia in english, italiano ed español (si traducono anche i nomi di zone/temi/lingue e le descrizioni di zone e temi)
- 🪪 id leggibili in stile numero di catalogo (`ORW-198-1950`), generati una sola volta e immutabili
- 📊 una pagina **statistiche** riservata agli admin — libri per zona (con il dettaglio dei temi di ogni zona), per lingua, in lingua originale vs tradotti, e statistiche di lettura per utente; ogni dato rimanda alla vista filtrata corrispondente del catalogo
- 🕘 un **registro attività** riservato agli admin — ogni aggiunta, modifica, archiviazione, ripristino, prestito e reso, dal più recente, con chi l'ha fatto, cosa è cambiato, e un link al libro
- 📖 una pagina **info** nell'app — il readme del progetto, mostrata a partire dall'avatar di georgie — con un footer che rimanda al codice sorgente e all'autore
- 🗄️ backup giornalieri dell'intero foglio, prelevati da un cron job su cPanel tramite un service account Google ed esportati in XLSX, protetti da un `.htaccess` che nega ogni accesso — la rotazione mantiene gli ultimi 14 giornalieri più 6 mensili (opzionale, configurazione self-hosted)

## stack tecnologico

- [vite](https://vitejs.dev/) + [react](https://react.dev/) + [typescript](https://www.typescriptlang.org/) — frontend statico
- [tailwind css](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) — stile e componenti
- [react-router](https://reactrouter.com/) — routing lato client
- [react-i18next](https://react.i18next.com/) — internazionalizzazione (english / italiano / español)
- [zxing-wasm](https://github.com/Sec-ant/zxing-wasm) — scansione codici a barre, con il `BarcodeDetector` nativo del browser quando disponibile
- [pomuku](https://github.com/leandroestrella/pomuku) — i pacchetti condivisi su cui georgie è costruita: componenti e tema, accesso, client dei dati, traduzioni, e il nucleo del backend
- [hono](https://hono.dev) su [cloudflare workers](https://workers.cloudflare.com/) + [d1](https://developers.cloudflare.com/d1/) — l'api di backend e il suo database (basta il piano gratuito)
- [google identity services](https://developers.google.com/identity) — accesso admin
- [google sheets](https://www.google.com/sheets/about/) — la copia modificabile del database, tenuta sincronizzata nei due sensi; un piccolo [apps script](https://developers.google.com/apps-script) aggiunge al foglio il menu "sync"
- [ftp-deploy-action](https://github.com/SamKirkland/FTP-Deploy-Action) — deploy su cpanel a ogni push su `master`
- php — due piccoli script cpanel: upload delle copertine e il backup giornaliero del foglio (vedi [cpanel/README.md](cpanel/README.md), [docs/backups.md](docs/backups.md)); nient'altro nello stack usa php

## struttura del repository

```
web/          la spa (vite + react)
server/       il backend: un cloudflare worker con il suo database, tenuto sincronizzato con il foglio
apps-script/  lo script del foglio: il suo menu "sync"
cpanel/       php opzionale: hosting delle copertine e lo script cron per il backup del foglio
docs/         guide per chi gestisce il catalogo (id dei libri, marcatori del foglio, traduzioni)
assets/       materiale grafico del brand
```

## avvia la tua istanza

georgie è un template per chiunque voglia catalogare i propri scaffali:

1. copia il template del google sheet — una scheda `Catalog` con le colonne dei libri, una scheda `Zones` che definisce le tue categorie, una scheda `Lists` per proprietari/lingue, e una scheda `Users` con chi può apportare modifiche (le intestazioni di colonna esatte sono in [docs/sheet-setup.md](docs/sheet-setup.md)). tienilo **privato** (l'app lo legge tramite il backend, quindi non deve mai essere condiviso via link)
2. crea un google oauth client id (applicazione web) per il pulsante di accesso; aggiungi l'origine del tuo sito alle sue authorized javascript origins
3. distribuisci il backend — un cloudflare worker con un database d1, collegato al tuo foglio tramite un service account di google — seguendo [server/README.md](server/README.md). il suo primo "sync now" importa il tuo foglio
4. copia `web/.env.example` in `web/.env.local` e compila `VITE_API_URL` (l'indirizzo del tuo worker) e `VITE_GOOGLE_CLIENT_ID` — sono entrambi pubblici, quindi possono anche vivere nei repo secrets di github per l'azione di deploy
5. `npm install` in `server/` e in `web/` (l'app web importa lo schema del backend), poi `npm run build` in `web/`, e ospita la cartella `dist/` ovunque tu abbia hosting statico (è incluso un `.htaccess` per il routing spa + header di base per apache/cpanel)
6. *(opzionale)* per permettere agli admin di salvare le copertine sul tuo host, copia [`cpanel/upload-cover.php`](cpanel/upload-cover.php) sul server e dai al worker il suo indirizzo e il segreto — vedi [cpanel/README.md](cpanel/README.md)
7. *(opzionale)* per i backup giornalieri del foglio, copia [`cpanel/backup/run-backup.php`](cpanel/backup/run-backup.php) sul server e aggiungi un Cron Job su cPanel — vedi [docs/backups.md](docs/backups.md)

entrambi i valori di configurazione sono sicuri da pubblicare (il client id oauth è pubblico per design, e ogni scrittura è protetta lato server: richiede la sessione di qualcuno presente nella scheda `Users`) — nessun segreto finisce mai nel repository.

## guide per chi gestisce il catalogo

le guide pratiche per la gestione quotidiana del catalogo vivono in [`docs/`](docs/):

- [impostazione del foglio](docs/sheet-setup.md) — lo schema esatto delle colonne `Catalog` / `Zones` / `Lists`
- [id dei libri](docs/book-ids.md) — come vengono generati gli id in stile numero di catalogo, aggiungere libri direttamente nel foglio, e il raro caso di rigenerazione manuale
- [marcatori](docs/markers.md) — i badge di proprietario/lettore/zona guidati dalle colonne del foglio
- [traduzioni](docs/translations.md) — tradurre nomi e descrizioni di zone/temi, e nomi delle lingue
- [hosting delle copertine](cpanel/README.md) — l'endpoint opzionale per ospitare le copertine sul proprio server
- [backup del foglio](docs/backups.md) — il cron job opzionale per il backup giornaliero

## sviluppo

il lavoro avviene sul branch `develop`; il merge su `master` avvia la build e il deploy ftp su cpanel tramite github actions.

```bash
cd server
npm install
npm test        # l'intero backend su un database locale, con un foglio tenuto in memoria

cd ../web
npm install
npm run dev     # gira su dati mock finché VITE_API_URL non è impostata — non serve un backend
npm test        # vitest (il client dell'api, filtri, validazione, metadati)
npm run build   # controllo dei tipi + build di produzione
```

il modello dei dati e le sue regole (colonne, validazione, l'id in stile numero di catalogo) sono scritti una volta sola, in `server/src/schema.ts`, e importati dall'app web — quindi `server/` va installato perché `web/` compili. la logica pura è tenuta priva di dipendenze dal framework, così da poter essere testata senza un foglio live.

## licenza

[apache 2.0](LICENSE)
