-- CreateTable
CREATE TABLE "Cliente" (
    "id" SERIAL NOT NULL,
    "ccNit" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "formaPago" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehiculo" (
    "id" SERIAL NOT NULL,
    "placa" TEXT NOT NULL,
    "tipoVehiculo" TEXT NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vehiculo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CentroOperacion" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CentroOperacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Servicio" (
    "id" SERIAL NOT NULL,
    "numeroSoporte" TEXT,
    "descripcion" TEXT NOT NULL,
    "valorUnitario" DOUBLE PRECISION NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "vehiculoId" INTEGER NOT NULL,
    "centroOperacionId" INTEGER NOT NULL,
    "tarifaId" INTEGER,
    "seccionId" INTEGER,
    "soporteId" INTEGER,
    "unidadMedida" TEXT,
    "tipoCarpa" TEXT,
    "presentacion" TEXT,
    "categoria" TEXT,
    "formaPago" TEXT,
    "facturado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Servicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'operador',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistorialAccion" (
    "id" SERIAL NOT NULL,
    "usuario" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "modulo" TEXT NOT NULL,
    "detalle" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistorialAccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tarifa" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "valorUnitario" DOUBLE PRECISION NOT NULL,
    "unidadMedida" TEXT NOT NULL,
    "presentacion" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tarifa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Seccion" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Seccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacturaMultiple" (
    "id" SERIAL NOT NULL,
    "numero" TEXT NOT NULL,
    "cliente" TEXT NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "usuario" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacturaMultiple_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacturaMultipleItem" (
    "id" SERIAL NOT NULL,
    "facturaMultipleId" INTEGER NOT NULL,
    "servicioId" INTEGER NOT NULL,
    "soporte" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "FacturaMultipleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Soporte" (
    "id" SERIAL NOT NULL,
    "numero" TEXT NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "vehiculoId" INTEGER NOT NULL,
    "centroOperacionId" INTEGER NOT NULL,
    "seccionId" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "horaInicio" TIMESTAMP(3),
    "horaFinal" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Soporte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CierreCaja" (
    "id" SERIAL NOT NULL,
    "fecha" TEXT NOT NULL,
    "usuario" TEXT NOT NULL,
    "efectivo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "transferencia" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "credito" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cantidadServicios" INTEGER NOT NULL DEFAULT 0,
    "cerrado" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CierreCaja_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_ccNit_key" ON "Cliente"("ccNit");

-- CreateIndex
CREATE UNIQUE INDEX "Vehiculo_placa_key" ON "Vehiculo"("placa");

-- CreateIndex
CREATE UNIQUE INDEX "CentroOperacion_nombre_key" ON "CentroOperacion"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Servicio_numeroSoporte_key" ON "Servicio"("numeroSoporte");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Tarifa_codigo_key" ON "Tarifa"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Seccion_nombre_key" ON "Seccion"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "FacturaMultiple_numero_key" ON "FacturaMultiple"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "Soporte_numero_key" ON "Soporte"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "CierreCaja_fecha_usuario_key" ON "CierreCaja"("fecha", "usuario");

-- AddForeignKey
ALTER TABLE "Vehiculo" ADD CONSTRAINT "Vehiculo_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Servicio" ADD CONSTRAINT "Servicio_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Servicio" ADD CONSTRAINT "Servicio_vehiculoId_fkey" FOREIGN KEY ("vehiculoId") REFERENCES "Vehiculo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Servicio" ADD CONSTRAINT "Servicio_centroOperacionId_fkey" FOREIGN KEY ("centroOperacionId") REFERENCES "CentroOperacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Servicio" ADD CONSTRAINT "Servicio_tarifaId_fkey" FOREIGN KEY ("tarifaId") REFERENCES "Tarifa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Servicio" ADD CONSTRAINT "Servicio_seccionId_fkey" FOREIGN KEY ("seccionId") REFERENCES "Seccion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Servicio" ADD CONSTRAINT "Servicio_soporteId_fkey" FOREIGN KEY ("soporteId") REFERENCES "Soporte"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacturaMultipleItem" ADD CONSTRAINT "FacturaMultipleItem_facturaMultipleId_fkey" FOREIGN KEY ("facturaMultipleId") REFERENCES "FacturaMultiple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Soporte" ADD CONSTRAINT "Soporte_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Soporte" ADD CONSTRAINT "Soporte_vehiculoId_fkey" FOREIGN KEY ("vehiculoId") REFERENCES "Vehiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Soporte" ADD CONSTRAINT "Soporte_centroOperacionId_fkey" FOREIGN KEY ("centroOperacionId") REFERENCES "CentroOperacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Soporte" ADD CONSTRAINT "Soporte_seccionId_fkey" FOREIGN KEY ("seccionId") REFERENCES "Seccion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
