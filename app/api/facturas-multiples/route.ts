import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireAdmin } from "@/src/lib/roles";
import { getUser } from "@/src/lib/auth";

export async function GET() {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  try {
    const facturas = await prisma.facturaMultiple.findMany({
      include: {
        items: true,
      },
      orderBy: {
        id: "desc",
      },
    });

    return NextResponse.json(facturas);
  } catch (error) {
    console.error("Error GET /api/facturas-multiples:", error);

    return NextResponse.json(
      { error: "Error al obtener facturas múltiples" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  try {
    const user = await getUser();
    const body = await req.json();

    const ids: number[] = Array.isArray(body.ids)
      ? body.ids.map((id: unknown) => Number(id)).filter(Boolean)
      : [];

    if (ids.length === 0) {
      return NextResponse.json(
        { error: "No hay servicios seleccionados" },
        { status: 400 }
      );
    }

    const servicios = await prisma.servicio.findMany({
      where: {
        id: { in: ids },
      },
      include: {
        cliente: true,
        vehiculo: true,
        centroOperacion: true,
        tarifa: true,
        seccion: true,
      },
    });

    if (servicios.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron servicios" },
        { status: 404 }
      );
    }

    const yaFacturados = servicios.filter((s) => s.facturado);

    if (yaFacturados.length > 0) {
      return NextResponse.json(
        {
          error: "Algunos servicios ya fueron facturados y no pueden repetirse",
        },
        { status: 400 }
      );
    }

    const ultimaFactura = await prisma.facturaMultiple.findFirst({
      orderBy: { id: "desc" },
    });

    const siguienteNumero = (ultimaFactura?.id || 0) + 1;
    const numero = `FM-${String(siguienteNumero).padStart(6, "0")}`;

    const total = servicios.reduce(
      (acc, s) => acc + Number(s.subtotal || 0),
      0
    );

    const factura = await prisma.facturaMultiple.create({
      data: {
        numero,
        cliente: servicios[0].cliente?.nombre || "Sin cliente",
        total,
        usuario: user?.email || user?.nombre || "sin usuario",
        items: {
          create: servicios.map((s) => ({
            servicioId: s.id,
            soporte: s.numeroSoporte || `SP-${String(s.id).padStart(6, "0")}`,
            descripcion: `${s.descripcion}${
              s.tipoCarpa ? ` + Carpa ${s.tipoCarpa}` : ""
            }`,
            subtotal: s.subtotal,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    await prisma.servicio.updateMany({
      where: {
        id: { in: ids },
      },
      data: {
        facturado: true,
      },
    });

    return NextResponse.json(factura, { status: 201 });
  } catch (error) {
    console.error("Error POST /api/facturas-multiples:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error al guardar factura múltiple",
      },
      { status: 500 }
    );
  }
}