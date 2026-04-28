import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireAdmin } from "@/src/lib/roles";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(req: Request, { params }: Params) {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await params;
    const facturaId = Number(id);

    if (!facturaId) {
      return NextResponse.json(
        { error: "ID de factura inválido" },
        { status: 400 }
      );
    }

    const factura = await prisma.facturaMultiple.findUnique({
      where: { id: facturaId },
      include: { items: true },
    });

    if (!factura) {
      return NextResponse.json(
        { error: "Factura no encontrada" },
        { status: 404 }
      );
    }

    const serviciosIds = factura.items.map((i) => i.servicioId);

    await prisma.servicio.updateMany({
      where: {
        id: { in: serviciosIds },
      },
      data: {
        facturado: false,
      },
    });

    await prisma.facturaMultiple.delete({
      where: { id: facturaId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error DELETE /api/facturas-multiples/[id]:", error);

    return NextResponse.json(
      { error: "Error anulando factura" },
      { status: 500 }
    );
  }
}