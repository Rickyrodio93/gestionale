# Linee Guida per gli Agenti IA (AI Coding Assistant Instructions)

Questo documento definisce le regole operative, lo stack e le convenzioni da seguire rigorosamente quando si lavora su questo codebase in nuove sessioni di chat.

## 1. Contesto e Modalità di Lavoro
- **Utente:** Riccardo Rodio.
- **Dominio:** Gestionale immobiliare personale.
- **Lingua:** Italiano (sia per l'interfaccia utente sia per le risposte e le spiegazioni tecniche).
- **Metodo di consegna:** Si procede un passo alla volta fornendo **file interi** pronti per la sostituzione, accompagnati dai comandi PowerShell necessari.
- **Avvertenza fiscale:** I calcoli fiscali (es. cedolare, IMU) sono stime di supporto e non sostituiscono il parere di un commercialista.

## 2. Stack Tecnologico & Vincoli Critici
- **Next.js (App Router, JavaScript) + Tailwind CSS v4 + Prisma 6 + SQLite.**
- **DIVIETO ASSOLUTO DI USARE PRISMA 7:** Il progetto usa Prisma 6. L'uso di versioni superiori rompe la configurazione della connessione (`url` nello schema).
- **Convenzioni Prisma:**
  - Gli `enum` in `schema.prisma` devono avere **un valore per riga**.
  - Dopo ogni modifica ai modelli del database, eseguire rigorosamente nell'ordine: fermare il server, `npx prisma format`, `npx prisma migrate dev --name <nome_migrazione>`, e riavviare il server. Questo previene l'errore comune *«Cannot read properties of undefined (reading 'findMany')»*.
- **Gestione Percorsi in PowerShell:**
  - Per creare cartelle con parentesi quadre (es. rotte dinamiche Next.js), utilizzare sempre:
    ```powershell
    New-Item -ItemType Directory -Force -LiteralPath "src/app/.../[id]"
    ```

## 3. Architettura e Pattern di Codice
- **UI & Componenti:** Utilizzare Tailwind CSS v4, icone da `lucide-react`, grafici tramite `Recharts` (evitando componenti deprecati come `Cell` isolati quando gestiti via `stackId`).
- **Formattazione e Moduli:** Mantenere la coerenza con i componenti di input esistenti (`Form*`) e le utilità di calcolo presenti in `src/lib/`.
- **Gestione Tema:** Il tema scuro/chiaro si basa su un cookie letto lato server nel `layout.jsx` principale e gestito tramite `ThemeToggle`.

## 4. Errori Comuni da Evitare
1. Non dimenticare di rigenerare il client Prisma dopo modifiche allo schema.
2. Attenzione ai percorsi dei file e dei moduli importati (es. verifica la corretta ortografia di `contratti`, `spese`, ecc.).
3. Verificare sempre la validità dei moduli HTML nidificati all'interno dei form per evitare blocchi nell'invio dei dati.
4. Per problemi persistenti di build o cache, pulire la cartella di compilazione con:
   ```powershell
   Remove-Item -Recurse -Force .next
