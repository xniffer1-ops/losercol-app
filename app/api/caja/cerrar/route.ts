import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireUser } from "@/src/lib/roles";
import { getUser } from "@/src/lib/auth";
import { registrarAccion } from "@/src/lib/historial";

function fechaColombiaHoy() {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(req: Request) {
  const { denied } = await requireUser();
  if (denied) return denied;

  try {
    const user = await getUser();
    const body = await req.json();
    const fecha = body.fecha || fechaColombiaHoy();
    const usuario = user?.email || user?.nombre || "sin usuario";

    const existe = await prisma.cierreCaja.findUnique({
      where: {
        fecha_usuario: {
          fecha,
          usuario,
        },
      },
    });

    if (existe) {
      return NextResponse.json(
        { error: "La caja de este día ya fue cerrada" },
        { status: 400 }
      );
    }

    const inicio = new Date(`${fecha}T00:00:00`);
    const fin = new Date(`${fecha}T23:59:59`);

    const servicios = await prisma.servicio.findMany({
      where: {
        createdAt: {
          gte: inicio,
          lte: fin,
        },
      },
    });

    let efectivo = 0;
    let transferencia = 0;
    let credito = 0;

    servicios.forEach((s) => {
      const valor = Number(s.subtotal || 0);

      if (s.formaPago === "efectivo") efectivo += valor;
      else if (s.formaPago === "transferencia") transferencia += valor;
      else credito += valor;
    });

    const total = efectivo + transferencia + credito;

    const cierre = await prisma.cierreCaja.create({
      data: {
        fecha,
        usuario,
        efectivo,
        transferencia,
        credito,
        total,
        cantidadServicios: servicios.length,
        cerrado: true,
      },
    });

    await registrarAccion(
      "CREAR",
      "Caja",
      `Cerró caja ${fecha} por valor ${total}`
    );

    return NextResponse.json(cierre, { status: 201 });
  } catch (error) {
    console.error("Error POST /api/caja/cerrar:", error);
    return NextResponse.json(
      { error: "Error cerrando caja" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const { denied } = await requireUser();
  if (denied) return denied;

  try {
    const user = await getUser();

    if (!user || user.rol !== "admin") {
      return NextResponse.json(
        { error: "Solo admin puede abrir nuevamente la caja" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const id = Number(body.id);

    if (!id) {
      return NextResponse.json(
        { error: "ID de cierre obligatorio" },
        { status: 400 }
      );
    }

    const cierre = await prisma.cierreCaja.findUnique({
      where: { id },
    });

    if (!cierre) {
      return NextResponse.json(
        { error: "Cierre de caja no encontrado" },
        { status: 404 }
      );
    }

    await prisma.cierreCaja.delete({
      where: { id },
    });

    await registrarAccion(
      "ELIMINAR",
      "Caja",
      `Abrió nuevamente la caja ${cierre.fecha} del usuario ${cierre.usuario}`
    );

    return NextResponse.json({
      ok: true,
      mensaje: "Caja abierta nuevamente",
    });
  } catch (error) {
    console.error("Error DELETE /api/caja/cerrar:", error);
    return NextResponse.json(
      { error: "Error abriendo caja nuevamente" },
      { status: 500 }
    );
  }
}