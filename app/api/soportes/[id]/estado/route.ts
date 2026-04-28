import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireUser } from "@/src/lib/roles";
import { registrarAccion } from "@/src/lib/historial";

const estadosPermitidos = ["pendiente", "proceso", "terminado", "facturado"];

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { denied, user } = await requireUser();
  if (denied) return denied;

  try {
    const soporteId = Number(params.id);
    const body = await req.json();
    const nuevoEstado = String(body.estado || "").trim();

    if (!soporteId || !estadosPermitidos.includes(nuevoEstado)) {
      return NextResponse.json(
        { error: "Estado o soporte inválido" },
        { status: 400 }
      );
    }

    if (nuevoEstado === "facturado" && user?.rol !== "admin") {
      return NextResponse.json(
        { error: "Solo un administrador puede marcar como facturado" },
        { status: 403 }
      );
    }

    const data: {
      estado: string;
      horaInicio?: Date;
      horaFinal?: Date;
    } = {
      estado: nuevoEstado,
    };

    if (nuevoEstado === "proceso") {
      data.horaInicio = new Date();
    }

    if (nuevoEstado === "terminado") {
      data.horaFinal = new Date();
    }

    const soporte = await prisma.soporte.update({
      where: { id: soporteId },
      data,
      include: {
        cliente: true,
        vehiculo: true,
        centroOperacion: true,
        seccion: true,
        servicios: true,
      },
    });

    await registrarAccion(
      "ACTUALIZAR",
      "Soportes",
      `Cambió estado del soporte ${soporte.numero} a ${nuevoEstado}`
    );

    return NextResponse.json(soporte);
  } catch (error) {
    console.error("Error PUT /api/soportes/[id]/estado:", error);

    return NextResponse.json(
      { error: "Error al actualizar estado del soporte" },
      { status: 500 }
    );
  }
}