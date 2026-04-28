import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/prisma";
import { requireAdmin } from "@/src/lib/roles";
import { registrarAccion } from "@/src/lib/historial";

export async function GET() {
  try {
    const centros = await prisma.centroOperacion.findMany({
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
  const { denied } = await requireAdmin();
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