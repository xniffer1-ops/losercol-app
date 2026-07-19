-- Columnas que el código actual usa, pero que no estaban en las primeras migraciones.
-- Se usa IF NOT EXISTS para que sea seguro ejecutarlo en bases que ya tienen las columnas.

ALTER TABLE "Usuario"
ADD COLUMN IF NOT EXISTS "permisos" TEXT NOT NULL DEFAULT '{}';

ALTER TABLE "Tarifa"
ADD COLUMN IF NOT EXISTS "cuentaTonelajeOperativo" BOOLEAN NOT NULL DEFAULT true;
