-- CreateTable
CREATE TABLE "Tarifa" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "valorUnitario" REAL NOT NULL,
    "unidadMedida" TEXT NOT NULL,
    "presentacion" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Tarifa_codigo_key" ON "Tarifa"("codigo");
