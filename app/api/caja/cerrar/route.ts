import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireUser } from "@/src/lib/roles";
import { getUser } from "@/src/lib/auth";
import { registrarAccion } from "@/src/lib/historial";

function fechaColombiaHoy() {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = partes.find((parte) => parte.type === "year")?.value || "";
  const month = partes.find((parte) => parte.type === "month")?.value || "";
  const day = partes.find((parte) => parte.type === "day")?.value || "";

  return `${year}-${month}-${day}`;
}

function rangoDiaColombia(fecha: string) {
  return {
    inicio: new Date(`${fecha}T00:00:00.000-05:00`),
    fin: new Date(`${fecha}T23:59:59.999-05:00`),
  };
}

function normalizarPago(valor: unknown) {
  return String(valor || "credito").toLowerCase().trim();
}

function valorServicioCaja(servicio: {
  subtotal?: number | null;
  totalNeto?: number | null;
}) {
  const totalNeto = Number(servicio.totalNeto || 0);
  const subtotal = Number(servicio.subtotal || 0);

  return totalNeto > 0 ? totalNeto : subtotal;
}

export async function POST(req: Request) {
  const { denied } = await requireUser();
  if (denied) return denied;

  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json(
        { error: "No hay sesión activa" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const fecha = body.fecha || fechaColombiaHoy();
    const usuario = user.email || user.nombre || "sin usuario";

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

    const { inicio, fin } = rangoDiaColombia(fecha);

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
      const valor = valorServicioCaja(s);
      const formaPago = normalizarPago(s.formaPago);

      if (formaPago === "efectivo") {
        efectivo += valor;
      } else if (formaPago === "transferencia") {
        transferencia += valor;
      } else {
        credito += valor;
      }
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
      `Cerró caja ${fecha} del usuario ${usuario} por valor ${Math.round(
        total
      ).toLocaleString("es-CO")}`
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

    if (!user || (user.rol !== "admin" && user.rol !== "superadmin")) {
      return NextResponse.json(
        { error: "Solo admin o superadmin puede abrir nuevamente la caja" },
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