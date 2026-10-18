-- AlterTable
ALTER TABLE "Palazzina" ADD COLUMN "civico" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Unita" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "palazzinaId" INTEGER,
    "nome" TEXT NOT NULL,
    "piano" TEXT,
    "interno" TEXT,
    "indirizzo" TEXT,
    "comune" TEXT,
    "civico" TEXT,
    "condizioni" TEXT NOT NULL DEFAULT 'NORMALE',
    "tipo" TEXT NOT NULL DEFAULT 'APPARTAMENTO',
    "dataAcquisto" DATETIME,
    "prezzoAcquisto" REAL,
    "dataVendita" DATETIME,
    "prezzoVendita" REAL,
    "affittoBreve" BOOLEAN NOT NULL DEFAULT false,
    "gestore" TEXT,
    "icalUrl" TEXT,
    "cin" TEXT,
    "costiAcquisto" REAL,
    "costiVendita" REAL,
    "icalSincronizzato" DATETIME,
    "icalErrore" TEXT,
    "inizioMisura" DATETIME,
    "valoreIniziale" REAL,
    "omiZona" TEXT,
    "omiTipologia" TEXT,
    "omiStato" TEXT,
    "lat" REAL,
    "lon" REAL,
    CONSTRAINT "Unita_palazzinaId_fkey" FOREIGN KEY ("palazzinaId") REFERENCES "Palazzina" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Unita" ("affittoBreve", "cin", "comune", "costiAcquisto", "costiVendita", "dataAcquisto", "dataVendita", "gestore", "icalErrore", "icalSincronizzato", "icalUrl", "id", "indirizzo", "inizioMisura", "interno", "lat", "lon", "nome", "omiStato", "omiTipologia", "omiZona", "palazzinaId", "piano", "prezzoAcquisto", "prezzoVendita", "tipo", "valoreIniziale") SELECT "affittoBreve", "cin", "comune", "costiAcquisto", "costiVendita", "dataAcquisto", "dataVendita", "gestore", "icalErrore", "icalSincronizzato", "icalUrl", "id", "indirizzo", "inizioMisura", "interno", "lat", "lon", "nome", "omiStato", "omiTipologia", "omiZona", "palazzinaId", "piano", "prezzoAcquisto", "prezzoVendita", "tipo", "valoreIniziale" FROM "Unita";
DROP TABLE "Unita";
ALTER TABLE "new_Unita" RENAME TO "Unita";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
