-- Carpas separadas por centro de operación.
-- Las carpas actuales quedan configuradas para CIPA.
-- Para ALEN PRO u otros centros, se crean manualmente desde Tarifas con categoría Carpa.

INSERT INTO "CentroOperacion" ("nombre", "ciudad")
SELECT 'CIPA', 'CARTAGO'
WHERE NOT EXISTS (
  SELECT 1 FROM "CentroOperacion" WHERE UPPER("nombre") = 'CIPA'
);

ALTER TABLE "Tarifa"
ADD COLUMN IF NOT EXISTS "centroOperacionId" INTEGER;

ALTER TABLE "Tarifa"
ADD COLUMN IF NOT EXISTS "tipoUso" TEXT NOT NULL DEFAULT 'terceros';

ALTER TABLE "Tarifa"
ADD COLUMN IF NOT EXISTS "cuentaTonelajeOperativo" BOOLEAN NOT NULL DEFAULT true;

WITH cipa AS (
  SELECT "id" FROM "CentroOperacion" WHERE UPPER("nombre") = 'CIPA' ORDER BY "id" ASC LIMIT 1
)
INSERT INTO "Tarifa" (
  "codigo",
  "descripcion",
  "valorUnitario",
  "unidadMedida",
  "presentacion",
  "categoria",
  "centroOperacionId",
  "tipoUso",
  "cuentaTonelajeOperativo"
)
SELECT codigo, descripcion, valor, 'Vehículo', presentacion, 'Carpa', (SELECT "id" FROM cipa), 'ambos', false
FROM (VALUES
  ('CARPA_CIPA_TM', 'CARPA DE TRACTOMULA', 46500, 'Tracto Mula'),
  ('CARPA_CIPA_MEDIA_TM', 'MEDIA CARPA TRACTOMULA', 23250, 'Media Tracto Mula'),
  ('CARPA_CIPA_SENCILLO', 'CARPA DE SENCILLO', 16950, 'Sencillo'),
  ('CARPA_CIPA_MEDIA_SENCILLO', 'MEDIA CARPA SENCILLO', 8475, 'Media Sencillo'),
  ('CARPA_CIPA_DOBLE', 'CARPA DE DOBLE TROQUE', 23150, 'Doble Troque'),
  ('CARPA_CIPA_MEDIA_DOBLE', 'MEDIA CARPA DOBLE TROQUE', 11575, 'Media Doble Troque')
) AS carpas(codigo, descripcion, valor, presentacion)
WHERE NOT EXISTS (
  SELECT 1 FROM "Tarifa" t WHERE UPPER(t."codigo") = UPPER(carpas.codigo)
);

UPDATE "Tarifa"
SET
  "centroOperacionId" = (
    SELECT "id" FROM "CentroOperacion" WHERE UPPER("nombre") = 'CIPA' ORDER BY "id" ASC LIMIT 1
  ),
  "categoria" = 'Carpa',
  "tipoUso" = 'ambos',
  "cuentaTonelajeOperativo" = false
WHERE UPPER("codigo") IN (
  'CARPA_CIPA_TM',
  'CARPA_CIPA_MEDIA_TM',
  'CARPA_CIPA_SENCILLO',
  'CARPA_CIPA_MEDIA_SENCILLO',
  'CARPA_CIPA_DOBLE',
  'CARPA_CIPA_MEDIA_DOBLE',
  'LS009',
  'LS010',
  'LS011'
)
OR LOWER("descripcion") LIKE '%carpe y descarpe%'
OR LOWER("descripcion") LIKE '%descarpe%'
OR LOWER("descripcion") LIKE '%carpa%';
