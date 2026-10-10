-- CreateTable
CREATE TABLE "Finanziamento" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "descrizione" TEXT NOT NULL,
    "scopo" TEXT NOT NULL DEFAULT 'ACQUISTO',
    "palazzinaId" INTEGER,
    "unitaId" INTEGER,
    "importo" REAL NOT NULL,
    "dataErogazione" DATETIME NOT NULL,
    "rata" REAL NOT NULL,
    "frequenzaMesi" INTEGER NOT NULL DEFAULT 1,
    "primaRata" DATETIME NOT NULL,
    "numeroRate" INTEGER NOT NULL,
    "tassoAnnuo" REAL,
    "speseIniziali" REAL,
    "note" TEXT,
    "ricorrenteId" INTEGER,
    CONSTRAINT "Finanziamento_palazzinaId_fkey" FOREIGN KEY ("palazzinaId") REFERENCES "Palazzina" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Finanziamento_unitaId_fkey" FOREIGN KEY ("unitaId") REFERENCES "Unita" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Finanziamento_ricorrenteId_fkey" FOREIGN KEY ("ricorrenteId") REFERENCES "SpesaRicorrente" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Finanziamento_ricorrenteId_key" ON "Finanziamento"("ricorrenteId");
