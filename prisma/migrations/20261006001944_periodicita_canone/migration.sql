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
    "periodicitaMesi" INTEGER NOT NULL DEFAULT 1,
    "ancoraPeriodi" DATETIME,
    CONSTRAINT "Contratto_unitaId_fkey" FOREIGN KEY ("unitaId") REFERENCES "Unita" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Contratto_inquilinoId_fkey" FOREIGN KEY ("inquilinoId") REFERENCES "Inquilino" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Contratto" ("canone", "cauzione", "cauzioneRestituita", "cauzioneRestituitaIl", "cauzioneVersataIl", "cedolare", "dataFine", "dataInizio", "dataRilascio", "disdettaInviataIl", "disdettaNote", "durataMesi", "id", "inOccupazione", "inquilinoId", "modalita", "persone", "preavvisoMesi", "precedenteId", "rinnovato", "rinnovi", "rinnovoMesi", "tipo", "unitaId") SELECT "canone", "cauzione", "cauzioneRestituita", "cauzioneRestituitaIl", "cauzioneVersataIl", "cedolare", "dataFine", "dataInizio", "dataRilascio", "disdettaInviataIl", "disdettaNote", "durataMesi", "id", "inOccupazione", "inquilinoId", "modalita", "persone", "preavvisoMesi", "precedenteId", "rinnovato", "rinnovi", "rinnovoMesi", "tipo", "unitaId" FROM "Contratto";
DROP TABLE "Contratto";
ALTER TABLE "new_Contratto" RENAME TO "Contratto";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
