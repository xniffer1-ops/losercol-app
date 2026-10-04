import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/prisma";
import { requirePermiso } from "@/src/lib/roles";
import { getUser } from "@/src/lib/auth";
import { tienePermiso } from "@/src/lib/permisos";
import { registrarAccion } from "@/src/lib/historial";
import { idsCentrosConPermiso } from "@/src/lib/permisos-centros";


async function requireLecturaCentro() {
  const user = await getUser();
  if (!user) return { user: null, denied: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
  if (user.rol === "superadmin" || tienePermiso(user.permisos, "centros", "ver") || tienePermiso(user.permisos, "servicioRapido", "ver")) {
    return { user, denied: null };
  }
  return { user, denied: NextResponse.json({ error: "No tienes permiso para esta acción" }, { status: 403 }) };
}

export async function GET() {
  const { user, denied } = await requireLecturaCentro();
  if (denied || !user) return denied ?? NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const ids = idsCentrosConPermiso(user, "ver");
    const centros = await prisma.centroOperacion.findMany({
      where: ids ? { id: { in: ids } } : undefined,
      orderBy: { id: "desc" },
    });

    return NextResponse.json(centros);
  } catch (error) {
    console.error("Error GET /api/centros:", error);
    return NextResponse.json(
      { error: "Error al obtener centros" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const { denied } = await requirePermiso("centros", "crear");
  if (denied) return denied;

  try {
    const body = await req.json();

    const nombre = String(body.nombre || "").trim();
    const ciudad = String(body.ciudad || "").trim();

    if (!nombre || !ciudad) {
      return NextResponse.json(
        { error: "Todos los campos son obligatorios" },
        { status: 400 }
      );
    }

    const existe = await prisma.centroOperacion.findUnique({
      where: { nombre },
    });

    if (existe) {
      return NextResponse.json(
        { error: "Ya existe un centro con ese nombre" },
        { status: 400 }
      );
    }

    const centro = await prisma.centroOperacion.create({
      data: {
        nombre,
        ciudad,
      },
    });

    await registrarAccion(
      "CREAR",
      "Centros",
      `Creó el centro de operación ${nombre} en ${ciudad}`
    );

    return NextResponse.json(centro, { status: 201 });
  } catch (error) {
    console.error("Error POST /api/centros:", error);
    return NextResponse.json(
      { error: "Error al guardar centro" },
      { status: 500 }
    );
  }
}