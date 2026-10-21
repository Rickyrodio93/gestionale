# Gestionale Appartamenti: stato del progetto

Aggiornato al 21 ottobre 2026. Serve per riprendere il lavoro in una nuova conversazione senza rispiegare tutto.

## 1. Cos'è e come lavoriamo

Gestionale personale di Riccardo Rodio per un portafoglio di immobili (una palazzina con più unità, una unità restaurata per affitti brevi, altre in arrivo).

- Lingua: italiano, sia nell'interfaccia sia nelle spiegazioni.
- Si procede un passo alla volta e si consegnano **file interi** da sostituire, con i comandi PowerShell.
- Non siamo commercialisti: ogni calcolo fiscale è una stima, da far verificare.

## 2. Stack e ambiente

- Next.js (App Router, JavaScript), React, **Tailwind v4**, lucide-react, **Recharts**.
- **Prisma 6** con SQLite locale (`DATABASE_URL="file:./dev.db"` nel `.env`). **Non** usare Prisma 7: non accetta `url` nello schema.
- Cartella: `C:\Users\arodi\Desktop\gestionale`, Windows con PowerShell.
- Se la porta 3000 è occupata Next parte sulla 3001: chiudere i vecchi server (`taskkill /IM node.exe /F`).

### Regole che hanno evitato errori

1. In `schema.prisma` gli enum vanno scritti con **un valore per riga**.
2. Dopo ogni modello nuovo: fermare il server, `npx prisma format`, `npx prisma migrate dev --name ...`, riavviare. Altrimenti compare «Cannot read properties of undefined (reading 'findMany')» perché il client Prisma in memoria è vecchio.
3. Le cartelle con parentesi quadre in PowerShell si creano con `New-Item -ItemType Directory -Force -LiteralPath "src/app/.../[id]"`.
4. Pulire la cache con `Remove-Item -Recurse -Force .next`.
5. I file in `/mnt/project` (sidebar e layout) sono la versione iniziale: quelle vere sono nel progetto, vedi sotto.

## 3. Struttura (`src/`)

```
app/
  page.jsx                      Dashboard
  layout.jsx                    legge il cookie "tema" e mette la classe dark su <html>
  globals.css                   tema scuro per sostituzione dei colori, regole per telefono, stampa
  appartamenti/                 elenco, nuovo, [id]/modifica, actions
  spese/                        elenco (filtri anno, categoria, immobile), nuova, [id]/modifica
    bollette/                   elenco, nuova, [id], [id]/modifica
    ricorrenti/                 elenco, nuova, [id]/modifica
    dilazioni/                  elenco, nuova, [id]   (rateizzazioni della cedolare)
  entrate/                      elenco contratti e incassi affitti brevi
    contratti/                  nuovo, [id], [id]/modifica
    incassi/                    nuovo, [id]/modifica
    inquilini/[id]/             posizione e report dell'inquilino
  investimenti/                 rendimenti
    [tipo]/[id]/                acquisto, vendita, stime di valore, finanziamenti
    omiActions.js               importazione dei file OMI (la sezione OMI sta in fondo alla pagina Investimenti)
    finanziamenti/              elenco, nuovo, [id]
    vendite/                    vendite rateali: elenco, nuova, [id]
  calendario/                   mese, prossimi eventi, sincronizzazione iCal
    prenotazioni/               nuova, [id]/modifica
components/
  Sidebar, AppNav               menu a scomparsa sotto 1024 px, sidebar comprimibile da lg in su
  ThemeToggle, TemaIniziale     tema chiaro/scuro (cookie)
  Tooltip                       fumetto standard con TooltipRighe (sostituisce gli attributi title)
  DashboardCharts               grafici Recharts
  BottoneElimina, BottoneConferma, BottoneStampa, FiltroSelect
  FormUnita, FormContratto, FormRinnovo, FormIncasso, FormSpesa, FormBolletta, FormRicorrente,
  FormDilazione, FormPrenotazione, FormAcquistoVendita, FormVendita, FormFinanziamento,
  FormImportOmi, SezioneOmi (valori OMI dentro Investimenti)
lib/
  prisma, format, ui                       utilità
  imu, scadenze, canoni, bollette, datiBolletta, cauzione, versamenti, rapporto
  cedolare, ricorrenti, riparto, spese, config
  dashboard, redditivita, rendimento, investimento, finanziamento, venditaRateale
  canali, ical, sincronizzaIcal, eventi, omi (lettura file), omiZona (indirizzo → coordinate → zona), valutazioneOmi (calcolo e stime), condizioni
```

## 4. Modello dati (Prisma)

| Area | Modelli |
|---|---|
| Immobili | `Palazzina`, `Unita`, `DatiCatastali`, `ValoreImmobile` (stime: mercato, perizia, OMI) |
| Locazioni lunghe e transitorie | `Inquilino`, `Contratto`, `PagamentoCanone`, `TrattenutaCauzione`, `PagamentoInteresse`, `Versamento`, `Addebito`, `PagamentoAddebito` |
| Utenze | `Contatore`, `Lettura`, `Bolletta`, `Quota`, `Pagamento` |
| Spese | `Spesa`, `SpesaRicorrente`, `DilazioneImposta`, `RataDilazione` |
| Affitti brevi | `Incasso` (netto accreditato dall'agenzia), `Prenotazione` |
| Investimenti | `Finanziamento`, `VenditaRateale`, `RataVendita`, `IncassoVendita` |
| Valutazione | `QuotazioneOmi`, `ZonaOmi` |

Punti da ricordare:

- `Contratto.modalita`: 4+4, 3+2, **transitorio**, altro. Campi utili: `periodicitaMesi` e `ancoraPeriodi` (canone trimestrale in anticipo), `cauzione*`, `inOccupazione`, `dataRilascio`, `rinnovato`, `precedenteId`, `aliquotaCedolare`.
- `Spesa.categoria`: IMU, CEDOLARE, CONDOMINIO, ORDINARIA, STRAORDINARIA, MUTUO, ALTRO. Con `unitaId` e `palazzinaId` entrambi vuoti la spesa vale per **tutti gli immobili** (oppure è la rata di una dilazione).
- `Palazzina` e `Unita` hanno `indirizzo` (via), `civico`, `comune`, `lat`, `lon`. Le unità in palazzina ereditano l'indirizzo dalla palazzina (sull'unità restano vuoti); le autonome hanno il proprio. `Unita.condizioni` (enum CondizioniImmobile: NUOVO, RISTRUTTURATO, NORMALE, DA_RISTRUTTURARE) → fascia OMI: Ottimo, Ottimo, Normale, Scadente.
- `ZonaOmi.linkZona` contiene la chiave `CODICECOMUNE:ZONA` (es. `L682:D8`), perché nei KML reali il campo LinkZona è vuoto.
- `Unita` e `Palazzina` hanno dati di acquisto e vendita (`dataAcquisto`, `prezzoAcquisto`, `costiAcquisto`, ...), `inizioMisura` e `valoreIniziale` (base di partenza), `lat` e `lon`. Su `Unita` anche `omiZona`, `omiTipologia`, `omiStato`.
- Un acquisto in blocco si registra sulla palazzina e le unità lo ereditano.

## 5. Cosa fa ogni sezione

**Appartamenti**: inserimento e modifica di palazzine, unità e unità autonome, con dati catastali obbligatori per l'affitto lungo, dati di acquisto e di affitto breve (agenzia, link iCal).

**Entrate**
- Contratti lunghi e transitori: scadenza, ultimo giorno per la disdetta con semaforo, rinnovo alle stesse condizioni o **con nuove condizioni** (nuovo contratto collegato), occupazione dopo la scadenza, rilascio.
- Canoni incassati con periodicità (mensile, trimestrale in anticipo, unica soluzione), arretrati, «segna incassati i periodi precedenti a».
- **Cauzione**: prospetto a fine contratto, trattenute, liquidazione e annullo. **Interessi legali sulla cauzione**: maturano giorno per giorno dal versamento, per anno solare, al tasso legale dell'anno (tabella in `lib/interessiCauzione.js`) o a un tasso personalizzato per contratto; tabella per anno nella scheda del contratto e nel report dell'inquilino (stampabile), registrazione dei pagamenti fatti, interessi da riconoscere sommati alla cauzione nel prospetto e nel saldo.
- **Posizione dell'inquilino**: versamenti liberi distribuiti dal debito più vecchio, addebiti vari, report stampabile come il Word usato finora, saldo con la cauzione.
- Incassi degli affitti brevi (netti), con anno e totali.

**Spese**: elenco filtrabile per anno, categoria e **immobile** (palazzina, singola unità, non legate a un immobile). Spese su «Tutti gli immobili» ripartite nel bilancio (IMU in proporzione all'IMU stimata, altre per superficie). Bollette ripartite (persone, consumo, parti uguali, a carico) con pagamenti degli inquilini. Spese ricorrenti generate da sole. Stima IMU. **Cedolare secca** stimata per competenza sui contratti con la spunta, piano di acconti e saldo, «Registra versamento», dilazioni con rate e interessi.

**Investimenti**
- Capitale = prezzo (o valore di partenza) + costi di acquisto + **ristrutturazioni** (categoria Straordinaria) + lavori finanziati. Guadagno, ROI, IRR, rendimento operativo annuo.
- Cedolare di competenza e interessi delle dilazioni dentro il risultato operativo.
- **Finanziamenti** con piano di ammortamento: capitale proprio, ROE, IRR sul capitale proprio, debito residuo, confronto tra costo del debito e rendimento.
- **Vendite rateali** (compromesso con rate): avanzamento, ritardi, conclusione con rogito o risoluzione.
- **Valutazione OMI**: nel modulo di palazzina/unità si inseriscono via, civico, comune e stato dell'immobile. Al salvataggio l'indirizzo diventa coordinate (OpenStreetMap), le coordinate diventano zona OMI (perimetri KML) e il valore teorico (superficie catastale × €/m² min, max e medio) compare nella sezione «Valutazione da quotazioni OMI» in fondo a Investimenti, per palazzina e per unità. I file OMI (VALORI e ZONE CSV, KML) si scaricano una volta a semestre con SPID e si caricano nella stessa sezione: il semestre si legge dal file.
- Costo, incasso e margine al giorno per unità (nella dashboard e nella scheda dell'investimento).

**Calendario**: prenotazioni importate dal link iCal di Airbnb o dell'agenzia (le sparite diventano annullate), inserimento manuale, scadenze dei contratti e promemoria di disdetta a 90 e 30 giorni, periodi dei transitori, rate di mutuo, pagamenti ricorrenti, rate delle dilazioni, scadenze IMU e cedolare.

**Dashboard**: banner utile o perdita con confronto con l'anno scorso e barra entrate/uscite, sezione **«Cosa richiede attenzione»** (contratti da seguire, canoni arretrati, bollette da incassare, rate di dilazione, IMU entro 45 giorni; i riquadri sono link), indicatori (entrate, uscite, margine, cedolare), grafico mensile, **due torte ad anello** (entrate per tipo di affitto, uscite per categoria: la somma delle fette è uguale ai totali del banner, colore fisso per categoria, `fill` nei dati e non `Cell`), confronto cumulato, totali per anno, uscite per categoria a confronto con l'anno scorso, tabella costo e incasso al giorno, scadenze dei contratti, IMU, cedolare, **risultato per competenza**.

**Interfaccia**: tema scuro scelto con il tasto sole/luna e ricordato in un cookie; menu a scomparsa su telefono; tabelle che scorrono di lato dentro la scheda; fumetti uniformi con `Tooltip`.

## 6. Scelte di calcolo da non rifare

- Dashboard e spese ragionano per **cassa** (data di pagamento). La cedolare è anche calcolata **per competenza**.
- Le **rate di mutuo** (categoria MUTUO) sono escluse dal rendimento: contano capitale e interessi calcolati dal finanziamento. Costo giornaliero: interessi sì, quota capitale no.
- Le spese correnti (IMU, condominio, bollette, manutenzione ordinaria) restano nel risultato operativo, **non** nel capitale.
- Cedolare: 21% di base, il 10% va impostato a mano sui concordati ammessi. Base = canoni di competenza, esclusa l'indennità di occupazione dopo la scadenza. Gli acconti si calcolano sull'imposta stimata dell'anno prima (40% e 60%). **Affitti brevi esclusi**: l'agenzia trattiene e versa, a lui arriva il netto.
- Le stime OMI valgono solo se manca una stima manuale (perizia o mercato). Ogni salvataggio di un'unità e ogni importazione riscrive la stima OMI di ogni unità (una per semestre) in `ValoreImmobile`.
- Tipologia OMI scelta dalla categoria catastale: A/1-A/6 abitazioni civili (A/3-A/5 prima «tipo economico»), A/7-A/9 ville e villini, C/6 box, C/1 negozi, A/10 uffici; in mancanza, dal tipo di unità. Se manca la fascia dello stato scelto si usa la Normale e la tabella lo segnala.
- I pagamenti generati dai versamenti dell'inquilino non si modificano a mano: si usa «Ricalcola attribuzione».

- **Interessi sulla cauzione**: `interesse = cauzione × tasso% × giorni / giorni dell'anno` per ogni anno solare (anno pieno = esattamente il tasso, anche bisestile); dal giorno del versamento incluso al giorno di fine escluso (oggi se aperta, data di liquidazione se liquidata). Tassi legali verificati: 2021 0,01%, 2022 1,25%, 2023 5%, 2024 2,5%, 2025 2%, 2026 1,60% (decreto MEF 10/12/2025); se il MEF non pubblica un decreto resta l'ultimo noto. Alla liquidazione gli interessi non ancora pagati si sommano alla cauzione prima di compensare i debiti e si salvano in `Contratto.interessiLiquidati`; `trattenuto = cauzione + interessiLiquidati − restituita`. Nel rinnovo con nuove condizioni cauzione, pagamenti di interessi e tasso passano al nuovo contratto (gli interessi maturano dal versamento originale). Gli interessi pagati non sono ancora registrati come spesa.

## 7. Errori già incontrati e risolti

- Prisma 7 al posto del 6; enum su una riga; client non rigenerato; parentesi quadre in PowerShell.
- Typo nel percorso `contatti` al posto di `contratti`; query con `canoni` messa dentro `unita` al posto che al livello del contratto.
- Il template di `globals.css` rendeva chiaro il testo sulle schede bianche con il telefono in modalità scura: sostituito.
- Il tema scuro tornava chiaro al ricaricamento: ora si legge dal cookie lato server.
- `Cell` di Recharts è deprecato: le barre positive e negative sono due serie con `stackId`.
- Modulo «Registra incasso» senza il campo `data`: l'azione scartava l'invio senza errori. I moduli server action vanno controllati campo per campo rispetto a quello che legge l'azione.
- `creaUnita` creava l'unità due volte (una prima di controllare gli errori): corretto. L'indirizzo non veniva salvato per le unità in palazzina.
- Il lettore KML cercava un codice zona tipo `RM00001234` che nei file reali non c'è: ora legge `CODCOM` e `CODZONA`.
- Dashboard: il blocco del risultato aveva perso le classi (`className={``}`) e la scadenza IMU di dicembre era scritta come giugno, quindi dopo il 16 giugno la «prossima IMU» saltava il saldo: corretto.
- Importatore OMI: il codice del comune si confronta con **`Comune_amm`** (codice catastale tipo C933) e non con `Comune_cat`.

## 8. Da verificare (non ancora provato)

- Importazione dei file reali OMI (il formato dei CSV VALORI e ZONE e del KML di Varese L682 è stato letto e il codice scritto di conseguenza, ma non ancora provato nell'app). Zone rurali (R3) non hanno quotazioni: la tabella mostra «nessuna quotazione».
- Ricerca dell'indirizzo con OpenStreetMap su indirizzi veri (civici mancanti, frazioni): se non trova, c'è il campo coordinate nel modulo.
- Sincronizzazione iCal con il link reale (e se arrivano solo blocchi «occupato»).
- Conto della cedolare con i contratti reali (primo anno senza acconti).

## 9. Aperto in questo momento

**Fatto il 17/10/2026:** eliminata la sezione OMI dedicata (cartella `investimenti/valutazione`, `CardValutazione`, `FormPosizione`). Indirizzo (via, civico, comune), coordinate manuali e stato dell'immobile sono nel modulo palazzina/unità; la sezione con caricamento file e valori min/medio/max sta in fondo a Investimenti. Migrazione Prisma `indirizzo_condizioni` (`civico` su Palazzina e Unita, `condizioni` su Unita).

**Da fare dopo la sostituzione dei file:** migrazione, riavvio, poi aprire ogni unità (le esistenti hanno stato «normale» e vanno completate con via e civico) e caricare i tre file OMI di Varese.

**Fatto il 21/10/2026 (interessi sulla cauzione):** nuovi `lib/interessiCauzione.js`, `entrate/interessiActions.js`; modificati `lib/cauzione.js`, `lib/rapporto.js`, `entrate/actions.js` (liquidazione, annullo, rinnovo), scheda contratto e report inquilino. Migrazione Prisma `interessi_cauzione` (`Contratto.tassoCauzione`, `Contratto.interessiLiquidati`, modello `PagamentoInteresse`). La scheda del contratto contiene anche la correzione del modulo «Registra» canoni del 16/10.

**Da verificare:** con un contratto reale con cauzione versata, controllare gli importi per anno e una liquidazione di prova (poi annullarla). Idee: riquadro in dashboard con gli interessi esigibili non pagati; registrare gli interessi pagati come spesa.

**Fatto il 20/10/2026 (dashboard):** nuova sezione «Cosa richiede attenzione», torte ad anello di entrate e uscite, risultato in evidenza con barra, correzioni di testo e della data del saldo IMU. File: `src/app/page.jsx`, `src/components/DashboardCharts.jsx` (nuovo `Composizione`). Da fare: palette e font (fase 1) e tabelle impilate su telefono (fase 3) del piano di design, in attesa dell'ok sulla direzione (petrolio al posto dell'indaco, meno schede).

**Nota:** il dump GitHub in `/mnt/project` è ancora la versione del 15/10: non contiene le modifiche OMI né questo file. La versione corrente di `PROGRESS.md` è questa.

**Bug notati e non ancora corretti:** `FormAcquistoVendita` usa `prezzoVendita` e `costiVendita` anche nella sezione Acquisto (il prezzo di acquisto non si può salvare da lì); `investimenti/vendite/page.jsx` non importa `prisma` e ha la chiave `CONCUSA` al posto di `CONCLUSA`; `[tipo]/[id]/page.jsx` ha il link `dest=tipo:${n}` invece di `${tipo}:${n}`; `calendario/page.jsx` ha `unitaBrevi.lenght` e mette un componente dentro una stringa in `periodo`; `eventi.js` ha `c.modalia`; `FormContratto` ha `mod === "REANSITORIO"` e `setCed(e.target.value)` al posto di `checked`.

## 10. Idee e domande rimaste aperte

- **Google Calendar**: invio degli eventi (serve il progetto su Google Cloud, calendario dedicato, app «in produzione» per evitare la scadenza dopo 7 giorni). Da decidere se mandare anche pagamenti ricorrenti e scadenze fiscali.
- Report dell'inquilino anche in **Word (.docx)**.
- Costo giornaliero: far entrare le ristrutturazioni spalmate su N anni (ammortamento economico)?
- Interruttore per vedere le uscite con e senza le rate dei finanziamenti.
- Spese ricorrenti con destinazione «Tutti gli immobili».
- Pulsante «applica la stessa zona OMI a tutte le unità».
- Tabelle a schede impilate per le pagine più usate da telefono.
- Utenze durante i transitori: ripartite sul contratto o a carico?
- Mutuo con preammortamento o data di erogazione diversa dalla prima rata.
- Quote di comproprietà (IMU e rendimento).
- Sito di prenotazioni dirette: l'agenzia usa Guesty, che ha motore di prenotazione, API e costruttore di siti. Si è deciso che **non serve** costruire un sistema di prenotazione nel gestionale: prima si chiede all'agenzia piano, costi e commissioni sulle dirette, e perché Booking e gli altri portali non portano prenotazioni.
- Modalità «gestione propria» per gli affitti brevi, con incassi lordi e cedolare a carico, se un giorno si lascia l'agenzia.