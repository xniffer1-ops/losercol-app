import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/prisma";
import { requireRoles } from "@/src/lib/roles";

function valorCarpa(tipo?: string | null) {
  if (tipo === "Tracto Mula") return 46500;
  if (tipo === "Doble Troque") return 23150;
  if (tipo === "Sencillo") return 16950;
  return 0;
}


function fechaInputHoy() {
  return new Date().toISOString().slice(0, 10);
}

function primerDiaMesInput() {
  const hoy = new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10);
}

function valorRealServicio(servicio: {
  subtotal?: number | null;
  totalNeto?: number | null;
}) {
  const totalNeto = Number(servicio.totalNeto || 0);
  const subtotal = Number(servicio.subtotal || 0);

  return totalNeto > 0 ? totalNeto : subtotal;
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

    const inicio = new Date(`${fechaInicio}T00:00:00`);
    const fin = new Date(`${fechaFin}T23:59:59`);

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

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const serviciosHoy = servicios.filter(
      (s) => new Date(s.createdAt) >= hoy
    );

    const totalServicios = servicios.length;

    const totalRecaudado = servicios.reduce(
      (acc, s) => acc + valorRealServicio(s),
      0
    );

    const totalRecaudadoHoy = serviciosHoy.reduce(
      (acc, s) => acc + valorRealServicio(s),
      0
    );

    const toneladas = servicios.reduce(
      (acc, s) => acc + Number(s.cantidad || 0),
      0
    );

    const toneladasHoy = serviciosHoy.reduce(
      (acc, s) => acc + Number(s.cantidad || 0),
      0
    );

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
        cantidad: servicios.filter((s) => s.tipoCarpa === "Tracto Mula").length,
        valor: servicios
          .filter((s) => s.tipoCarpa === "Tracto Mula")
          .reduce((acc, s) => acc + valorCarpa(s.tipoCarpa), 0),
      },
      dobleTroque: {
        cantidad: servicios.filter((s) => s.tipoCarpa === "Doble Troque")
          .length,
        valor: servicios
          .filter((s) => s.tipoCarpa === "Doble Troque")
          .reduce((acc, s) => acc + valorCarpa(s.tipoCarpa), 0),
      },
      sencillo: {
        cantidad: servicios.filter((s) => s.tipoCarpa === "Sencillo").length,
        valor: servicios
          .filter((s) => s.tipoCarpa === "Sencillo")
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
      const fecha = new Date(s.createdAt).toLocaleDateString("es-CO");

      if (!porDiaMap[fecha]) {
        porDiaMap[fecha] = {
          fecha,
          total: 0,
          toneladas: 0,
          servicios: 0,
          vehiculos: new Set<number>(),
        };
      }

      porDiaMap[fecha].total += valorRealServicio(s);
      porDiaMap[fecha].toneladas += Number(s.cantidad || 0);
      porDiaMap[fecha].servicios += 1;

      if (s.vehiculoId) {
        porDiaMap[fecha].vehiculos.add(s.vehiculoId);
      }
    });

    const graficaPorDia = Object.values(porDiaMap).map((d: any) => ({
      fecha: d.fecha,
      total: d.total,
      toneladas: d.toneladas,
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