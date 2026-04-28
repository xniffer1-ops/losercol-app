/*
  Warnings:

  - You are about to drop the `CentroOperacion` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Servicio` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "CentroOperacion";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Servicio";
PRAGMA foreign_keys=on;
