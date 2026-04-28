-- CreateTable
CREATE TABLE "Seccion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Servicio" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
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
    "presentacion" TEXT,
    "categoria" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Servicio_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Servicio_vehiculoId_fkey" FOREIGN KEY ("vehiculoId") REFERENCES "Vehiculo" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Servicio_centroOperacionId_fkey" FOREIGN KEY ("centroOperacionId") REFERENCES "CentroOperacion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Servicio_tarifaId_fkey" FOREIGN KEY ("tarifaId") REFERENCES "Tarifa" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Servicio_seccionId_fkey" FOREIGN KEY ("seccionId") REFERENCES "Seccion" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Servicio" ("cantidad", "categoria", "centroOperacionId", "clienteId", "createdAt", "descripcion", "id", "presentacion", "subtotal", "tarifaId", "unidadMedida", "valorUnitario", "vehiculoId") SELECT "cantidad", "categoria", "centroOperacionId", "clienteId", "createdAt", "descripcion", "id", "presentacion", "subtotal", "tarifaId", "unidadMedida", "valorUnitario", "vehiculoId" FROM "Servicio";
DROP TABLE "Servicio";
ALTER TABLE "new_Servicio" RENAME TO "Servicio";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Seccion_nombre_key" ON "Seccion"("nombre");
