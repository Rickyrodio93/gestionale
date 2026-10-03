-- CreateTable
CREATE TABLE "Spesa" (
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
    CONSTRAINT "Spesa_unitaId_fkey" FOREIGN KEY ("unitaId") REFERENCES "Unita" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Spesa_palazzinaId_fkey" FOREIGN KEY ("palazzinaId") REFERENCES "Palazzina" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
