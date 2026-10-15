-- AlterTable
ALTER TABLE "Palazzina" ADD COLUMN "comune" TEXT;
ALTER TABLE "Palazzina" ADD COLUMN "lat" REAL;
ALTER TABLE "Palazzina" ADD COLUMN "lon" REAL;

-- AlterTable
ALTER TABLE "Unita" ADD COLUMN "lat" REAL;
ALTER TABLE "Unita" ADD COLUMN "lon" REAL;
ALTER TABLE "Unita" ADD COLUMN "omiStato" TEXT;
ALTER TABLE "Unita" ADD COLUMN "omiTipologia" TEXT;
ALTER TABLE "Unita" ADD COLUMN "omiZona" TEXT;

-- CreateTable
CREATE TABLE "QuotazioneOmi" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "semestre" TEXT NOT NULL,
    "comuneCat" TEXT NOT NULL,
    "comune" TEXT,
    "fascia" TEXT,
    "zona" TEXT NOT NULL,
    "zonaDescr" TEXT,
    "tipologia" TEXT NOT NULL,
    "stato" TEXT NOT NULL,
    "min" REAL NOT NULL,
    "max" REAL NOT NULL,
    "superficie" TEXT,
    "linkZona" TEXT
);

-- CreateTable
CREATE TABLE "ZonaOmi" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "linkZona" TEXT NOT NULL,
    "geom" TEXT NOT NULL,
    "minLat" REAL NOT NULL,
    "maxLat" REAL NOT NULL,
    "minLon" REAL NOT NULL,
    "maxLon" REAL NOT NULL
);

-- CreateIndex
CREATE INDEX "QuotazioneOmi_comuneCat_semestre_idx" ON "QuotazioneOmi"("comuneCat", "semestre");

-- CreateIndex
CREATE INDEX "QuotazioneOmi_linkZona_idx" ON "QuotazioneOmi"("linkZona");

-- CreateIndex
CREATE UNIQUE INDEX "ZonaOmi_linkZona_key" ON "ZonaOmi"("linkZona");
