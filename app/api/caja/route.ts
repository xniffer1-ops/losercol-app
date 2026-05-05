import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireUser } from "@/src/lib/roles";
import { getUser } from "@/src/lib/auth";

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

export async function GET(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const fecha = searchParams.get("fecha") || fechaColombiaHoy();
    const usuario = user.email || user.nombre || "sin usuario";
    const esAdmin = user.rol === "admin" || user.rol === "superadmin";

    const { inicio, fin } = rangoDiaColombia(fecha);

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
        formaPago: normalizarPago(s.formaPago),
        subtotal: Number(s.subtotal || 0),
        totalNeto: Number(s.totalNeto || 0),
        reteIva: Boolean(s.reteIva),
        valorReteIva: Number(s.valorReteIva || 0),
        facturaElectronica: Boolean(s.facturaElectronica),
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