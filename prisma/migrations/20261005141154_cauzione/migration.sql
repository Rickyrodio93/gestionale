-- AlterTable
ALTER TABLE "Contratto" ADD COLUMN "cauzione" REAL;
ALTER TABLE "Contratto" ADD COLUMN "cauzioneRestituita" REAL;
ALTER TABLE "Contratto" ADD COLUMN "cauzioneRestituitaIl" DATETIME;
ALTER TABLE "Contratto" ADD COLUMN "cauzioneVersataIl" DATETIME;

-- CreateTable
CREATE TABLE "TrattenutaCauzione" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "contrattoId" INTEGER NOT NULL,
    "descrizione" TEXT NOT NULL,
    "importo" REAL NOT NULL,
    "applicato" REAL,
    CONSTRAINT "TrattenutaCauzione_contrattoId_fkey" FOREIGN KEY ("contrattoId") REFERENCES "Contratto" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Pagamento" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "quotaId" INTEGER NOT NULL,
    "data" DATETIME NOT NULL,
    "importo" REAL NOT NULL,
    "daCauzione" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Pagamento_quotaId_fkey" FOREIGN KEY ("quotaId") REFERENCES "Quota" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Pagamento" ("data", "id", "importo", "quotaId") SELECT "data", "id", "importo", "quotaId" FROM "Pagamento";
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
    CONSTRAINT "PagamentoCanone_contrattoId_fkey" FOREIGN KEY ("contrattoId") REFERENCES "Contratto" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PagamentoCanone" ("contrattoId", "data", "id", "importo", "mese", "note") SELECT "contrattoId", "data", "id", "importo", "mese", "note" FROM "PagamentoCanone";
DROP TABLE "PagamentoCanone";
ALTER TABLE "new_PagamentoCanone" RENAME TO "PagamentoCanone";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
