-- CreateTable
CREATE TABLE "Soporte" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numero" TEXT NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "vehiculoId" INTEGER NOT NULL,
    "centroOperacionId" INTEGER NOT NULL,
    "seccionId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Soporte_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Soporte_vehiculoId_fkey" FOREIGN KEY ("vehiculoId") REFERENCES "Vehiculo" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Soporte_centroOperacionId_fkey" FOREIGN KEY ("centroOperacionId") REFERENCES "CentroOperacion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Soporte_seccionId_fkey" FOREIGN KEY ("seccionId") REFERENCES "Seccion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Servicio" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numeroSoporte" TEXT,
    "descripcion" TEXT NOT NULL,
    "valorUnitario" REAL NOT NULL,
    "cantidad" REAL NOT NULL,
    "subtotal" REAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "vehiculoId" INTEGER NOT NULL,
    "centroOperacionId" INTEGER NOT NULL,
    "tarifaId" INTEGER,
    "seccionId" INTEGER,
    "unidadMedida" TEXT,
    "tipoCarpa" TEXT,
    "presentacion" TEXT,
    "categoria" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "facturado" BOOLEAN NOT NULL DEFAULT false,
    "soporteId" INTEGER,
    CONSTRAINT "Servicio_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Servicio_vehiculoId_fkey" FOREIGN KEY ("vehiculoId") REFERENCES "Vehiculo" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Servicio_centroOperacionId_fkey" FOREIGN KEY ("centroOperacionId") REFERENCES "CentroOperacion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Servicio_tarifaId_fkey" FOREIGN KEY ("tarifaId") REFERENCES "Tarifa" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Servicio_seccionId_fkey" FOREIGN KEY ("seccionId") REFERENCES "Seccion" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Servicio_soporteId_fkey" FOREIGN KEY ("soporteId") REFERENCES "Soporte" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Servicio" ("cantidad", "categoria", "centroOperacionId", "clienteId", "createdAt", "descripcion", "facturado", "id", "numeroSoporte", "presentacion", "seccionId", "subtotal", "tarifaId", "tipoCarpa", "unidadMedida", "valorUnitario", "vehiculoId") SELECT "cantidad", "categoria", "centroOperacionId", "clienteId", "createdAt", "descripcion", "facturado", "id", "numeroSoporte", "presentacion", "seccionId", "subtotal", "tarifaId", "tipoCarpa", "unidadMedida", "valorUnitario", "vehiculoId" FROM "Servicio";
DROP TABLE "Servicio";
ALTER TABLE "new_Servicio" RENAME TO "Servicio";
CREATE UNIQUE INDEX "Servicio_numeroSoporte_key" ON "Servicio"("numeroSoporte");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Soporte_numero_key" ON "Soporte"("numero");
