-- AlterTable
ALTER TABLE "Unita" ADD COLUMN "icalErrore" TEXT;
ALTER TABLE "Unita" ADD COLUMN "icalSincronizzato" DATETIME;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Prenotazione" (
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
    "blocco" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Prenotazione_unitaId_fkey" FOREIGN KEY ("unitaId") REFERENCES "Unita" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Prenotazione" ("canale", "checkIn", "checkOut", "commissioneGestore", "commissioneOta", "dataAccredito", "id", "lordo", "nettoAccreditato", "note", "origine", "ospite", "pulizie", "ritenuta", "stato", "uidEsterno", "unitaId") SELECT "canale", "checkIn", "checkOut", "commissioneGestore", "commissioneOta", "dataAccredito", "id", "lordo", "nettoAccreditato", "note", "origine", "ospite", "pulizie", "ritenuta", "stato", "uidEsterno", "unitaId" FROM "Prenotazione";
DROP TABLE "Prenotazione";
ALTER TABLE "new_Prenotazione" RENAME TO "Prenotazione";
CREATE UNIQUE INDEX "Prenotazione_unitaId_canale_uidEsterno_key" ON "Prenotazione"("unitaId", "canale", "uidEsterno");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
