import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

const IVA_PORCENTAJE = 0.19;
const RETEFUENTE_PORCENTAJE = 0.04;

function limpiarTexto(valor: unknown) {
  return String(valor || "").trim();
}

function extraerIdDesdeSoporte(soporte: string) {
  const limpio = soporte.toUpperCase().replace("SP-", "");
  const id = Number(limpio);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function redondearPesos(valor: number) {
  return Math.round(valor);
}

function valorSinIva(valorConIva: number) {
  return redondearPesos(Number(valorConIva || 0) / (1 + IVA_PORCENTAJE));
}

function valorCarpaLegacy(tipoCarpa: string) {
  if (tipoCarpa === "Tracto Mula") return 46500;
  if (tipoCarpa === "Media Tracto Mula") return 23250;
  if (tipoCarpa === "Doble Troque") return 23150;
  if (tipoCarpa === "Media Doble Troque") return 11575;
  if (tipoCarpa === "Sencillo") return 16950;
  if (tipoCarpa === "Media Sencillo") return 8475;
  return 0;
}

function calcularValorServicio(servicio: { valorUnitario: number; cantidad: number }) {
  return redondearPesos(Number(servicio.valorUnitario || 0) * Number(servicio.cantidad || 0));
}

function calcularValores(servicio: {
  valorUnitario: number;
  cantidad: number;
  subtotal?: number | null;
  tipoCarpa?: string | null;
  reteIva?: boolean | null;
  totalNeto?: number | null;
  tarifa?: { valorUnitario?: number | null } | null;
}) {
  const cantidad = Number(servicio.cantidad || 0);
  const valorGuardado = Number(servicio.valorUnitario || 0);
  const valorTarifaConIva = Number(servicio.tarifa?.valorUnitario || 0);
  const valorUnitarioSinIva =
    valorTarifaConIva > 0 && Math.abs(valorGuardado - valorTarifaConIva) <= 1
      ? valorSinIva(valorTarifaConIva)
      : valorGuardado;
  const valorServicio = redondearPesos(valorUnitarioSinIva * cantidad);

  const valorAdicionalCarpa = valorSinIva(valorCarpaLegacy(limpiarTexto(servicio.tipoCarpa)));
  const subtotalSinIva = redondearPesos(valorServicio + valorAdicionalCarpa);
  const ivaIncluido = redondearPesos(subtotalSinIva * IVA_PORCENTAJE);
  const totalConIva = redondearPesos(subtotalSinIva + ivaIncluido);
  const valorReteIva = servicio.reteIva
    ? redondearPesos(subtotalSinIva * RETEFUENTE_PORCENTAJE)
    : 0;
  const totalNeto = redondearPesos(totalConIva - valorReteIva);

  return {
    valorUnitarioSinIva,
    valorServicio,
    valorAdicionalCarpa,
    totalConIva,
    baseAntesIva: subtotalSinIva,
    ivaIncluido,
    valorReteIva,
    totalNeto,
  };
}

function formatoPesos(valor: number) {
  return `$${Number(valor || 0).toLocaleString("es-CO")}`;
}

function textoMayuscula(valor: unknown, respaldo = "") {
  const texto = limpiarTexto(valor);
  return texto ? texto.toLocaleUpperCase("es-CO") : respaldo;
}

function textoCarpa(tipoCarpa: string | null | undefined, valorAdicionalCarpa: number) {
  const tipo = limpiarTexto(tipoCarpa);

  if (!tipo || valorAdicionalCarpa <= 0) return "SIN CARPA";

  return `${textoMayuscula(tipo)} · ${formatoPesos(valorAdicionalCarpa)}`;
}

type Params = {
  params: Promise<{
    soporte: string;
  }>;
};

export async function GET(_req: Request, { params }: Params) {
  try {
    const { soporte: soporteParam } = await params;
    const soporte = limpiarTexto(decodeURIComponent(soporteParam)).toUpperCase();

    if (!soporte) {
      return NextResponse.json(
        { valido: false, error: "Soporte obligatorio" },
        { status: 400 }
      );
    }

    const idDesdeSoporte = extraerIdDesdeSoporte(soporte);

    const servicio = await prisma.servicio.findFirst({
      where: {
        OR: [
          { numeroSoporte: soporte },
          ...(idDesdeSoporte ? [{ id: idDesdeSoporte }] : []),
        ],
      },
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
        {
          valido: false,
          soporte,
          estado: "NO ENCONTRADO",
          mensaje: "Este soporte no aparece registrado en la base de datos.",
        },
        { status: 404 }
      );
    }

    const valores = calcularValores(servicio);
    const numero = servicio.numeroSoporte || `SP-${String(servicio.id).padStart(6, "0")}`;

    return NextResponse.json({
      valido: true,
      estado: "VÁLIDO",
      soporte: numero,
      fecha: servicio.createdAt,
      cliente: servicio.cliente?.nombre || "",
      documento: servicio.cliente?.ccNit || "",
      placa: servicio.vehiculo?.placa || "",
      centro: servicio.centroOperacion?.nombre || "",
      seccion: servicio.seccion?.nombre || "",
      descripcion: servicio.descripcion || "",
      tarifa: servicio.tarifa?.codigo || "",
      tipoCarpa: servicio.tipoCarpa || "Sin carpa",
      carpaDetalle: textoCarpa(servicio.tipoCarpa, valores.valorAdicionalCarpa),
      valorUnitarioSinIva: valores.valorUnitarioSinIva,
      valorServicioSinIva: valores.valorServicio,
      valorAdicionalCarpa: valores.valorAdicionalCarpa,
      subtotalSinIva: valores.baseAntesIva,
      iva19: valores.ivaIncluido,
      formaPago: servicio.formaPago || "",
      facturaElectronica: Boolean(servicio.facturaElectronica),
      retefuente: Boolean(servicio.reteIva),
      cantidad: Number(servicio.cantidad || 0),
      totalConIva: valores.totalConIva,
      totalNeto: valores.totalNeto,
    });
  } catch (error) {
    console.error("Error GET /api/verificar/[soporte]:", error);

    return NextResponse.json(
      { valido: false, error: "Error al verificar soporte" },
      { status: 500 }
    );
  }
}
