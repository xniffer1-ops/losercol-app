import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/prisma";
import { requireAdmin, requireUser } from "@/src/lib/roles";
import { registrarAccion } from "@/src/lib/historial";

const TIPOS_USO = ["terceros", "interno", "ambos"] as const;
type TipoUso = (typeof TIPOS_USO)[number];

function normalizarBoolean(valor: unknown, defecto = true) {
  if (valor === undefined || valor === null || valor === "") return defecto;
  return valor === true || valor === "true" || valor === "si" || valor === "sí";
}

function normalizarTipoUso(valor: unknown): TipoUso {
  const tipo = String(valor || "terceros")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (tipo === "interno" || tipo === "movimiento" || tipo === "movimiento interno") {
    return "interno";
  }

  if (tipo === "ambos" || tipo === "general") {
    return "ambos";
  }

  return "terceros";
}

function normalizarId(valor: unknown) {
  const id = Number(valor);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export async function GET(req: Request) {
  const { denied } = await requireUser();
  if (denied) return denied;

  try {
    const { searchParams } = new URL(req.url);
    const centroOperacionId = normalizarId(searchParams.get("centroOperacionId"));
    const tipoUsoParam = searchParams.get("tipoUso");
    const tipoUso = tipoUsoParam ? normalizarTipoUso(tipoUsoParam) : null;

    const where: any = {};

    if (centroOperacionId) {
      where.centroOperacionId = centroOperacionId;
    }

    if (tipoUso) {
      where.OR = [{ tipoUso }, { tipoUso: "ambos" }];
    }

    const tarifas = await prisma.tarifa.findMany({
      where,
      include: {
        centroOperacion: true,
      },
      orderBy: [{ centroOperacionId: "asc" }, { codigo: "asc" }],
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
    const descripcion = String(body.descripcion || "").trim().toUpperCase();
    const valorUnitario = Number(body.valorUnitario);
    const unidadMedida = String(body.unidadMedida || "").trim();
    const presentacion = String(body.presentacion || "").trim();
    const categoria = String(body.categoria || "").trim();
    const centroOperacionId = normalizarId(body.centroOperacionId);
    const tipoUso = normalizarTipoUso(body.tipoUso);
    const cuentaTonelajeOperativo = normalizarBoolean(
      body.cuentaTonelajeOperativo,
      true
    );

    if (
      !codigo ||
      !descripcion ||
      !valorUnitario ||
      !unidadMedida ||
      !presentacion ||
      !categoria ||
      !centroOperacionId
    ) {
      return NextResponse.json(
        { error: "Todos los campos son obligatorios, incluido el centro" },
        { status: 400 }
      );
    }

    const centro = await prisma.centroOperacion.findUnique({
      where: { id: centroOperacionId },
    });

    if (!centro) {
      return NextResponse.json(
        { error: "Centro de operación no encontrado" },
        { status: 404 }
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
        centroOperacionId,
        tipoUso,
        cuentaTonelajeOperativo,
      },
      include: { centroOperacion: true },
    });

    await registrarAccion(
      "CREAR",
      "Tarifas",
      `Creó tarifa ${codigo} - ${descripcion} - Centro: ${centro.nombre} - Uso: ${tipoUso} - Tonelaje real: ${
        tarifa.cuentaTonelajeOperativo ? "Sí" : "No"
      }`
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
