-- CreateTable
CREATE TABLE "Palazzina" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "indirizzo" TEXT
);

-- CreateTable
CREATE TABLE "ValoreImmobile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "unitaId" INTEGER NOT NULL,
    "data" DATETIME NOT NULL,
    "tipo" TEXT NOT NULL,
    "importo" REAL NOT NULL,
    "fonte" TEXT,
    "note" TEXT,
    CONSTRAINT "ValoreImmobile_unitaId_fkey" FOREIGN KEY ("unitaId") REFERENCES "Unita" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Unita" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "palazzinaId" INTEGER,
    "nome" TEXT NOT NULL,
    "piano" TEXT,
    "interno" TEXT,
    "indirizzo" TEXT,
    "comune" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'APPARTAMENTO',
    "dataAcquisto" DATETIME,
    "prezzoAcquisto" REAL,
    "dataVendita" DATETIME,
    "prezzoVendita" REAL,
    CONSTRAINT "Unita_palazzinaId_fkey" FOREIGN KEY ("palazzinaId") REFERENCES "Palazzina" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DatiCatastali" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "unitaId" INTEGER NOT NULL,
    "codiceComune" TEXT NOT NULL,
    "sezione" TEXT,
    "foglio" TEXT NOT NULL,
    "particella" TEXT NOT NULL,
    "subalterno" TEXT NOT NULL,
    "zonaCensuaria" TEXT,
    "categoria" TEXT NOT NULL,
    "classe" TEXT NOT NULL,
    "consistenza" REAL NOT NULL,
    "superficie" REAL,
    "rendita" REAL NOT NULL,
    "quotaPossesso" REAL NOT NULL DEFAULT 100,
    "aliquotaImu" REAL,
    CONSTRAINT "DatiCatastali_unitaId_fkey" FOREIGN KEY ("unitaId") REFERENCES "Unita" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Inquilino" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'PERSONA',
    "email" TEXT,
    "telefono" TEXT,
    "cfPiva" TEXT
);

-- CreateTable
CREATE TABLE "Contratto" (
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
    CONSTRAINT "Contratto_unitaId_fkey" FOREIGN KEY ("unitaId") REFERENCES "Unita" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Contratto_inquilinoId_fkey" FOREIGN KEY ("inquilinoId") REFERENCES "Inquilino" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Contatore" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "palazzinaId" INTEGER NOT NULL,
    "unitaId" INTEGER,
    "numero" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'ACQUA',
    CONSTRAINT "Contatore_palazzinaId_fkey" FOREIGN KEY ("palazzinaId") REFERENCES "Palazzina" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Contatore_unitaId_fkey" FOREIGN KEY ("unitaId") REFERENCES "Unita" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Lettura" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "contatoreId" INTEGER NOT NULL,
    "data" DATETIME NOT NULL,
    "valore" REAL NOT NULL,
    "stimata" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Lettura_contatoreId_fkey" FOREIGN KEY ("contatoreId") REFERENCES "Contatore" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Bolletta" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "palazzinaId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'ACQUA',
    "numero" TEXT,
    "fornitore" TEXT,
    "dal" DATETIME NOT NULL,
    "al" DATETIME NOT NULL,
    "importo" REAL NOT NULL,
    "metodo" TEXT NOT NULL DEFAULT 'CONSUMO',
    CONSTRAINT "Bolletta_palazzinaId_fkey" FOREIGN KEY ("palazzinaId") REFERENCES "Palazzina" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Quota" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bollettaId" INTEGER NOT NULL,
    "contrattoId" INTEGER NOT NULL,
    "percentuale" REAL,
    "importo" REAL NOT NULL,
    CONSTRAINT "Quota_bollettaId_fkey" FOREIGN KEY ("bollettaId") REFERENCES "Bolletta" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Quota_contrattoId_fkey" FOREIGN KEY ("contrattoId") REFERENCES "Contratto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Pagamento" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "quotaId" INTEGER NOT NULL,
    "data" DATETIME NOT NULL,
    "importo" REAL NOT NULL,
    CONSTRAINT "Pagamento_quotaId_fkey" FOREIGN KEY ("quotaId") REFERENCES "Quota" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DatiCatastali_unitaId_key" ON "DatiCatastali"("unitaId");
