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

function normalizarTextoComparacion(valor: string) {
  return valor
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

type TarifaCarpa = {
  codigo: string;
  descripcion: string;
  valorUnitario: number;
  presentacion?: string | null;
  categoria?: string | null;
};

function valorCarpaLegacy(tipoCarpa: string) {
  if (tipoCarpa === "Tracto Mula") return 46500;
  if (tipoCarpa === "Media Tracto Mula") return 23250;
  if (tipoCarpa === "Doble Troque") return 23150;
  if (tipoCarpa === "Media Doble Troque") return 11575;
  if (tipoCarpa === "Sencillo") return 16950;
  if (tipoCarpa === "Media Sencillo") return 8475;
  return 0;
}

function esTarifaDeCarpa(tarifa: TarifaCarpa) {
  const codigo = tarifa.codigo.toUpperCase().trim();
  const texto = normalizarTextoComparacion(
    `${tarifa.codigo} ${tarifa.descripcion} ${tarifa.presentacion || ""} ${tarifa.categoria || ""}`
  );

  return (
    codigo === "LS009" ||
    codigo === "LS010" ||
    codigo === "LS011" ||
    codigo.startsWith("CARPA_") ||
    texto.includes("carpa") ||
    texto.includes("carpe y descarpe") ||
    texto.includes("descarpe")
  );
}

function nombreCarpaDesdeTarifa(tarifa: TarifaCarpa) {
  const texto = normalizarTextoComparacion(
    `${tarifa.descripcion} ${tarifa.presentacion || ""} ${tarifa.codigo}`
  );

  const esMedia = texto.includes("media");

  if (texto.includes("tracto")) return esMedia ? "Media Tracto Mula" : "Tracto Mula";
  if (texto.includes("doble")) return esMedia ? "Media Doble Troque" : "Doble Troque";
  if (texto.includes("sencillo")) return esMedia ? "Media Sencillo" : "Sencillo";

  return tarifa.descripcion || tarifa.presentacion || tarifa.codigo;
}

function valorCarpaPorCentro(tipoCarpa: string, tarifasCarpa: TarifaCarpa[], centroNombre?: string) {
  if (!tipoCarpa) return 0;

  const texto = normalizarTextoComparacion(tipoCarpa);
  const encontrada = tarifasCarpa.find((tarifa) => {
    const nombre = normalizarTextoComparacion(nombreCarpaDesdeTarifa(tarifa));
    const descripcion = normalizarTextoComparacion(tarifa.descripcion || "");
    const presentacion = normalizarTextoComparacion(tarifa.presentacion || "");
    const codigo = normalizarTextoComparacion(tarifa.codigo || "");

    return (
      nombre === texto ||
      descripcion === texto ||
      presentacion === texto ||
      codigo === texto
    );
  });

  if (encontrada) return Number(encontrada.valorUnitario || 0);

  // Compatibilidad con soportes antiguos de CIPA.
  if (normalizarTextoComparacion(centroNombre || "") === "cipa") {
    return valorCarpaLegacy(tipoCarpa);
  }

  return 0;
}

function normalizarTipoUsoTarifa(valor: unknown) {
  const tipo = limpiarTexto(valor || "terceros")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (tipo === "interno" || tipo === "movimiento" || tipo === "movimiento interno") {
    return "interno";
  }

  if (tipo === "ambos" || tipo === "general") {
    return "ambos";
  }

  return "terceros";
}

function normalizarTipoOperacion(valor: unknown) {
  const tipo = limpiarTexto(valor || "servicioVehiculo");
  return tipo === "movimientoInterno" ? "movimientoInterno" : "servicioVehiculo";
}

function tipoUsoRequeridoParaOperacion(tipoOperacion: string) {
  return tipoOperacion === "movimientoInterno" ? "interno" : "terceros";
}

function normalizarBoolean(valor: unknown) {
  return valor === true || valor === "true" || valor === "si" || valor === "sí";
}

const IVA_PORCENTAJE = 0.19;
const RETEFUENTE_PORCENTAJE = 0.04;

function redondearPesos(valor: number) {
  return Math.round(valor);
}

function valorSinIva(valorConIva: number) {
  return redondearPesos(Number(valorConIva || 0) / (1 + IVA_PORCENTAJE));
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
    const tipoOperacion = normalizarTipoOperacion(body.tipoOperacion);
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

    if (!validarFormaPago(formaPago)) {
      return NextResponse.json(
        { error: "Forma de pago inválida" },
        { status: 400 }
      );
    }

    const [tarifa, centroOperacion, tarifasDelCentro] = await Promise.all([
      prisma.tarifa.findUnique({ where: { id: tarifaId } }),
      prisma.centroOperacion.findUnique({ where: { id: centroOperacionId } }),
      prisma.tarifa.findMany({ where: { centroOperacionId } }),
    ]);

    if (!tarifa) {
      return NextResponse.json(
        { error: "Tarifa no encontrada" },
        { status: 404 }
      );
    }

    if (!centroOperacion) {
      return NextResponse.json(
        { error: "Centro operativo no encontrado" },
        { status: 404 }
      );
    }

    if (tarifa.centroOperacionId && tarifa.centroOperacionId !== centroOperacionId) {
      return NextResponse.json(
        {
          error:
            "La tarifa seleccionada no pertenece al centro de operación elegido.",
        },
        { status: 400 }
      );
    }

    const tipoTarifa = normalizarTipoUsoTarifa(tarifa.tipoUso);
    const tipoRequerido = tipoUsoRequeridoParaOperacion(tipoOperacion);

    if (tipoTarifa !== "ambos" && tipoTarifa !== tipoRequerido) {
      return NextResponse.json(
        {
          error:
            tipoRequerido === "interno"
              ? "Esta tarifa no está marcada para movimientos internos."
              : "Esta tarifa no está marcada para cobro a terceros.",
        },
        { status: 400 }
      );
    }

    const tarifasCarpaCentro = tarifasDelCentro.filter(esTarifaDeCarpa);
    const valorAdicionalCarpaConIva = redondearPesos(
      valorCarpaPorCentro(tipoCarpa, tarifasCarpaCentro, centroOperacion.nombre)
    );

    if (tipoCarpa && valorAdicionalCarpaConIva <= 0) {
      return NextResponse.json(
        {
          error:
            "La carpa seleccionada no pertenece al centro de operación elegido o no tiene valor configurado.",
        },
        { status: 400 }
      );
    }

    // La tarifa y la carpa configuradas se toman como valores CON IVA.
    // En el soporte se guarda y se muestra primero la base sin IVA.
    const valorUnitarioSinIva = valorSinIva(Number(tarifa.valorUnitario));
    const valorServicio = redondearPesos(valorUnitarioSinIva * cantidad);
    const valorAdicionalCarpa = valorSinIva(valorAdicionalCarpaConIva);
    const subtotalSinIva = redondearPesos(valorServicio + valorAdicionalCarpa);
    const iva = redondearPesos(subtotalSinIva * IVA_PORCENTAJE);
    const subtotal = redondearPesos(subtotalSinIva + iva);
    const valorReteIva = reteIva
      ? redondearPesos(subtotalSinIva * RETEFUENTE_PORCENTAJE)
      : 0;
    const totalNeto = redondearPesos(subtotal - valorReteIva);

    const servicio = await prisma.servicio.update({
      where: { id },
      data: {
        descripcion: tarifa.descripcion,
        valorUnitario: valorUnitarioSinIva,
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