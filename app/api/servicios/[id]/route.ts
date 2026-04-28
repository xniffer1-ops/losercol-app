import { NextResponse } from "next/server";
import { prisma } from "../../../../src/lib/prisma";
import { requireAdmin, requireUser } from "@/src/lib/roles";
import { registrarAccion } from "@/src/lib/historial";

type Params = {
  params: Promise<{ id: string }>;
};

// 🔍 GET → necesario para imprimir soporte
export async function GET(req: Request, { params }: Params) {
  const { denied } = await requireUser();
  if (denied) return denied;

  try {
    const { id } = await params;

    const servicio = await prisma.servicio.findUnique({
      where: { id: Number(id) },
      include: {
        cliente: true,
        vehiculo: true,
        centroOperacion: true,
        tarifa: true,
        seccion: true,
      },
    });

    if (!servicio) {
      return NextResponse.json(
        { error: "Servicio no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(servicio);
  } catch (error) {
    console.error("Error GET /api/servicios/[id]:", error);
    return NextResponse.json(
      { error: "Error al obtener servicio" },
      { status: 500 }
    );
  }
}

// ✏️ PUT → tu lógica actual (EDITAR)
export async function PUT(req: Request, { params }: Params) {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await params;
    const body = await req.json();

    const tarifaId = Number(body.tarifaId);
    const seccionId = Number(body.seccionId);
    const cantidad = Number(body.cantidad);
    const clienteId = Number(body.clienteId);
    const vehiculoId = Number(body.vehiculoId);
    const centroOperacionId = Number(body.centroOperacionId);

    if (
      !tarifaId ||
      !seccionId ||
      !cantidad ||
      !clienteId ||
      !vehiculoId ||
      !centroOperacionId
    ) {
      return NextResponse.json(
        { error: "Todos los campos son obligatorios" },
        { status: 400 }
      );
    }

    const tarifa = await prisma.tarifa.findUnique({
      where: { id: tarifaId },
    });

    if (!tarifa) {
      return NextResponse.json(
        { error: "Tarifa no encontrada" },
        { status: 404 }
      );
    }

    const subtotal = tarifa.valorUnitario * cantidad;

    const servicio = await prisma.servicio.update({
      where: { id: Number(id) },
      data: {
        descripcion: tarifa.descripcion,
        valorUnitario: tarifa.valorUnitario,
        unidadMedida: tarifa.unidadMedida,
        presentacion: tarifa.presentacion,
        categoria: tarifa.categoria,
        cantidad,
        subtotal,
        clienteId,
        vehiculoId,
        centroOperacionId,
        tarifaId,
        seccionId,
      },
      include: {
        cliente: true,
        vehiculo: true,
        centroOperacion: true,
        tarifa: true,
        seccion: true,
      },
    });

    await registrarAccion(
      "EDITAR",
      "Servicios",
      `Editó servicio ${servicio.descripcion} de placa ${servicio.vehiculo?.placa}`
    );

    return NextResponse.json(servicio);
  } catch (error) {
    console.error("Error PUT /api/servicios/[id]:", error);
    return NextResponse.json(
      { error: "Error al actualizar servicio" },
      { status: 500 }
    );
  }
}