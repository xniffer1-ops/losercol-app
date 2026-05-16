import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/prisma";
import { requireRoles } from "@/src/lib/roles";

function valorCarpa(tipo?: string | null) {
  if (tipo === "Tracto Mula") return 46500;
  if (tipo === "Media Tracto Mula") return 23250;
  if (tipo === "Doble Troque") return 23150;
  if (tipo === "Media Doble Troque") return 11575;
  if (tipo === "Sencillo") return 16950;
  if (tipo === "Media Sencillo") return 8475;
  return 0;
}

function fechaColombiaInput(fecha = new Date()) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(fecha);

  const year = partes.find((parte) => parte.type === "year")?.value || "";
  const month = partes.find((parte) => parte.type === "month")?.value || "";
  const day = partes.find((parte) => parte.type === "day")?.value || "";

  return `${year}-${month}-${day}`;
}

function fechaInputHoy() {
  return fechaColombiaInput();
}

function primerDiaMesInput() {
  const fechaColombia = fechaInputHoy();
  return `${fechaColombia.slice(0, 8)}01`;
}

function rangoDiaColombia(fecha: string) {
  return {
    inicio: new Date(`${fecha}T00:00:00.000-05:00`),
    fin: new Date(`${fecha}T23:59:59.999-05:00`),
  };
}

function fechaColombiaDesdeDate(fecha: Date) {
  return fechaColombiaInput(fecha);
}

function fechaColombiaLegible(fecha: Date) {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(fecha);
}

function valorRealServicio(servicio: {
  subtotal?: number | null;
  totalNeto?: number | null;
}) {
  const totalNeto = Number(servicio.totalNeto || 0);
  const subtotal = Number(servicio.subtotal || 0);

  return totalNeto > 0 ? totalNeto : subtotal;
}

function normalizarUnidadMedida(valor?: string | null) {
  const unidad = String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (unidad.includes("tonelada")) return "toneladas";
  if (unidad.includes("hora")) return "horasHombre";
  if (unidad.includes("unidad")) return "unidades";
  if (unidad.includes("vehiculo")) return "vehiculos";
  return "otros";
}

function sumarCantidadPorUnidad(servicios: Array<{ cantidad?: number | null; tarifa?: { unidadMedida?: string | null } | null }>) {
  const resumen = {
    toneladas: 0,
    horasHombre: 0,
    unidades: 0,
    vehiculos: 0,
    otros: 0,
  };

  servicios.forEach((servicio) => {
    const unidad = normalizarUnidadMedida(servicio.tarifa?.unidadMedida);
    const cantidad = Number(servicio.cantidad || 0);

    if (!Number.isFinite(cantidad)) return;

    resumen[unidad] += cantidad;
  });

  return resumen;
}

export async function GET(req: Request) {
  // 🔒 SOLO ADMIN / SUPERADMIN
  const { denied } = await requireRoles(["superadmin", "admin"]);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(req.url);

    // Por defecto el dashboard carga solo el mes actual.
    // Si el admin quiere revisar más, usa fechaInicio / fechaFin.
    const fechaInicio = searchParams.get("fechaInicio") || primerDiaMesInput();
    const fechaFin = searchParams.get("fechaFin") || fechaInputHoy();

    const { inicio } = rangoDiaColombia(fechaInicio);
    const { fin } = rangoDiaColombia(fechaFin);

    const whereServicios = {
      createdAt: {
        gte: inicio,
        lte: fin,
      },
    };

    const [totalClientes, totalVehiculos, servicios] = await Promise.all([
      prisma.cliente.count(),
      prisma.vehiculo.count(),
      prisma.servicio.findMany({
        where: whereServicios,
        include: {
          cliente: true,
          vehiculo: true,
          centroOperacion: true,
          seccion: true,
          tarifa: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

    const hoyColombia = fechaInputHoy();
    const { inicio: inicioHoy, fin: finHoy } = rangoDiaColombia(hoyColombia);

    const serviciosHoy = servicios.filter((s) => {
      const fechaServicio = new Date(s.createdAt);
      return fechaServicio >= inicioHoy && fechaServicio <= finHoy;
    });

    const totalServicios = servicios.length;

    const totalRecaudado = servicios.reduce(
      (acc, s) => acc + valorRealServicio(s),
      0
    );

    const totalRecaudadoHoy = serviciosHoy.reduce(
      (acc, s) => acc + valorRealServicio(s),
      0
    );

    const cantidadesPorUnidad = sumarCantidadPorUnidad(servicios);
    const cantidadesPorUnidadHoy = sumarCantidadPorUnidad(serviciosHoy);

    const toneladas = cantidadesPorUnidad.toneladas;
    const toneladasHoy = cantidadesPorUnidadHoy.toneladas;
    const horasHombre = cantidadesPorUnidad.horasHombre;
    const horasHombreHoy = cantidadesPorUnidadHoy.horasHombre;
    const unidades = cantidadesPorUnidad.unidades;
    const unidadesHoy = cantidadesPorUnidadHoy.unidades;
    const vehiculosPorUnidad = cantidadesPorUnidad.vehiculos;
    const vehiculosPorUnidadHoy = cantidadesPorUnidadHoy.vehiculos;
    const otrasCantidades = cantidadesPorUnidad.otros;
    const otrasCantidadesHoy = cantidadesPorUnidadHoy.otros;

    const placasUnicas = new Set(
      servicios.map((s) => s.vehiculo?.placa).filter(Boolean)
    ).size;

    const placasUnicasHoy = new Set(
      serviciosHoy.map((s) => s.vehiculo?.placa).filter(Boolean)
    ).size;

    const vehiculosDescargados = new Set(
      servicios.map((s) => s.vehiculoId).filter(Boolean)
    ).size;

    const vehiculosDescargadosHoy = new Set(
      serviciosHoy.map((s) => s.vehiculoId).filter(Boolean)
    ).size;

    const carpas = {
      tractoMula: {
        cantidad: servicios.filter(
          (s) => s.tipoCarpa === "Tracto Mula" || s.tipoCarpa === "Media Tracto Mula"
        ).length,
        valor: servicios
          .filter(
            (s) => s.tipoCarpa === "Tracto Mula" || s.tipoCarpa === "Media Tracto Mula"
          )
          .reduce((acc, s) => acc + valorCarpa(s.tipoCarpa), 0),
      },
      dobleTroque: {
        cantidad: servicios.filter(
          (s) => s.tipoCarpa === "Doble Troque" || s.tipoCarpa === "Media Doble Troque"
        ).length,
        valor: servicios
          .filter(
            (s) => s.tipoCarpa === "Doble Troque" || s.tipoCarpa === "Media Doble Troque"
          )
          .reduce((acc, s) => acc + valorCarpa(s.tipoCarpa), 0),
      },
      sencillo: {
        cantidad: servicios.filter(
          (s) => s.tipoCarpa === "Sencillo" || s.tipoCarpa === "Media Sencillo"
        ).length,
        valor: servicios
          .filter(
            (s) => s.tipoCarpa === "Sencillo" || s.tipoCarpa === "Media Sencillo"
          )
          .reduce((acc, s) => acc + valorCarpa(s.tipoCarpa), 0),
      },
    };

    const totalCarpas =
      carpas.tractoMula.cantidad +
      carpas.dobleTroque.cantidad +
      carpas.sencillo.cantidad;

    const valorTotalCarpas =
      carpas.tractoMula.valor +
      carpas.dobleTroque.valor +
      carpas.sencillo.valor;

    const porDiaMap: Record<string, any> = {};

    servicios.forEach((s) => {
      const fecha = fechaColombiaLegible(new Date(s.createdAt));

      if (!porDiaMap[fecha]) {
        porDiaMap[fecha] = {
          fecha,
          total: 0,
          toneladas: 0,
          horasHombre: 0,
          unidades: 0,
          cantidadesVehiculo: 0,
          otros: 0,
          servicios: 0,
          vehiculos: new Set<number>(),
        };
      }

      const unidad = normalizarUnidadMedida(s.tarifa?.unidadMedida);
      const cantidad = Number(s.cantidad || 0);

      porDiaMap[fecha].total += valorRealServicio(s);

      if (Number.isFinite(cantidad)) {
        if (unidad === "toneladas") porDiaMap[fecha].toneladas += cantidad;
        if (unidad === "horasHombre") porDiaMap[fecha].horasHombre += cantidad;
        if (unidad === "unidades") porDiaMap[fecha].unidades += cantidad;
        if (unidad === "vehiculos") porDiaMap[fecha].cantidadesVehiculo += cantidad;
        if (unidad === "otros") porDiaMap[fecha].otros += cantidad;
      }

      porDiaMap[fecha].servicios += 1;

      if (s.vehiculoId) {
        porDiaMap[fecha].vehiculos.add(s.vehiculoId);
      }
    });

    const graficaPorDia = Object.values(porDiaMap).map((d: any) => ({
      fecha: d.fecha,
      total: d.total,
      toneladas: d.toneladas,
      horasHombre: d.horasHombre,
      unidades: d.unidades,
      cantidadesVehiculo: d.cantidadesVehiculo,
      otros: d.otros,
      servicios: d.servicios,
      vehiculos: d.vehiculos.size,
    }));

    return NextResponse.json({
      fechaInicio,
      fechaFin,
      totalClientes,
      totalVehiculos,
      totalServicios,
      totalRecaudado,
      totalRecaudadoHoy,
      serviciosHoy: serviciosHoy.length,
      toneladas,
      toneladasHoy,
      horasHombre,
      horasHombreHoy,
      unidades,
      unidadesHoy,
      vehiculosPorUnidad,
      vehiculosPorUnidadHoy,
      otrasCantidades,
      otrasCantidadesHoy,
      cantidadesPorUnidad,
      cantidadesPorUnidadHoy,
      placasUnicas,
      placasUnicasHoy,
      vehiculosDescargados,
      vehiculosDescargadosHoy,
      totalCarpas,
      valorTotalCarpas,
      carpas,
      graficaPorDia,
    });
  } catch (error) {
    console.error("Error GET /api/dashboard:", error);

    return NextResponse.json(
      { error: "Error al cargar dashboard" },
      { status: 500 }
    );
  }
}