import { NextResponse } from "next/server";
import { prisma } from "../../../../src/lib/prisma";
import { requirePermiso } from "@/src/lib/roles";
import { registrarAccion } from "@/src/lib/historial";

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

const IVA_PORCENTAJE = 0.19;
const RETEFUENTE_PORCENTAJE = 0.04;

function redondearPesos(valor: number) {
  return Math.round(valor);
}

type Params = {
  params: Promise<{
    id: string;
  }>;
};

// 🔍 GET → necesario para imprimir soporte
export async function GET(req: Request, { params }: Params) {
  const { denied } = await requirePermiso("servicios", "ver");
  if (denied) return denied;

  try {
    const { id: rawId } = await params;
    const id = Number(rawId);

    if (!id) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const servicio = await prisma.servicio.findUnique({
      where: { id },
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

// ✏️ PUT → EDITAR
export async function PUT(req: Request, { params }: Params) {
  const { denied } = await requirePermiso("servicios", "editar");
  if (denied) return denied;

  try {
    const { id: rawId } = await params;
    const id = Number(rawId);

    if (!id) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await req.json();

    const tarifaId = Number(body.tarifaId);
    const seccionId = Number(body.seccionId);
    const cantidad = Number(body.cantidad);
    const clienteId = Number(body.clienteId);
    const vehiculoId = Number(body.vehiculoId);
    const centroOperacionId = Number(body.centroOperacionId);
    const tipoCarpa = limpiarTexto(body.tipoCarpa);
    const formaPago = normalizarFormaPago(body.formaPago);
    const reteIva = normalizarBoolean(body.reteIva);
    const facturaElectronica = normalizarBoolean(body.facturaElectronica);

    if (
      !tarifaId ||
      !seccionId ||
      !clienteId ||
      !vehiculoId ||
      !centroOperacionId ||
      !validarNumeroPositivo(cantidad)
    ) {
      return NextResponse.json(
        { error: "Todos los campos son obligatorios y la cantidad debe ser mayor a 0" },
        { status: 400 }
      );
    }

    if (!validarTipoCarpa(tipoCarpa)) {
      return NextResponse.json(
        { error: "Tipo de carpa inválido" },
        { status: 400 }
      );
    }

    if (!validarFormaPago(formaPago)) {
      return NextResponse.json(
        { error: "Forma de pago inválida" },
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

    const valorServicio = redondearPesos(Number(tarifa.valorUnitario) * cantidad);
    const valorAdicionalCarpa = redondearPesos(valorCarpa(tipoCarpa));
    const subtotal = redondearPesos(valorServicio + valorAdicionalCarpa);
    const baseAntesIva = redondearPesos(subtotal / (1 + IVA_PORCENTAJE));
    const valorReteIva = reteIva
      ? redondearPesos(baseAntesIva * RETEFUENTE_PORCENTAJE)
      : 0;
    const totalNeto = redondearPesos(subtotal - valorReteIva);

    const servicio = await prisma.servicio.update({
      where: { id },
      data: {
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
        facturaElectronica,
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
      `Editó soporte ${servicio.numeroSoporte || servicio.id} - ${servicio.descripcion} de placa ${servicio.vehiculo?.placa} - pago: ${formaPago} - Retefuente: ${reteIva ? "sí" : "no"} - Factura electrónica: ${facturaElectronica ? "sí" : "no"}`
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