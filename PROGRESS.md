# Gestionale Appartamenti: stato del progetto

Aggiornato al 15 ottobre 2026. Serve per riprendere il lavoro in una nuova conversazione senza rispiegare tutto.

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
    finanziamenti/              elenco, nuovo, [id]
    vendite/                    vendite rateali: elenco, nuova, [id]
    valutazione/                stima da quotazioni OMI
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
  FormImportOmi, FormPosizione, CardValutazione
lib/
  prisma, format, ui                       utilità
  imu, scadenze, canoni, bollette, datiBolletta, cauzione, versamenti, rapporto
  cedolare, ricorrenti, riparto, spese, config
  dashboard, redditivita, rendimento, investimento, finanziamento, venditaRateale
  canali, ical, sincronizzaIcal, eventi, omi
```

## 4. Modello dati (Prisma)

| Area | Modelli |
|---|---|
| Immobili | `Palazzina`, `Unita`, `DatiCatastali`, `ValoreImmobile` (stime: mercato, perizia, OMI) |
| Locazioni lunghe e transitorie | `Inquilino`, `Contratto`, `PagamentoCanone`, `TrattenutaCauzione`, `Versamento`, `Addebito`, `PagamentoAddebito` |
| Utenze | `Contatore`, `Lettura`, `Bolletta`, `Quota`, `Pagamento` |
| Spese | `Spesa`, `SpesaRicorrente`, `DilazioneImposta`, `RataDilazione` |
| Affitti brevi | `Incasso` (netto accreditato dall'agenzia), `Prenotazione` |
| Investimenti | `Finanziamento`, `VenditaRateale`, `RataVendita`, `IncassoVendita` |
| Valutazione | `QuotazioneOmi`, `ZonaOmi` |

Punti da ricordare:

- `Contratto.modalita`: 4+4, 3+2, **transitorio**, altro. Campi utili: `periodicitaMesi` e `ancoraPeriodi` (canone trimestrale in anticipo), `cauzione*`, `inOccupazione`, `dataRilascio`, `rinnovato`, `precedenteId`, `aliquotaCedolare`.
- `Spesa.categoria`: IMU, CEDOLARE, CONDOMINIO, ORDINARIA, STRAORDINARIA, MUTUO, ALTRO. Con `unitaId` e `palazzinaId` entrambi vuoti la spesa vale per **tutti gli immobili** (oppure è la rata di una dilazione).
- `Unita` e `Palazzina` hanno dati di acquisto e vendita (`dataAcquisto`, `prezzoAcquisto`, `costiAcquisto`, ...), `inizioMisura` e `valoreIniziale` (base di partenza), `lat` e `lon`. Su `Unita` anche `omiZona`, `omiTipologia`, `omiStato`.
- Un acquisto in blocco si registra sulla palazzina e le unità lo ereditano.

## 5. Cosa fa ogni sezione

**Appartamenti**: inserimento e modifica di palazzine, unità e unità autonome, con dati catastali obbligatori per l'affitto lungo, dati di acquisto e di affitto breve (agenzia, link iCal).

**Entrate**
- Contratti lunghi e transitori: scadenza, ultimo giorno per la disdetta con semaforo, rinnovo alle stesse condizioni o **con nuove condizioni** (nuovo contratto collegato), occupazione dopo la scadenza, rilascio.
- Canoni incassati con periodicità (mensile, trimestrale in anticipo, unica soluzione), arretrati, «segna incassati i periodi precedenti a».
- **Cauzione**: prospetto a fine contratto, trattenute, liquidazione e annullo.
- **Posizione dell'inquilino**: versamenti liberi distribuiti dal debito più vecchio, addebiti vari, report stampabile come il Word usato finora, saldo con la cauzione.
- Incassi degli affitti brevi (netti), con anno e totali.

**Spese**: elenco filtrabile per anno, categoria e **immobile** (palazzina, singola unità, non legate a un immobile). Spese su «Tutti gli immobili» ripartite nel bilancio (IMU in proporzione all'IMU stimata, altre per superficie). Bollette ripartite (persone, consumo, parti uguali, a carico) con pagamenti degli inquilini. Spese ricorrenti generate da sole. Stima IMU. **Cedolare secca** stimata per competenza sui contratti con la spunta, piano di acconti e saldo, «Registra versamento», dilazioni con rate e interessi.

**Investimenti**
- Capitale = prezzo (o valore di partenza) + costi di acquisto + **ristrutturazioni** (categoria Straordinaria) + lavori finanziati. Guadagno, ROI, IRR, rendimento operativo annuo.
- Cedolare di competenza e interessi delle dilazioni dentro il risultato operativo.
- **Finanziamenti** con piano di ammortamento: capitale proprio, ROE, IRR sul capitale proprio, debito residuo, confronto tra costo del debito e rendimento.
- **Vendite rateali** (compromesso con rate): avanzamento, ritardi, conclusione con rogito o risoluzione.
- **Valutazione OMI**: valore teorico = superficie catastale × prezzo medio al m² della zona. Ricerca della zona da indirizzo (OpenStreetMap più perimetri KML).
- Costo, incasso e margine al giorno per unità (nella dashboard e nella scheda dell'investimento).

**Calendario**: prenotazioni importate dal link iCal di Airbnb o dell'agenzia (le sparite diventano annullate), inserimento manuale, scadenze dei contratti e promemoria di disdetta a 90 e 30 giorni, periodi dei transitori, rate di mutuo, pagamenti ricorrenti, rate delle dilazioni, scadenze IMU e cedolare.

**Dashboard**: banner utile o perdita con confronto con l'anno scorso, indicatori, grafici (mensile, cumulato per anno, totali per anno, uscite per categoria, investimenti, debito residuo, occupazione), tabella costo e incasso al giorno, scadenze dei contratti, IMU, cedolare, **risultato per competenza**.

**Interfaccia**: tema scuro scelto con il tasto sole/luna e ricordato in un cookie; menu a scomparsa su telefono; tabelle che scorrono di lato dentro la scheda; fumetti uniformi con `Tooltip`.

## 6. Scelte di calcolo da non rifare

- Dashboard e spese ragionano per **cassa** (data di pagamento). La cedolare è anche calcolata **per competenza**.
- Le **rate di mutuo** (categoria MUTUO) sono escluse dal rendimento: contano capitale e interessi calcolati dal finanziamento. Costo giornaliero: interessi sì, quota capitale no.
- Le spese correnti (IMU, condominio, bollette, manutenzione ordinaria) restano nel risultato operativo, **non** nel capitale.
- Cedolare: 21% di base, il 10% va impostato a mano sui concordati ammessi. Base = canoni di competenza, esclusa l'indennità di occupazione dopo la scadenza. Gli acconti si calcolano sull'imposta stimata dell'anno prima (40% e 60%). **Affitti brevi esclusi**: l'agenzia trattiene e versa, a lui arriva il netto.
- Le stime OMI valgono solo se manca una stima manuale (perizia o mercato).
- I pagamenti generati dai versamenti dell'inquilino non si modificano a mano: si usa «Ricalcola attribuzione».

## 7. Errori già incontrati e risolti

- Prisma 7 al posto del 6; enum su una riga; client non rigenerato; parentesi quadre in PowerShell.
- Typo nel percorso `contatti` al posto di `contratti`; query con `canoni` messa dentro `unita` al posto che al livello del contratto.
- Il template di `globals.css` rendeva chiaro il testo sulle schede bianche con il telefono in modalità scura: sostituito.
- Il tema scuro tornava chiaro al ricaricamento: ora si legge dal cookie lato server.
- `Cell` di Recharts è deprecato: le barre positive e negative sono due serie con `stackId`.
- Importatore OMI: il codice del comune si confronta con **`Comune_amm`** (codice catastale tipo C933) e non con `Comune_cat`.

## 8. Da verificare (non ancora provato)

- Lettura dei **perimetri KML** dell'OMI: scritta senza un file reale. Se l'importazione non trova il codice della zona, serve il testo dell'errore.
- Importazione dei CSV OMI con file veri; formato dei decimali e codifica.
- Download dei perimetri da Geopoi: da controllare se richiede l'accesso all'area riservata.
- Sincronizzazione iCal con il link reale (e se arrivano solo blocchi «occupato»).
- Conto della cedolare con i contratti reali (primo anno senza acconti).

## 9. Aperto in questo momento

**Problema segnalato:** in `/entrate/contratti/[id]/page.jsx` non si registrano più i canoni nuovi. Il file è stato caricato (`/mnt/user-data/uploads/page.jsx`) ma **non è ancora stato letto**. Da controllare:

1. Il modulo «Registra incasso» e l'azione `registraCanone` in `entrate/actions.js`: richiede mese, data e importo, altrimenti ignora l'invio senza errore.
2. Il campo del mese (`PeriodoSel`): il valore deve essere `AAAA-MM` oppure la chiave del periodo; con un contratto trimestrale cambia il formato.
3. Moduli annidati dentro altri moduli (HTML non valido: l'invio non parte), e import mancanti dopo le ultime modifiche (`situazioneCanoni`, `etichettaPeriodo`, `BottoneConferma`).
4. I periodi già coperti da versamenti: la scheda li mostra «da versamento».

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