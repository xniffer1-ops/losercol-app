import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireUser } from "@/src/lib/roles";
import { getUser } from "@/src/lib/auth";

function fechaColombiaHoy() {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const { denied } = await requireUser();
  if (denied) return denied;

  try {
    const user = await getUser();
    const { searchParams } = new URL(req.url);
    const fecha = searchParams.get("fecha") || fechaColombiaHoy();
    const usuario = user?.email || user?.nombre || "sin usuario";
    const esAdmin = user?.rol === "admin";

    const inicio = new Date(`${fecha}T00:00:00`);
    const fin = new Date(`${fecha}T23:59:59`);

    const servicios = await prisma.servicio.findMany({
      where: {
        createdAt: {
          gte: inicio,
          lte: fin,
        },
      },
      include: {
        cliente: true,
        vehiculo: true,
        tarifa: true,
        seccion: true,
      },
      orderBy: {
        id: "desc",
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

    const cierreUsuarioActual = await prisma.cierreCaja.findUnique({
      where: {
        fecha_usuario: {
          fecha,
          usuario,
        },
      },
    });

    const cierresDelDia = await prisma.cierreCaja.findMany({
      where: esAdmin ? { fecha } : { fecha, usuario },
      orderBy: { id: "desc" },
    });

    return NextResponse.json({
      fecha,
      usuario,
      esAdmin,
      cerrado: Boolean(cierreUsuarioActual),
      cierre: cierreUsuarioActual,
      cierresDelDia,
      resumen: {
        efectivo,
        transferencia,
        credito,
        total,
        cantidadServicios: servicios.length,
      },
      servicios: servicios.map((s) => ({
        id: s.id,
        numeroSoporte: s.numeroSoporte,
        cliente: s.cliente?.nombre || "-",
        placa: s.vehiculo?.placa || "-",
        servicio: s.descripcion,
        formaPago: s.formaPago || "credito",
        subtotal: Number(s.subtotal || 0),
        createdAt: s.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error GET /api/caja:", error);
    return NextResponse.json(
      { error: "Error cargando caja" },
      { status: 500 }
    );
  }
}