# Gestionale Appartamenti

Gestionale personale per il monitoraggio e la gestione di un portafoglio immobiliare (unità in palazzina, affitti brevi e affitti a lungo/transitorio).

## Stack Tecnologico

- **Framework:** Next.js (App Router, JavaScript), React
- **Stile:** Tailwind CSS v4, Lucide React
- **Grafici:** Recharts
- **Database & ORM:** SQLite locale (`dev.db`) con **Prisma 6** (Nota: non utilizzare Prisma 7 per via della configurazione della connessione nello schema).

## Installazione e Avvio

1. Clona o apri la cartella del progetto.
2. Configura il file `.env` con la stringa di connessione SQLite:
   ```env
   DATABASE_URL="file:./dev.db"
   ```
3. Installa le dipendenze:
   ```powershell
   npm install
   ```
4. Esegui le migrazioni e formatta lo schema Prisma:
   ```powershell
   npx prisma format
   npx prisma migrate dev --name init
   ```
5. Avvia il server di sviluppo:
   ```powershell
   npm run dev
   ```

## Struttura Principale del Progetto

- `src/app/`: Pagine e rotte dell'applicazione (Dashboard, Appartamenti, Spese, Entrate, Investimenti, Calendario).
- `src/components/`: Componenti UI riutilizzabili (Sidebar, Moduli, Tabelle, Grafici).
- `src/lib/`: Logica di business, utilità di calcolo (IMU, cedolare, ammortamenti, OMI, iCal) e client Prisma.

## Regole di Sviluppo e Scelte Tecniche

- **Calcoli Fiscali & Cassa:** La dashboard e le spese operano principalmente per cassa, mentre la cedolare secca viene calcolata anche per competenza.
- **Formato Enums in Prisma:** Gli enum all'interno di `schema.prisma` devono essere scritti con un valore per riga.
- **Pulizia Cache:** In caso di anomalie di compilazione, ripulire la cache con:
  ```powershell
  Remove-Item -Recurse -Force .next
  ```