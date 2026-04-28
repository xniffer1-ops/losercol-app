-- CreateTable
CREATE TABLE "FacturaMultiple" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numero" TEXT NOT NULL,
    "cliente" TEXT NOT NULL,
    "total" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "FacturaMultipleItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "facturaMultipleId" INTEGER NOT NULL,
    "servicioId" INTEGER NOT NULL,
    "soporte" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "subtotal" REAL NOT NULL,
    CONSTRAINT "FacturaMultipleItem_facturaMultipleId_fkey" FOREIGN KEY ("facturaMultipleId") REFERENCES "FacturaMultiple" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "FacturaMultiple_numero_key" ON "FacturaMultiple"("numero");
