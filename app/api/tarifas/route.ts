import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/prisma";
import { requireAdmin, requireUser } from "@/src/lib/roles";
import { registrarAccion } from "@/src/lib/historial";

export async function GET() {
  const { denied } = await requireUser();
  if (denied) return denied;

  try {
    const tarifas = await prisma.tarifa.findMany({
      orderBy: { codigo: "asc" },
    });

    return NextResponse.json(tarifas);
  } catch (error) {
    console.error("Error GET /api/tarifas:", error);
    return NextResponse.json(
      { error: "Error al obtener tarifas" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  try {
    const body = await req.json();

    const codigo = String(body.codigo || "").trim().toUpperCase();
    const descripcion = String(body.descripcion || "").trim();
    const valorUnitario = Number(body.valorUnitario);
    const unidadMedida = String(body.unidadMedida || "").trim();
    const presentacion = String(body.presentacion || "").trim();
    const categoria = String(body.categoria || "").trim();

    if (
      !codigo ||
      !descripcion ||
      !valorUnitario ||
      !unidadMedida ||
      !presentacion ||
      !categoria
    ) {
      return NextResponse.json(
        { error: "Todos los campos son obligatorios" },
        { status: 400 }
      );
    }

    const existe = await prisma.tarifa.findUnique({
      where: { codigo },
    });

    if (existe) {
      return NextResponse.json(
        { error: "Ya existe una tarifa con ese ID" },
        { status: 400 }
      );
    }

    const tarifa = await prisma.tarifa.create({
      data: {
        codigo,
        descripcion,
        valorUnitario,
        unidadMedida,
        presentacion,
        categoria,
      },
    });

    await registrarAccion(
      "CREAR",
      "Tarifas",
      `Creó tarifa ${codigo} - ${descripcion}`
    );

    return NextResponse.json(tarifa, { status: 201 });
  } catch (error) {
    console.error("Error POST /api/tarifas:", error);
    
    return NextResponse.json(
  {
    error: error instanceof Error ? error.message : "Error al guardar tarifa",
  },
  { status: 500 }
);
  }
}