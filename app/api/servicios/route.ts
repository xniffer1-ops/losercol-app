import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/prisma";
import { requireAdmin, requireUser } from "@/src/lib/roles";
import { registrarAccion } from "@/src/lib/historial";
import { getUser } from "@/src/lib/auth";

function limpiarTexto(valor: unknown) {
  return String(valor || "").trim();
}

function validarNumeroPositivo(valor: unknown) {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > 0;
}

function normalizarFormaPago(formaPago: unknown) {
  return limpiarTexto(formaPago || "credito").toLowerCase();
}

function validarFormaPago(formaPago: string) {
  return (
    formaPago === "" ||
    formaPago === "credito" ||
    formaPago === "efectivo" ||
    formaPago === "transferencia"
  );
}

function valorCarpa(tipoCarpa: string) {
  if (tipoCarpa === "Tracto Mula") return 46500;
  if (tipoCarpa === "Doble Troque") return 23150;
  if (tipoCarpa === "Sencillo") return 16950;
  return 0;
}

function validarTipoCarpa(tipoCarpa: string) {
  return (
    tipoCarpa === "" ||
    tipoCarpa === "Tracto Mula" ||
    tipoCarpa === "Doble Troque" ||
    tipoCarpa === "Sencillo"
  );
}

function normalizarBoolean(valor: unknown) {
  return valor === true || valor === "true" || valor === "si" || valor === "sí";
}

export async function GET(req: Request) {
  const { denied } = await requireUser();
  if (denied) return denied;

  try {
    const { searchParams } = new URL(req.url);
    const placa = limpiarTexto(searchParams.get("placa"));
    const fechaInicio = limpiarTexto(searchParams.get("fechaInicio"));
    const fechaFin = limpiarTexto(searchParams.get("fechaFin"));

    const where: any = {};

    if (placa) {
      where.vehiculo = {
        placa: {
          contains: placa.toUpperCase(),
        },
      };
    }

    if (fechaInicio || fechaFin) {
      where.createdAt = {};

      if (fechaInicio) {
        where.createdAt.gte = new Date(`${fechaInicio}T00:00:00`);
      }

      if (fechaFin) {
        where.createdAt.lte = new Date(`${fechaFin}T23:59:59`);
      }
    }

    const servicios = await prisma.servicio.findMany({
      where,
      include: {
        cliente: true,
        vehiculo: true,
        centroOperacion: true,
        tarifa: true,
        seccion: true,
        soporte: true,
      },
      orderBy: { id: "desc" },
    });

    return NextResponse.json(servicios);
  } catch (error) {
    console.error("Error GET /api/servicios:", error);

    return NextResponse.json(
      { error: "Error al obtener servicios" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const { denied } = await requireUser();
  if (denied) return denied;

  try {
    const user = await getUser();
    const body = await req.json();

    const fechaHoy = new Date().toISOString().slice(0, 10);
    const usuario = user?.email || user?.nombre || "sin usuario";

    const cierre = await prisma.cierreCaja.findUnique({
      where: {
        fecha_usuario: {
          fecha: fechaHoy,
          usuario,
        },
      },
    });

    if (cierre && user?.rol !== "admin") {
      return NextResponse.json(
        {
          error:
            "La caja de hoy ya está cerrada. No se pueden crear más servicios.",
        },
        { status: 403 }
      );
    }

    const tarifaId = Number(body.tarifaId);
    const seccionId = Number(body.seccionId);
    const cantidad = Number(body.cantidad);
    const clienteId = Number(body.clienteId);
    const vehiculoId = Number(body.vehiculoId);
    const centroOperacionId = Number(body.centroOperacionId);
    const tipoCarpa = limpiarTexto(body.tipoCarpa);
    const formaPago = normalizarFormaPago(body.formaPago);
    const reteIva = normalizarBoolean(body.reteIva);

    if (
      !tarifaId ||
      !seccionId ||
      !clienteId ||
      !vehiculoId ||
      !centroOperacionId ||
      !validarNumeroPositivo(cantidad)
    ) {
      return NextResponse.json(
        {
          error:
            "Todos los campos son obligatorios y la cantidad debe ser mayor a 0",
        },
        { status: 400 }
      );
    }

    if (!validarFormaPago(formaPago)) {
      return NextResponse.json(
        { error: "Forma de pago inválida" },
        { status: 400 }
      );
    }

    if (!validarTipoCarpa(tipoCarpa)) {
      return NextResponse.json(
        { error: "Tipo de carpa inválido" },
        { status: 400 }
      );
    }

    const [tarifa, cliente, vehiculo, centroOperacion, seccion] =
      await Promise.all([
        prisma.tarifa.findUnique({ where: { id: tarifaId } }),
        prisma.cliente.findUnique({ where: { id: clienteId } }),
        prisma.vehiculo.findUnique({ where: { id: vehiculoId } }),
        prisma.centroOperacion.findUnique({ where: { id: centroOperacionId } }),
        prisma.seccion.findUnique({ where: { id: seccionId } }),
      ]);

    if (!tarifa) {
      return NextResponse.json(
        { error: "Tarifa no encontrada" },
        { status: 404 }
      );
    }

    if (!cliente) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    if (!vehiculo) {
      return NextResponse.json(
        { error: "Vehículo no encontrado" },
        { status: 404 }
      );
    }

    if (!centroOperacion) {
      return NextResponse.json(
        { error: "Centro operativo no encontrado" },
        { status: 404 }
      );
    }

    if (!seccion) {
      return NextResponse.json(
        { error: "Sección no encontrada" },
        { status: 404 }
      );
    }

    const ultimoServicio = await prisma.servicio.findFirst({
      orderBy: { id: "desc" },
    });

    const siguienteNumero = (ultimoServicio?.id || 0) + 1;
    const numeroSoporte = `SP-${String(siguienteNumero).padStart(6, "0")}`;

    const valorServicio = Number(tarifa.valorUnitario) * cantidad;
    const valorAdicionalCarpa = valorCarpa(tipoCarpa);
    const subtotal = valorServicio + valorAdicionalCarpa;
    const valorReteIva = reteIva ? subtotal * 0.04 : 0;
    const totalNeto = subtotal - valorReteIva;

    const servicio = await prisma.servicio.create({
      data: {
        numeroSoporte,
        descripcion: tarifa.descripcion,
        valorUnitario: tarifa.valorUnitario,
        tipoCarpa: tipoCarpa || null,
        formaPago,
        unidadMedida: tarifa.unidadMedida,
        presentacion: tarifa.presentacion,
        categoria: tarifa.categoria,
        cantidad,
        subtotal,
        reteIva,
        valorReteIva,
        totalNeto,
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
        soporte: true,
      },
    });

    await registrarAccion(
      "CREAR",
      "Servicios",
      `Creó soporte ${numeroSoporte} - ${tarifa.descripcion}${
        tipoCarpa ? ` + carpa ${tipoCarpa}` : ""
      } - pago: ${formaPago} - ReteIVA: ${reteIva ? "sí" : "no"}`
    );

    return NextResponse.json(servicio, { status: 201 });
  } catch (error) {
    console.error("Error POST /api/servicios:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Error al guardar servicio",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await req.json();
    const servicioId = Number(id);

    if (!servicioId) {
      return NextResponse.json({ error: "ID obligatorio" }, { status: 400 });
    }

    const servicio = await prisma.servicio.findUnique({
      where: { id: servicioId },
    });

    if (!servicio) {
      return NextResponse.json(
        { error: "Servicio no encontrado" },
        { status: 404 }
      );
    }

    await prisma.servicio.delete({
      where: { id: servicioId },
    });

    await registrarAccion(
      "ELIMINAR",
      "Servicios",
      `Eliminó soporte ${servicio.numeroSoporte || servicio.id}`
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error DELETE /api/servicios:", error);

    return NextResponse.json(
      { error: "Error al eliminar servicio" },
      { status: 500 }
    );
  }
}