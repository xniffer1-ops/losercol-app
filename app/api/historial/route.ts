import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireAdmin } from "@/src/lib/roles";

const EMAIL_OCULTO = "soporte@losercol.com";

function debeOcultarse(usuario: string) {
  return String(usuario || "").trim().toLowerCase() === EMAIL_OCULTO;
}

export async function GET() {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  try {
    const historial = await prisma.historialAccion.findMany({
      orderBy: { id: "desc" },
      take: 250,
    });

    return NextResponse.json(
      historial.filter((item) => !debeOcultarse(item.usuario)).slice(0, 100)
    );
  } catch (error) {
    console.error("Error GET /api/historial:", error);

    return NextResponse.json(
      { error: "Error al cargar historial" },
      { status: 500 }
    );
  }
}
