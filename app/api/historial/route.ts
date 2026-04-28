import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireAdmin } from "@/src/lib/roles";

export async function GET() {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  try {
    const historial = await prisma.historialAccion.findMany({
      orderBy: { id: "desc" },
      take: 100,
    });

    return NextResponse.json(historial);
  } catch (error) {
    console.error("Error GET /api/historial:", error);

    return NextResponse.json(
      { error: "Error al cargar historial" },
      { status: 500 }
    );
  }
}