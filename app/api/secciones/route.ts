import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requirePermiso } from "@/src/lib/roles";
import { getUser } from "@/src/lib/auth";
import { tienePermiso } from "@/src/lib/permisos";
import { registrarAccion } from "@/src/lib/historial";


async function requireLecturaSeccion() {
  const user = await getUser();
  if (!user) return { denied: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
  if (user.rol === "superadmin" || tienePermiso(user.permisos, "secciones", "ver") || tienePermiso(user.permisos, "servicioRapido", "ver")) {
    return { denied: null };
  }
  return { denied: NextResponse.json({ error: "No tienes permiso para esta acción" }, { status: 403 }) };
}

export async function GET() {
  const { denied } = await requireLecturaSeccion();
  if (denied) return denied;

  try {
    const secciones = await prisma.seccion.findMany({
      orderBy: { nombre: "asc" },
    });

    return NextResponse.json(secciones);
  } catch (error) {
    console.error("Error GET /api/secciones:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Error al obtener secciones",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const { denied } = await requirePermiso("secciones", "crear");
  if (denied) return denied;

  try {
    const body = await req.json();
    const nombre = String(body.nombre || "").trim();

    if (!nombre) {
      return NextResponse.json(
        { error: "Nombre obligatorio" },
        { status: 400 }
      );
    }

    const existe = await prisma.seccion.findUnique({
      where: { nombre },
    });

    if (existe) {
      return NextResponse.json(
        { error: "La sección ya existe" },
        { status: 400 }
      );
    }

    const seccion = await prisma.seccion.create({
      data: { nombre },
    });

    await registrarAccion("CREAR", "Secciones", `Creó la sección ${nombre}`);

    return NextResponse.json(seccion, { status: 201 });
  } catch (error) {
    console.error("Error POST /api/secciones:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Error al guardar sección",
      },
      { status: 500 }
    );
  }
}