-- CreateTable
CREATE TABLE "VenditaRateale" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "palazzinaId" INTEGER,
    "unitaId" INTEGER,
    "acquirente" TEXT NOT NULL,
    "dataFirma" DATETIME NOT NULL,
    "prezzo" REAL NOT NULL,
    "costiVendita" REAL,
    "stato" TEXT NOT NULL DEFAULT 'IN_CORSO',
    "dataRogito" DATETIME,
    "dataChiusura" DATETIME,
    "trattenuto" REAL,
    "note" TEXT,
    CONSTRAINT "VenditaRateale_palazzinaId_fkey" FOREIGN KEY ("palazzinaId") REFERENCES "Palazzina" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "VenditaRateale_unitaId_fkey" FOREIGN KEY ("unitaId") REFERENCES "Unita" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RataVendita" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "venditaId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'RATA',
    "scadenza" DATETIME NOT NULL,
    "importo" REAL NOT NULL,
    CONSTRAINT "RataVendita_venditaId_fkey" FOREIGN KEY ("venditaId") REFERENCES "VenditaRateale" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IncassoVendita" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "venditaId" INTEGER NOT NULL,
    "data" DATETIME NOT NULL,
    "importo" REAL NOT NULL,
    "note" TEXT,
    CONSTRAINT "IncassoVendita_venditaId_fkey" FOREIGN KEY ("venditaId") REFERENCES "VenditaRateale" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
