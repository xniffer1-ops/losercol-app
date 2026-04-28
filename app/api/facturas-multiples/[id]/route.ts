import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireAdmin } from "@/src/lib/roles";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  try {
    const id = Number(params.id);

    const factura = await prisma.facturaMultiple.findUnique({
      where: { id },
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
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Error anulando factura" },
      { status: 500 }
    );
  }
}