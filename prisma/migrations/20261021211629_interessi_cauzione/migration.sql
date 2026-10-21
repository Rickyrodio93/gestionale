-- AlterTable
ALTER TABLE "Contratto" ADD COLUMN "interessiLiquidati" REAL;
ALTER TABLE "Contratto" ADD COLUMN "tassoCauzione" REAL;

-- CreateTable
CREATE TABLE "PagamentoInteresse" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "contrattoId" INTEGER NOT NULL,
    "data" DATETIME NOT NULL,
    "importo" REAL NOT NULL,
    "note" TEXT,
    CONSTRAINT "PagamentoInteresse_contrattoId_fkey" FOREIGN KEY ("contrattoId") REFERENCES "Contratto" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
