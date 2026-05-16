-- Ejecutar una sola vez en Neon SQL Editor después de aplicar el cambio de Prisma.
-- Estas tarifas cobran por tonelada, pero NO deben duplicar el tonelaje real operativo.
UPDATE "Tarifa"
SET "cuentaTonelajeOperativo" = false
WHERE "codigo" IN ('LS003', 'LS005');

-- Verificación:
SELECT "codigo", "descripcion", "valorUnitario", "unidadMedida", "cuentaTonelajeOperativo"
FROM "Tarifa"
WHERE "codigo" IN ('LS001', 'LS002', 'LS003', 'LS004', 'LS005')
ORDER BY "codigo";
