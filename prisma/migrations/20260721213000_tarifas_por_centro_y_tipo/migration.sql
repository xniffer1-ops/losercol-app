-- Separa tarifas por centro de operación y por tipo de uso.
-- Es segura para datos existentes: lo actual queda asignado a CIPA.

INSERT INTO "CentroOperacion" ("nombre", "ciudad")
SELECT 'CIPA', 'CARTAGO'
WHERE NOT EXISTS (
  SELECT 1 FROM "CentroOperacion" WHERE UPPER("nombre") = 'CIPA'
);

INSERT INTO "CentroOperacion" ("nombre", "ciudad")
SELECT 'ALEN PRO', 'PENDIENTE'
WHERE NOT EXISTS (
  SELECT 1 FROM "CentroOperacion" WHERE UPPER("nombre") = 'ALEN PRO'
);

ALTER TABLE "Tarifa"
ADD COLUMN IF NOT EXISTS "centroOperacionId" INTEGER;

ALTER TABLE "Tarifa"
ADD COLUMN IF NOT EXISTS "tipoUso" TEXT NOT NULL DEFAULT 'terceros';

UPDATE "Tarifa"
SET "centroOperacionId" = (
  SELECT "id" FROM "CentroOperacion" WHERE UPPER("nombre") = 'CIPA' ORDER BY "id" ASC LIMIT 1
)
WHERE "centroOperacionId" IS NULL;

UPDATE "Tarifa"
SET "tipoUso" = CASE
  WHEN UPPER("codigo") IN ('LS003', 'LS005', 'LS006', 'LS008', 'LS012')
    OR LOWER("descripcion") LIKE '%movimiento%'
    OR LOWER("descripcion") LIKE '%interno%'
  THEN 'interno'
  ELSE 'terceros'
END
WHERE "tipoUso" IS NULL OR TRIM("tipoUso") = '' OR "tipoUso" NOT IN ('terceros', 'interno', 'ambos');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Tarifa_centroOperacionId_fkey'
  ) THEN
    ALTER TABLE "Tarifa"
    ADD CONSTRAINT "Tarifa_centroOperacionId_fkey"
    FOREIGN KEY ("centroOperacionId") REFERENCES "CentroOperacion"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Tarifa_centroOperacionId_idx" ON "Tarifa"("centroOperacionId");
CREATE INDEX IF NOT EXISTS "Tarifa_tipoUso_idx" ON "Tarifa"("tipoUso");


-- Caja separada por centro de operación.
ALTER TABLE "CierreCaja"
ADD COLUMN IF NOT EXISTS "centroOperacionId" INTEGER;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'CierreCaja_fecha_usuario_key'
  ) THEN
    DROP INDEX "CierreCaja_fecha_usuario_key";
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CierreCaja_centroOperacionId_fkey'
  ) THEN
    ALTER TABLE "CierreCaja"
    ADD CONSTRAINT "CierreCaja_centroOperacionId_fkey"
    FOREIGN KEY ("centroOperacionId") REFERENCES "CentroOperacion"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "CierreCaja_fecha_usuario_centroOperacionId_key"
ON "CierreCaja"("fecha", "usuario", "centroOperacionId");

CREATE INDEX IF NOT EXISTS "CierreCaja_centroOperacionId_idx" ON "CierreCaja"("centroOperacionId");
