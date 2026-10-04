import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requirePermiso } from "@/src/lib/roles";
import { getUser } from "@/src/lib/auth";
import { tienePermiso } from "@/src/lib/permisos";
import { registrarAccion } from "@/src/lib/historial";
import { tienePermisoCentro, idsCentrosConPermiso } from "@/src/lib/permisos-centros";

function valorCarpa(tipoCarpa: string) {
  if (tipoCarpa === "Tracto Mula") return 46500;
  if (tipoCarpa === "Doble Troque") return 23150;
  if (tipoCarpa === "Sencillo") return 16950;
  return 0;
}

export async function GET() {
  const { user, denied } = await requirePermiso("servicios", "ver");
  if (denied || !user) return denied ?? NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const ids = idsCentrosConPermiso(user, "ver");
  const soportes = await prisma.soporte.findMany({
    where: ids ? { centroOperacionId: { in: ids } } : undefined,
    include: {
      cliente: true,
      vehiculo: true,
      centroOperacion: true,
      seccion: true,
      servicios: {
        include: {
          tarifa: true,
        },
      },
    },
    orderBy: { id: "desc" },
  });

  return NextResponse.json(soportes);
}

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const permitido =
    user.rol === "superadmin" ||
    tienePermiso(user.permisos, "servicios", "crear") ||
    tienePermiso(user.permisos, "servicioRapido", "crear");

  if (!permitido) {
    return NextResponse.json({ error: "No tienes permiso para crear soportes" }, { status: 403 });
  }

  try {
    const body = await req.json();

    const clienteId = Number(body.clienteId);
    const vehiculoId = Number(body.vehiculoId);
    const centroOperacionId = Number(body.centroOperacionId);
    const seccionId = Number(body.seccionId);
    const servicios = Array.isArray(body.servicios) ? body.servicios : [];

    if (!tienePermisoCentro(user, centroOperacionId, "crear")) {
      return NextResponse.json({ error: "No tienes permiso para crear soportes en este centro" }, { status: 403 });
    }

    if (!clienteId || !vehiculoId || !centroOperacionId || !seccionId) {
      return NextResponse.json(
        { error: "Faltan datos principales del soporte" },
        { status: 400 }
      );
    }

    if (servicios.length === 0) {
      return NextResponse.json(
        { error: "Debes adicionar al menos un servicio" },
        { status: 400 }
      );
    }

    const ultimo = await prisma.soporte.findFirst({
      orderBy: { id: "desc" },
    });

    const siguienteNumero = (ultimo?.id || 0) + 1;
    const numeroSoporte = `SP-${String(siguienteNumero).padStart(6, "0")}`;

    const soporte = await prisma.soporte.create({
      data: {
        numero: numeroSoporte,
        clienteId,
        vehiculoId,
        centroOperacionId,
        seccionId,
      },
    });

    for (const item of servicios) {
      const tarifaId = Number(item.tarifaId);
      const cantidad = Number(item.cantidad);
      const tipoCarpa = String(item.tipoCarpa || "").trim();

      if (!tarifaId || !cantidad) continue;

      const tarifa = await prisma.tarifa.findUnique({
        where: { id: tarifaId },
      });

      if (!tarifa) continue;

      if (
        tarifa.centroOperacionId &&
        tarifa.centroOperacionId !== centroOperacionId
      ) {
        continue;
      }

      if (!tienePermisoCentro(user, centroOperacionId, "crear")) {
        return NextResponse.json(
          { error: "No tienes permiso para usar servicios de este centro" },
          { status: 403 }
        );
      }

      const valorServicio = Number(tarifa.valorUnitario) * cantidad;
      const valorAdicionalCarpa = valorCarpa(tipoCarpa);
      const subtotal = valorServicio + valorAdicionalCarpa;

      await prisma.servicio.create({
        data: {
          numeroSoporte,
          descripcion: tarifa.descripcion,
          valorUnitario: tarifa.valorUnitario,
          tipoCarpa: tipoCarpa || null,
          unidadMedida: tarifa.unidadMedida,
          presentacion: tarifa.presentacion,
          categoria: tarifa.categoria,
          cantidad,
          subtotal,
          clienteId,
          vehiculoId,
          centroOperacionId,
          tarifaId,
          seccionId,
          soporteId: soporte.id,
        },
      });
    }

    await registrarAccion(
      "CREAR",
      "Soportes",
      `Creó soporte múltiple ${numeroSoporte}`
    );

    const soporteCompleto = await prisma.soporte.findUnique({
      where: { id: soporte.id },
      include: {
        cliente: true,
        vehiculo: true,
        centroOperacion: true,
        seccion: true,
        servicios: {
          include: {
            tarifa: true,
          },
        },
      },
    });

    return NextResponse.json(soporteCompleto, { status: 201 });
  } catch (error) {
    console.error("Error POST /api/soportes:", error);
    return NextResponse.json(
      { error: "Error al guardar soporte" },
      { status: 500 }
    );
  }
}