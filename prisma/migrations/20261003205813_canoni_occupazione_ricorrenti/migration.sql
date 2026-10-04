-- CreateTable
CREATE TABLE "PagamentoCanone" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "contrattoId" INTEGER NOT NULL,
    "mese" TEXT NOT NULL,
    "data" DATETIME NOT NULL,
    "importo" REAL NOT NULL,
    "note" TEXT,
    CONSTRAINT "PagamentoCanone_contrattoId_fkey" FOREIGN KEY ("contrattoId") REFERENCES "Contratto" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SpesaRicorrente" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "categoria" TEXT NOT NULL,
    "descrizione" TEXT NOT NULL,
    "importo" REAL NOT NULL,
    "frequenza" TEXT NOT NULL DEFAULT 'MENSILE',
    "dal" DATETIME NOT NULL,
    "al" DATETIME,
    "fornitore" TEXT,
    "note" TEXT,
    "unitaId" INTEGER,
    "palazzinaId" INTEGER,
    "ultimaGenerazione" DATETIME,
    CONSTRAINT "SpesaRicorrente_unitaId_fkey" FOREIGN KEY ("unitaId") REFERENCES "Unita" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SpesaRicorrente_palazzinaId_fkey" FOREIGN KEY ("palazzinaId") REFERENCES "Palazzina" ("id") ON DELETE SET NULL ON UPDATE CASCADE
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
    CONSTRAINT "Contratto_unitaId_fkey" FOREIGN KEY ("unitaId") REFERENCES "Unita" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Contratto_inquilinoId_fkey" FOREIGN KEY ("inquilinoId") REFERENCES "Inquilino" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Contratto" ("canone", "cedolare", "dataFine", "dataInizio", "disdettaInviataIl", "disdettaNote", "durataMesi", "id", "inquilinoId", "modalita", "persone", "preavvisoMesi", "rinnovi", "rinnovoMesi", "tipo", "unitaId") SELECT "canone", "cedolare", "dataFine", "dataInizio", "disdettaInviataIl", "disdettaNote", "durataMesi", "id", "inquilinoId", "modalita", "persone", "preavvisoMesi", "rinnovi", "rinnovoMesi", "tipo", "unitaId" FROM "Contratto";
DROP TABLE "Contratto";
ALTER TABLE "new_Contratto" RENAME TO "Contratto";
CREATE TABLE "new_Spesa" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "categoria" TEXT NOT NULL,
    "descrizione" TEXT,
    "importo" REAL NOT NULL,
    "data" DATETIME NOT NULL,
    "anno" INTEGER NOT NULL,
    "fornitore" TEXT,
    "note" TEXT,
    "unitaId" INTEGER,
    "palazzinaId" INTEGER,
    "ricorrenteId" INTEGER,
    "periodo" TEXT,
    CONSTRAINT "Spesa_unitaId_fkey" FOREIGN KEY ("unitaId") REFERENCES "Unita" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Spesa_palazzinaId_fkey" FOREIGN KEY ("palazzinaId") REFERENCES "Palazzina" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Spesa_ricorrenteId_fkey" FOREIGN KEY ("ricorrenteId") REFERENCES "SpesaRicorrente" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Spesa" ("anno", "categoria", "data", "descrizione", "fornitore", "id", "importo", "note", "palazzinaId", "unitaId") SELECT "anno", "categoria", "data", "descrizione", "fornitore", "id", "importo", "note", "palazzinaId", "unitaId" FROM "Spesa";
DROP TABLE "Spesa";
ALTER TABLE "new_Spesa" RENAME TO "Spesa";
CREATE UNIQUE INDEX "Spesa_ricorrenteId_periodo_key" ON "Spesa"("ricorrenteId", "periodo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
