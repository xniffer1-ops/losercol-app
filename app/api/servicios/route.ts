import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/prisma";
import { requirePermiso } from "@/src/lib/roles";
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
  return limpiarTexto(formaPago || "efectivo")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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
  if (tipoCarpa === "Media Tracto Mula") return 23250;
  if (tipoCarpa === "Doble Troque") return 23150;
  if (tipoCarpa === "Media Doble Troque") return 11575;
  if (tipoCarpa === "Sencillo") return 16950;
  if (tipoCarpa === "Media Sencillo") return 8475;
  return 0;
}

function validarTipoCarpa(tipoCarpa: string) {
  return (
    tipoCarpa === "" ||
    tipoCarpa === "Tracto Mula" ||
    tipoCarpa === "Media Tracto Mula" ||
    tipoCarpa === "Doble Troque" ||
    tipoCarpa === "Media Doble Troque" ||
    tipoCarpa === "Sencillo" ||
    tipoCarpa === "Media Sencillo"
  );
}

function normalizarBoolean(valor: unknown) {
  return valor === true || valor === "true" || valor === "si" || valor === "sí";
}

function normalizarTipoOperacion(valor: unknown) {
  const tipo = limpiarTexto(valor || "servicioVehiculo");

  if (tipo === "movimientoInterno") return "movimientoInterno";
  if (tipo === "soloCarpa") return "soloCarpa";
  return "servicioVehiculo";
}

const IVA_PORCENTAJE = 0.19;
const RETEIVA_PORCENTAJE = 0.04;

function redondearPesos(valor: number) {
  return Math.round(valor);
}

function fechaInputHoy() {
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

export async function GET(req: Request) {
  const { denied } = await requirePermiso("servicios", "ver");
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

    const fechaInicioConsulta = fechaInicio || fechaInputHoy();
    const fechaFinConsulta = fechaFin || fechaInicioConsulta;

    const rangoInicio = rangoDiaColombia(fechaInicioConsulta);
    const rangoFin = rangoDiaColombia(fechaFinConsulta);

    where.createdAt = {
      gte: rangoInicio.inicio,
      lte: rangoFin.fin,
    };

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
  const { denied } = await requirePermiso("servicios", "crear");
  if (denied) return denied;

  try {
    const user = await getUser();
    const body = await req.json();

    const fechaHoy = fechaInputHoy();
    const usuario = user?.email || user?.nombre || "sin usuario";

    const cierre = await prisma.cierreCaja.findUnique({
      where: {
        fecha_usuario: {
          fecha: fechaHoy,
          usuario,
        },
      },
    });

    if (cierre && user?.rol !== "admin" && user?.rol !== "superadmin") {
      return NextResponse.json(
        {
          error:
            "La caja de hoy ya está cerrada. No se pueden crear más servicios.",
        },
        { status: 403 }
      );
    }

    const tipoOperacion = normalizarTipoOperacion(body.tipoOperacion);
    const esSoloCarpa = tipoOperacion === "soloCarpa";

    const tarifaId = Number(body.tarifaId);
    const seccionId = Number(body.seccionId);
    const cantidadRecibida = Number(body.cantidad);
    const cantidad = esSoloCarpa ? 1 : cantidadRecibida;
    const clienteId = Number(body.clienteId);
    const vehiculoId = Number(body.vehiculoId);
    const centroOperacionId = Number(body.centroOperacionId);
    const tipoCarpa = limpiarTexto(body.tipoCarpa);
    const formaPago = normalizarFormaPago(body.formaPago);
    const reteIva = normalizarBoolean(body.reteIva);
    const facturaElectronica = normalizarBoolean(body.facturaElectronica);

    if (!seccionId || !clienteId || !vehiculoId || !centroOperacionId) {
      return NextResponse.json(
        { error: "Cliente, vehículo, centro y sección son obligatorios" },
        { status: 400 }
      );
    }

    if (!esSoloCarpa && (!tarifaId || !validarNumeroPositivo(cantidad))) {
      return NextResponse.json(
        {
          error:
            "Selecciona una tarifa y una cantidad mayor a 0 para este servicio",
        },
        { status: 400 }
      );
    }

    if (esSoloCarpa && (!tipoCarpa || valorCarpa(tipoCarpa) <= 0)) {
      return NextResponse.json(
        { error: "Para solo carpa debes seleccionar un tipo de carpa válido" },
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
        esSoloCarpa
          ? Promise.resolve(null)
          : prisma.tarifa.findUnique({ where: { id: tarifaId } }),
        prisma.cliente.findUnique({ where: { id: clienteId } }),
        prisma.vehiculo.findUnique({ where: { id: vehiculoId } }),
        prisma.centroOperacion.findUnique({ where: { id: centroOperacionId } }),
        prisma.seccion.findUnique({ where: { id: seccionId } }),
      ]);

    if (!esSoloCarpa && !tarifa) {
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

    const descripcion = esSoloCarpa
      ? `SERVICIO DE CARPA - ${tipoCarpa}`
      : tarifa?.descripcion || "";
    const valorUnitario = esSoloCarpa ? 0 : Number(tarifa?.valorUnitario || 0);
    const unidadMedida = esSoloCarpa ? "Servicio" : tarifa?.unidadMedida;
    const presentacion = esSoloCarpa ? "Carpa" : tarifa?.presentacion;
    const categoria = esSoloCarpa ? "Carpa" : tarifa?.categoria;

    const valorServicio = redondearPesos(valorUnitario * cantidad);
    const valorAdicionalCarpa = redondearPesos(valorCarpa(tipoCarpa));
    const subtotal = redondearPesos(valorServicio + valorAdicionalCarpa);
    const baseAntesIva = redondearPesos(subtotal / (1 + IVA_PORCENTAJE));
    const ivaIncluido = redondearPesos(subtotal - baseAntesIva);
    const valorReteIva = reteIva
      ? redondearPesos(baseAntesIva * RETEIVA_PORCENTAJE)
      : 0;
    const totalNeto = redondearPesos(subtotal - valorReteIva);

    const servicio = await prisma.servicio.create({
      data: {
        numeroSoporte,
        descripcion,
        valorUnitario,
        tipoCarpa: tipoCarpa || null,
        formaPago,
        unidadMedida,
        presentacion,
        categoria,
        cantidad,
        subtotal,
        reteIva,
        valorReteIva,
        totalNeto,
        facturaElectronica,
        clienteId,
        vehiculoId,
        centroOperacionId,
        tarifaId: esSoloCarpa ? null : tarifaId,
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
      `Creó soporte ${numeroSoporte} - ${descripcion}${
        tipoCarpa ? ` + carpa ${tipoCarpa}` : ""
      } - pago: ${formaPago} - Base IVA: $${baseAntesIva.toLocaleString("es-CO")} - IVA incluido: $${ivaIncluido.toLocaleString("es-CO")} - Retefuente: ${
        reteIva ? "sí" : "no"
      } - Factura electrónica: ${facturaElectronica ? "sí" : "no"}`
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
  const { denied } = await requirePermiso("servicios", "eliminar");
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
