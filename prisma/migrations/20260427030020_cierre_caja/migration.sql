-- CreateTable
CREATE TABLE "CierreCaja" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fecha" TEXT NOT NULL,
    "usuario" TEXT NOT NULL,
    "efectivo" REAL NOT NULL DEFAULT 0,
    "transferencia" REAL NOT NULL DEFAULT 0,
    "credito" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL DEFAULT 0,
    "cantidadServicios" INTEGER NOT NULL DEFAULT 0,
    "cerrado" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "CierreCaja_fecha_usuario_key" ON "CierreCaja"("fecha", "usuario");
