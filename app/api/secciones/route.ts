import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireAdmin, requireUser } from "@/src/lib/roles";
import { registrarAccion } from "@/src/lib/historial";

export async function GET() {
  const { denied } = await requireUser();
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
  const { denied } = await requireAdmin();
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