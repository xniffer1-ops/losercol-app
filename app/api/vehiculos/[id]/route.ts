import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requirePermiso } from "@/src/lib/roles";
import { registrarAccion } from "@/src/lib/historial";
import {
  limpiarPlaca,
  limpiarTexto,
  validarTipoVehiculo,
} from "@/src/lib/validaciones";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(req: Request, { params }: Params) {
  const { denied } = await requirePermiso("vehiculos", "editar");
  if (denied) return denied;

  try {
    const { id: rawId } = await params;
    const id = Number(rawId);

    if (!id) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await req.json();

    const placa = limpiarPlaca(body.placa);
    const tipoVehiculo = limpiarTexto(body.tipoVehiculo);
    const clienteId = Number(body.clienteId);

    if (!placa || !tipoVehiculo || !clienteId) {
      return NextResponse.json(
        { error: "Todos los campos son obligatorios" },
        { status: 400 }
      );
    }

    if (!validarTipoVehiculo(tipoVehiculo)) {
      return NextResponse.json(
        { error: "Tipo de vehículo inválido" },
        { status: 400 }
      );
    }

    const vehiculoActual = await prisma.vehiculo.findUnique({
      where: { id },
      include: { cliente: true },
    });

    if (!vehiculoActual) {
      return NextResponse.json(
        { error: "Vehículo no encontrado" },
        { status: 404 }
      );
    }

    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
    });

    if (!cliente) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    const placaExistente = await prisma.vehiculo.findUnique({
      where: { placa },
    });

    if (placaExistente && placaExistente.id !== id) {
      return NextResponse.json(
        { error: "Ya existe otro vehículo con esa placa" },
        { status: 400 }
      );
    }

    const vehiculo = await prisma.vehiculo.update({
      where: { id },
      data: {
        placa,
        tipoVehiculo,
        clienteId,
      },
      include: {
        cliente: true,
      },
    });

    await registrarAccion(
      "EDITAR",
      "Vehículos",
      `Editó vehículo ${vehiculoActual.placa} → ${placa}, tipo ${tipoVehiculo}, cliente ${cliente.nombre}`
    );

    return NextResponse.json(vehiculo);
  } catch (error) {
    console.error("Error PUT /api/vehiculos/[id]:", error);
    return NextResponse.json(
      { error: "Error al actualizar vehículo" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: Params) {
  const { denied } = await requirePermiso("vehiculos", "eliminar");
  if (denied) return denied;

  try {
    const { id: rawId } = await params;
    const id = Number(rawId);

    if (!id) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const vehiculo = await prisma.vehiculo.findUnique({
      where: { id },
      include: {
        cliente: true,
      },
    });

    if (!vehiculo) {
      return NextResponse.json(
        { error: "Vehículo no encontrado" },
        { status: 404 }
      );
    }

    const serviciosAsociados = await prisma.servicio.count({
      where: { vehiculoId: id },
    });

    if (serviciosAsociados > 0) {
      return NextResponse.json(
        {
          error:
            "No se puede eliminar este vehículo porque ya tiene servicios asociados. Puedes editarlo para corregir datos.",
        },
        { status: 400 }
      );
    }

    await prisma.vehiculo.delete({
      where: { id },
    });

    await registrarAccion(
      "ELIMINAR",
      "Vehículos",
      `Eliminó vehículo ${vehiculo.placa} del cliente ${vehiculo.cliente?.nombre || "-"}`
    );

    return NextResponse.json({
      ok: true,
      mensaje: "Vehículo eliminado correctamente",
    });
  } catch (error) {
    console.error("Error DELETE /api/vehiculos/[id]:", error);
    return NextResponse.json(
      { error: "Error al eliminar vehículo" },
      { status: 500 }
    );
  }
}
