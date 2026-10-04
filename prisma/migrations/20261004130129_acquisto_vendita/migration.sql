-- AlterTable
ALTER TABLE "Palazzina" ADD COLUMN "costiAcquisto" REAL;
ALTER TABLE "Palazzina" ADD COLUMN "costiVendita" REAL;
ALTER TABLE "Palazzina" ADD COLUMN "dataAcquisto" DATETIME;
ALTER TABLE "Palazzina" ADD COLUMN "dataVendita" DATETIME;
ALTER TABLE "Palazzina" ADD COLUMN "prezzoAcquisto" REAL;
ALTER TABLE "Palazzina" ADD COLUMN "prezzoVendita" REAL;

-- AlterTable
ALTER TABLE "Unita" ADD COLUMN "costiAcquisto" REAL;
ALTER TABLE "Unita" ADD COLUMN "costiVendita" REAL;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ValoreImmobile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "unitaId" INTEGER,
    "data" DATETIME NOT NULL,
    "tipo" TEXT NOT NULL,
    "importo" REAL NOT NULL,
    "fonte" TEXT,
    "note" TEXT,
    "palazzinaId" INTEGER,
    CONSTRAINT "ValoreImmobile_unitaId_fkey" FOREIGN KEY ("unitaId") REFERENCES "Unita" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ValoreImmobile_palazzinaId_fkey" FOREIGN KEY ("palazzinaId") REFERENCES "Palazzina" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ValoreImmobile" ("data", "fonte", "id", "importo", "note", "tipo", "unitaId") SELECT "data", "fonte", "id", "importo", "note", "tipo", "unitaId" FROM "ValoreImmobile";
DROP TABLE "ValoreImmobile";
ALTER TABLE "new_ValoreImmobile" RENAME TO "ValoreImmobile";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
