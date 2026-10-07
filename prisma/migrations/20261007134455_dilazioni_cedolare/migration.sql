-- CreateTable
CREATE TABLE "DilazioneImposta" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "descrizione" TEXT NOT NULL,
    "anno" INTEGER NOT NULL,
    "impostaOriginaria" REAL NOT NULL,
    "note" TEXT
);

-- CreateTable
CREATE TABLE "RataDilazione" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "dilazioneId" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "scadenza" DATETIME NOT NULL,
    "importo" REAL NOT NULL,
    "pagataIl" DATETIME,
    CONSTRAINT "RataDilazione_dilazioneId_fkey" FOREIGN KEY ("dilazioneId") REFERENCES "DilazioneImposta" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "rataId" INTEGER,
    CONSTRAINT "Spesa_unitaId_fkey" FOREIGN KEY ("unitaId") REFERENCES "Unita" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Spesa_palazzinaId_fkey" FOREIGN KEY ("palazzinaId") REFERENCES "Palazzina" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Spesa_ricorrenteId_fkey" FOREIGN KEY ("ricorrenteId") REFERENCES "SpesaRicorrente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Spesa_rataId_fkey" FOREIGN KEY ("rataId") REFERENCES "RataDilazione" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Spesa" ("anno", "categoria", "data", "descrizione", "fornitore", "id", "importo", "note", "palazzinaId", "periodo", "ricorrenteId", "unitaId") SELECT "anno", "categoria", "data", "descrizione", "fornitore", "id", "importo", "note", "palazzinaId", "periodo", "ricorrenteId", "unitaId" FROM "Spesa";
DROP TABLE "Spesa";
ALTER TABLE "new_Spesa" RENAME TO "Spesa";
CREATE UNIQUE INDEX "Spesa_rataId_key" ON "Spesa"("rataId");
CREATE UNIQUE INDEX "Spesa_ricorrenteId_periodo_key" ON "Spesa"("ricorrenteId", "periodo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
