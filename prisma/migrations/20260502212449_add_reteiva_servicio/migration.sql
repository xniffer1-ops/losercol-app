-- DropForeignKey
ALTER TABLE "Servicio" DROP CONSTRAINT "Servicio_centroOperacionId_fkey";

-- DropForeignKey
ALTER TABLE "Servicio" DROP CONSTRAINT "Servicio_clienteId_fkey";

-- DropForeignKey
ALTER TABLE "Servicio" DROP CONSTRAINT "Servicio_vehiculoId_fkey";

-- DropIndex
DROP INDEX "Servicio_numeroSoporte_key";

-- AlterTable
ALTER TABLE "Servicio" ADD COLUMN     "reteIva" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "totalNeto" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "valorReteIva" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "Servicio" ADD CONSTRAINT "Servicio_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Servicio" ADD CONSTRAINT "Servicio_vehiculoId_fkey" FOREIGN KEY ("vehiculoId") REFERENCES "Vehiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Servicio" ADD CONSTRAINT "Servicio_centroOperacionId_fkey" FOREIGN KEY ("centroOperacionId") REFERENCES "CentroOperacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
