-- AlterTable
ALTER TABLE "Quota" ADD COLUMN "consumo" REAL;
ALTER TABLE "Quota" ADD COLUMN "letturaFinale" REAL;
ALTER TABLE "Quota" ADD COLUMN "letturaIniziale" REAL;
ALTER TABLE "Quota" ADD COLUMN "persone" INTEGER;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Bolletta" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "palazzinaId" INTEGER,
    "unitaId" INTEGER,
    "tipo" TEXT NOT NULL DEFAULT 'ACQUA',
    "numero" TEXT,
    "fornitore" TEXT,
    "dal" DATETIME NOT NULL,
    "al" DATETIME NOT NULL,
    "importo" REAL NOT NULL,
    "metodo" TEXT NOT NULL DEFAULT 'A_CARICO',
    "dataPagamento" DATETIME,
    "letturaGenIniziale" REAL,
    "letturaGenFinale" REAL,
    "note" TEXT,
    CONSTRAINT "Bolletta_palazzinaId_fkey" FOREIGN KEY ("palazzinaId") REFERENCES "Palazzina" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Bolletta_unitaId_fkey" FOREIGN KEY ("unitaId") REFERENCES "Unita" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Bolletta" ("al", "dal", "fornitore", "id", "importo", "metodo", "numero", "palazzinaId", "tipo") SELECT "al", "dal", "fornitore", "id", "importo", "metodo", "numero", "palazzinaId", "tipo" FROM "Bolletta";
DROP TABLE "Bolletta";
ALTER TABLE "new_Bolletta" RENAME TO "Bolletta";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
