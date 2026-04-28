/*
  Warnings:

  - A unique constraint covering the columns `[numeroSoporte]` on the table `Servicio` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Servicio" ADD COLUMN "numeroSoporte" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Servicio_numeroSoporte_key" ON "Servicio"("numeroSoporte");
