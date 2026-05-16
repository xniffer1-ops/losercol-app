import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireAdmin } from "@/src/lib/roles";
import { registrarAccion } from "@/src/lib/historial";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

function normalizarId(valor: string) {
  const id = Number(valor);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function leerTexto(valor: unknown) {
  return String(valor || "").trim();
}

export async function PUT(req: Request, { params }: Params) {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  try {
    const { id: idParam } = await params;
    const id = normalizarId(idParam);

    if (!id) {
      return NextResponse.json(
        { error: "ID de tarifa inválido" },
        { status: 400 }
      );
    }

    const body = await req.json();

    const codigo = leerTexto(body.codigo).toUpperCase();
    const descripcion = leerTexto(body.descripcion).toUpperCase();
    const valorUnitario = Number(body.valorUnitario);
    const unidadMedida = leerTexto(body.unidadMedida);
    const presentacion = leerTexto(body.presentacion);
    const categoria = leerTexto(body.categoria);

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

    if (!Number.isFinite(valorUnitario) || valorUnitario <= 0) {
      return NextResponse.json(
        { error: "El valor unitario debe ser mayor que cero" },
        { status: 400 }
      );
    }

    const tarifaActual = await prisma.tarifa.findUnique({
      where: { id },
    });

    if (!tarifaActual) {
      return NextResponse.json(
        { error: "La tarifa no existe" },
        { status: 404 }
      );
    }

    const codigoUsado = await prisma.tarifa.findUnique({
      where: { codigo },
    });

    if (codigoUsado && codigoUsado.id !== id) {
      return NextResponse.json(
        { error: "Ya existe otra tarifa con ese ID" },
        { status: 400 }
      );
    }

    const tarifa = await prisma.tarifa.update({
      where: { id },
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
      "EDITAR",
      "Tarifas",
      `Editó tarifa ${tarifa.codigo} - ${tarifa.descripcion}`
    );

    return NextResponse.json(tarifa);
  } catch (error) {
    console.error("Error PUT /api/tarifas/[id]:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error al actualizar tarifa",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  try {
    const { id: idParam } = await params;
    const id = normalizarId(idParam);

    if (!id) {
      return NextResponse.json(
        { error: "ID de tarifa inválido" },
        { status: 400 }
      );
    }

    const tarifa = await prisma.tarifa.findUnique({
      where: { id },
      include: {
        servicios: {
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!tarifa) {
      return NextResponse.json(
        { error: "La tarifa no existe" },
        { status: 404 }
      );
    }

    if (tarifa.servicios.length > 0) {
      return NextResponse.json(
        {
          error:
            "No se puede eliminar esta tarifa porque ya tiene servicios asociados. Puedes editarla si necesitas corregir nombre, valor o categoría.",
        },
        { status: 400 }
      );
    }

    await prisma.tarifa.delete({
      where: { id },
    });

    await registrarAccion(
      "ELIMINAR",
      "Tarifas",
      `Eliminó tarifa ${tarifa.codigo} - ${tarifa.descripcion}`
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error DELETE /api/tarifas/[id]:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error al eliminar tarifa",
      },
      { status: 500 }
    );
  }
}
