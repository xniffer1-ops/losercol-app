import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/prisma";
import { requirePermiso } from "@/src/lib/roles";
import { tienePermiso, type AccionPermiso, type ModuloPermiso } from "@/src/lib/permisos";
import { registrarAccion } from "@/src/lib/historial";
import { getUser } from "@/src/lib/auth";
import { tienePermisoCentro, idsCentrosConPermiso } from "@/src/lib/permisos-centros";
import { obtenerSiguienteNumeroSoporte } from "@/src/lib/soporte-gestion";

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

function normalizarTextoComparacion(valor: string) {
  return valor
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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

type TarifaCarpa = {
  codigo: string;
  descripcion: string;
  valorUnitario: number;
  presentacion?: string | null;
  categoria?: string | null;
};

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
  const encontrada = tarifasCarpa.find(
    (tarifa) => normalizarTextoComparacion(nombreCarpaDesdeTarifa(tarifa)) === texto
  );

  if (encontrada) return Number(encontrada.valorUnitario || 0);

  // Compatibilidad con soportes antiguos de CIPA si aún no se han creado las tarifas de carpa.
  if (normalizarTextoComparacion(centroNombre || "") === "cipa") {
    return valorCarpaLegacy(tipoCarpa);
  }

  return 0;
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

function tipoUsoRequeridoParaOperacion(tipoOperacion: string) {
  return tipoOperacion === "movimientoInterno" ? "interno" : "terceros";
}

const IVA_PORCENTAJE = 0.19;
const RETEIVA_PORCENTAJE = 0.04;

function redondearPesos(valor: number) {
  return Math.round(valor);
}

function valorSinIva(valorConIva: number) {
  return redondearPesos(Number(valorConIva || 0) / (1 + IVA_PORCENTAJE));
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

async function requirePermisoInterno(
  permisosPermitidos: Array<[ModuloPermiso, AccionPermiso]>
) {
  const user = await getUser();

  if (!user) {
    return {
      user: null,
      denied: NextResponse.json({ error: "No autorizado" }, { status: 401 }),
    };
  }

  if (user.rol === "superadmin") {
    return { user, denied: null };
  }

  const permitido = permisosPermitidos.some(([modulo, accion]) =>
    tienePermiso(user.permisos, modulo, accion)
  );

  if (!permitido) {
    return {
      user,
      denied: NextResponse.json(
        { error: "No tienes permiso para esta acción" },
        { status: 403 }
      ),
    };
  }

  return { user, denied: null };
}

export async function GET(req: Request) {
  const { user, denied } = await requirePermiso("servicios", "ver");
  if (denied || !user) return denied ?? NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const placa = limpiarTexto(searchParams.get("placa"));
    const fechaInicio = limpiarTexto(searchParams.get("fechaInicio"));
    const fechaFin = limpiarTexto(searchParams.get("fechaFin"));
    const centroOperacionId = Number(searchParams.get("centroOperacionId") || 0);
    const tipoUso = limpiarTexto(searchParams.get("tipoUso"));

    const where: any = {};

    if (placa) {
      where.vehiculo = {
        placa: {
          contains: placa.toUpperCase(),
        },
      };
    }

    const centrosPermitidos = idsCentrosConPermiso(user, "ver");
    if (Number.isFinite(centroOperacionId) && centroOperacionId > 0) {
      if (!tienePermisoCentro(user, centroOperacionId, "ver")) {
        return NextResponse.json({ error: "No tienes acceso a este centro" }, { status: 403 });
      }
      where.centroOperacionId = centroOperacionId;
    } else if (centrosPermitidos) {
      where.centroOperacionId = { in: centrosPermitidos };
    }

    if (tipoUso) {
      const tipoNormalizado = normalizarTipoUsoTarifa(tipoUso);
      where.tarifa = {
        is: {
          OR: [{ tipoUso: tipoNormalizado }, { tipoUso: "ambos" }],
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
  const { user, denied } = await requirePermisoInterno([
    ["servicios", "crear"],
    ["servicioRapido", "crear"],
  ]);
  if (denied) return denied;

  try {
    const body = await req.json();

    const fechaHoy = fechaInputHoy();
    const usuario = user?.email || user?.nombre || "sin usuario";

    const centroOperacionIdCierre = Number(body.centroOperacionId);

    const cierre = await prisma.cierreCaja.findFirst({
      where: {
        fecha: fechaHoy,
        usuario,
        OR: [
          { centroOperacionId: null },
          Number.isFinite(centroOperacionIdCierre) && centroOperacionIdCierre > 0
            ? { centroOperacionId: centroOperacionIdCierre }
            : { centroOperacionId: null },
        ],
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

    if (!tienePermisoCentro(user, centroOperacionId, "crear")) {
      return NextResponse.json({ error: "No tienes permiso para crear en este centro" }, { status: 403 });
    }

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

    if (!validarFormaPago(formaPago)) {
      return NextResponse.json(
        { error: "Forma de pago inválida" },
        { status: 400 }
      );
    }

    const [tarifa, cliente, vehiculo, centroOperacion, seccion, tarifasDelCentro] =
      await Promise.all([
        esSoloCarpa
          ? Promise.resolve(null)
          : prisma.tarifa.findUnique({ where: { id: tarifaId } }),
        prisma.cliente.findUnique({ where: { id: clienteId } }),
        prisma.vehiculo.findUnique({ where: { id: vehiculoId } }),
        prisma.centroOperacion.findUnique({ where: { id: centroOperacionId } }),
        prisma.seccion.findUnique({ where: { id: seccionId } }),
        prisma.tarifa.findMany({ where: { centroOperacionId } }),
      ]);

    if (!esSoloCarpa && !tarifa) {
      return NextResponse.json(
        { error: "Tarifa no encontrada" },
        { status: 404 }
      );
    }

    if (!esSoloCarpa && tarifa?.centroOperacionId && tarifa.centroOperacionId !== centroOperacionId) {
      return NextResponse.json(
        {
          error:
            "La tarifa seleccionada no pertenece al centro de operación elegido.",
        },
        { status: 400 }
      );
    }

    if (!esSoloCarpa && tarifa) {
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

    const tarifasCarpaCentro = tarifasDelCentro.filter(esTarifaDeCarpa);
    const valorAdicionalCarpaCalculado = redondearPesos(
      valorCarpaPorCentro(tipoCarpa, tarifasCarpaCentro, centroOperacion.nombre)
    );

    if (tipoCarpa && valorAdicionalCarpaCalculado <= 0) {
      return NextResponse.json(
        {
          error:
            "La carpa seleccionada no pertenece al centro de operación elegido o no tiene valor configurado.",
        },
        { status: 400 }
      );
    }

    if (esSoloCarpa && (!tipoCarpa || valorAdicionalCarpaCalculado <= 0)) {
      return NextResponse.json(
        { error: "Para solo carpa debes seleccionar una carpa válida del centro elegido" },
        { status: 400 }
      );
    }

    const numeroSoporte = await obtenerSiguienteNumeroSoporte();

    const descripcion = esSoloCarpa
      ? `SERVICIO DE CARPA - ${tipoCarpa}`
      : tarifa?.descripcion || "";
    const valorUnitarioConIva = esSoloCarpa ? 0 : Number(tarifa?.valorUnitario || 0);
    const valorUnitario = valorSinIva(valorUnitarioConIva);
    const unidadMedida = esSoloCarpa ? "Servicio" : tarifa?.unidadMedida;
    const presentacion = esSoloCarpa ? "Carpa" : tarifa?.presentacion;
    const categoria = esSoloCarpa ? "Carpa" : tarifa?.categoria;

    // Las tarifas y carpas configuradas se toman como valores CON IVA.
    // Para el soporte se desglosa primero la base sin IVA y luego se calcula IVA 19%.
    const valorServicio = redondearPesos(valorUnitario * cantidad);
    const valorAdicionalCarpa = valorSinIva(valorAdicionalCarpaCalculado);
    const subtotalSinIva = redondearPesos(valorServicio + valorAdicionalCarpa);
    const ivaIncluido = redondearPesos(subtotalSinIva * IVA_PORCENTAJE);
    const subtotal = redondearPesos(subtotalSinIva + ivaIncluido);
    const baseAntesIva = subtotalSinIva;
    const valorReteIva = reteIva
      ? redondearPesos(subtotalSinIva * RETEIVA_PORCENTAJE)
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
      } - pago: ${formaPago} - Subtotal sin IVA: $${baseAntesIva.toLocaleString("es-CO")} - IVA 19%: $${ivaIncluido.toLocaleString("es-CO")} - Retefuente: ${
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
  const { user, denied } = await requirePermiso("servicios", "eliminar");
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

    if (!tienePermisoCentro(user, servicio.centroOperacionId, "eliminar")) {
      return NextResponse.json({ error: "No tienes permiso para eliminar en este centro" }, { status: 403 });
    }

    const numeroSoporte = servicio.numeroSoporte || `SP-${String(servicio.id).padStart(6, "0")}`;

    await prisma.$transaction(async (tx) => {
      await tx.soporteEliminado.create({
        data: {
          originalServicioId: servicio.id,
          numeroSoporte,
          eliminadoPor: user.email,
          datos: JSON.parse(JSON.stringify(servicio)),
        },
      });

      await tx.servicio.delete({
        where: { id: servicioId },
      });
    });

    await registrarAccion(
      "ELIMINAR",
      "Servicios",
      `Eliminó soporte ${numeroSoporte} y quedó disponible en recuperación`
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
