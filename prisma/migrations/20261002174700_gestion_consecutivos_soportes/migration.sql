
CREATE TABLE "ConfiguracionSoporte" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "siguienteNumero" INTEGER NOT NULL DEFAULT 1,
    "prefijo" TEXT NOT NULL DEFAULT 'SP-',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracionSoporte_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SoporteEliminado" (
    "id" SERIAL NOT NULL,
    "originalServicioId" INTEGER NOT NULL,
    "numeroSoporte" TEXT NOT NULL,
    "datos" JSONB NOT NULL,
    "eliminadoPor" TEXT NOT NULL,
    "eliminadoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "restaurado" BOOLEAN NOT NULL DEFAULT false,
    "restauradoPor" TEXT,
    "restauradoAt" TIMESTAMP(3),

    CONSTRAINT "SoporteEliminado_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SoporteEliminado_numeroSoporte_idx" ON "SoporteEliminado"("numeroSoporte");
CREATE INDEX "SoporteEliminado_restaurado_idx" ON "SoporteEliminado"("restaurado");

INSERT INTO "ConfiguracionSoporte" ("id", "siguienteNumero", "prefijo", "updatedAt")
VALUES (1, 1, 'SP-', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
