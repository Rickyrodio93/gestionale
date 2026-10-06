-- CreateTable
CREATE TABLE "Versamento" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "inquilinoId" INTEGER NOT NULL,
    "unitaId" INTEGER,
    "data" DATETIME NOT NULL,
    "importo" REAL NOT NULL,
    "destinazione" TEXT NOT NULL DEFAULT 'AUTO',
    "note" TEXT,
    CONSTRAINT "Versamento_inquilinoId_fkey" FOREIGN KEY ("inquilinoId") REFERENCES "Inquilino" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Addebito" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "contrattoId" INTEGER NOT NULL,
    "data" DATETIME NOT NULL,
    "descrizione" TEXT NOT NULL,
    "importo" REAL NOT NULL,
    CONSTRAINT "Addebito_contrattoId_fkey" FOREIGN KEY ("contrattoId") REFERENCES "Contratto" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PagamentoAddebito" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "addebitoId" INTEGER NOT NULL,
    "versamentoId" INTEGER,
    "data" DATETIME NOT NULL,
    "importo" REAL NOT NULL,
    CONSTRAINT "PagamentoAddebito_addebitoId_fkey" FOREIGN KEY ("addebitoId") REFERENCES "Addebito" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PagamentoAddebito_versamentoId_fkey" FOREIGN KEY ("versamentoId") REFERENCES "Versamento" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Contratto" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "unitaId" INTEGER NOT NULL,
    "inquilinoId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'LUNGO',
    "modalita" TEXT,
    "dataInizio" DATETIME NOT NULL,
    "dataFine" DATETIME,
    "durataMesi" INTEGER,
    "rinnovoMesi" INTEGER,
    "preavvisoMesi" INTEGER NOT NULL DEFAULT 6,
    "rinnovi" INTEGER NOT NULL DEFAULT 0,
    "disdettaInviataIl" DATETIME,
    "disdettaNote" TEXT,
    "canone" REAL,
    "persone" INTEGER,
    "cedolare" BOOLEAN NOT NULL DEFAULT false,
    "inOccupazione" BOOLEAN NOT NULL DEFAULT false,
    "dataRilascio" DATETIME,
    "cauzione" REAL,
    "cauzioneVersataIl" DATETIME,
    "cauzioneRestituitaIl" DATETIME,
    "cauzioneRestituita" REAL,
    "rinnovato" BOOLEAN NOT NULL DEFAULT false,
    "precedenteId" INTEGER,
    CONSTRAINT "Contratto_unitaId_fkey" FOREIGN KEY ("unitaId") REFERENCES "Unita" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Contratto_inquilinoId_fkey" FOREIGN KEY ("inquilinoId") REFERENCES "Inquilino" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Contratto" ("canone", "cauzione", "cauzioneRestituita", "cauzioneRestituitaIl", "cauzioneVersataIl", "cedolare", "dataFine", "dataInizio", "dataRilascio", "disdettaInviataIl", "disdettaNote", "durataMesi", "id", "inOccupazione", "inquilinoId", "modalita", "persone", "preavvisoMesi", "rinnovi", "rinnovoMesi", "tipo", "unitaId") SELECT "canone", "cauzione", "cauzioneRestituita", "cauzioneRestituitaIl", "cauzioneVersataIl", "cedolare", "dataFine", "dataInizio", "dataRilascio", "disdettaInviataIl", "disdettaNote", "durataMesi", "id", "inOccupazione", "inquilinoId", "modalita", "persone", "preavvisoMesi", "rinnovi", "rinnovoMesi", "tipo", "unitaId" FROM "Contratto";
DROP TABLE "Contratto";
ALTER TABLE "new_Contratto" RENAME TO "Contratto";
CREATE TABLE "new_Pagamento" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "quotaId" INTEGER NOT NULL,
    "data" DATETIME NOT NULL,
    "importo" REAL NOT NULL,
    "daCauzione" BOOLEAN NOT NULL DEFAULT false,
    "versamentoId" INTEGER,
    CONSTRAINT "Pagamento_quotaId_fkey" FOREIGN KEY ("quotaId") REFERENCES "Quota" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Pagamento_versamentoId_fkey" FOREIGN KEY ("versamentoId") REFERENCES "Versamento" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Pagamento" ("daCauzione", "data", "id", "importo", "quotaId") SELECT "daCauzione", "data", "id", "importo", "quotaId" FROM "Pagamento";
DROP TABLE "Pagamento";
ALTER TABLE "new_Pagamento" RENAME TO "Pagamento";
CREATE TABLE "new_PagamentoCanone" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "contrattoId" INTEGER NOT NULL,
    "mese" TEXT NOT NULL,
    "data" DATETIME NOT NULL,
    "importo" REAL NOT NULL,
    "note" TEXT,
    "daCauzione" BOOLEAN NOT NULL DEFAULT false,
    "versamentoId" INTEGER,
    CONSTRAINT "PagamentoCanone_contrattoId_fkey" FOREIGN KEY ("contrattoId") REFERENCES "Contratto" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PagamentoCanone_versamentoId_fkey" FOREIGN KEY ("versamentoId") REFERENCES "Versamento" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PagamentoCanone" ("contrattoId", "daCauzione", "data", "id", "importo", "mese", "note") SELECT "contrattoId", "daCauzione", "data", "id", "importo", "mese", "note" FROM "PagamentoCanone";
DROP TABLE "PagamentoCanone";
ALTER TABLE "new_PagamentoCanone" RENAME TO "PagamentoCanone";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
