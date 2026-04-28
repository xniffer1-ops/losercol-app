-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Soporte" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numero" TEXT NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "vehiculoId" INTEGER NOT NULL,
    "centroOperacionId" INTEGER NOT NULL,
    "seccionId" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "horaInicio" DATETIME,
    "horaFinal" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Soporte_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Soporte_vehiculoId_fkey" FOREIGN KEY ("vehiculoId") REFERENCES "Vehiculo" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Soporte_centroOperacionId_fkey" FOREIGN KEY ("centroOperacionId") REFERENCES "CentroOperacion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Soporte_seccionId_fkey" FOREIGN KEY ("seccionId") REFERENCES "Seccion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Soporte" ("centroOperacionId", "clienteId", "createdAt", "id", "numero", "seccionId", "vehiculoId") SELECT "centroOperacionId", "clienteId", "createdAt", "id", "numero", "seccionId", "vehiculoId" FROM "Soporte";
DROP TABLE "Soporte";
ALTER TABLE "new_Soporte" RENAME TO "Soporte";
CREATE UNIQUE INDEX "Soporte_numero_key" ON "Soporte"("numero");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
