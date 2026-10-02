-- CreateTable
CREATE TABLE "Prenotazione" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "unitaId" INTEGER NOT NULL,
    "canale" TEXT NOT NULL DEFAULT 'ALTRO',
    "uidEsterno" TEXT,
    "ospite" TEXT,
    "checkIn" DATETIME NOT NULL,
    "checkOut" DATETIME NOT NULL,
    "stato" TEXT NOT NULL DEFAULT 'CONFERMATA',
    "lordo" REAL,
    "commissioneOta" REAL,
    "commissioneGestore" REAL,
    "pulizie" REAL,
    "ritenuta" REAL,
    "nettoAccreditato" REAL,
    "dataAccredito" DATETIME,
    "origine" TEXT NOT NULL DEFAULT 'manuale',
    "note" TEXT,
    CONSTRAINT "Prenotazione_unitaId_fkey" FOREIGN KEY ("unitaId") REFERENCES "Unita" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Incasso" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "unitaId" INTEGER NOT NULL,
    "data" DATETIME NOT NULL,
    "mese" TEXT NOT NULL,
    "importo" REAL NOT NULL,
    "note" TEXT,
    CONSTRAINT "Incasso_unitaId_fkey" FOREIGN KEY ("unitaId") REFERENCES "Unita" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

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
    "tipo" TEXT NOT NULL DEFAULT 'APPARTAMENTO',
    "dataAcquisto" DATETIME,
    "prezzoAcquisto" REAL,
    "dataVendita" DATETIME,
    "prezzoVendita" REAL,
    "affittoBreve" BOOLEAN NOT NULL DEFAULT false,
    "gestore" TEXT,
    "icalUrl" TEXT,
    "cin" TEXT,
    CONSTRAINT "Unita_palazzinaId_fkey" FOREIGN KEY ("palazzinaId") REFERENCES "Palazzina" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Unita" ("comune", "dataAcquisto", "dataVendita", "id", "indirizzo", "interno", "nome", "palazzinaId", "piano", "prezzoAcquisto", "prezzoVendita", "tipo") SELECT "comune", "dataAcquisto", "dataVendita", "id", "indirizzo", "interno", "nome", "palazzinaId", "piano", "prezzoAcquisto", "prezzoVendita", "tipo" FROM "Unita";
DROP TABLE "Unita";
ALTER TABLE "new_Unita" RENAME TO "Unita";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Prenotazione_unitaId_canale_uidEsterno_key" ON "Prenotazione"("unitaId", "canale", "uidEsterno");
