import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

function calcularSinIVA(valor: number) {
  return Math.round(valor / 1.19);
}

function calcularIVA(valor: number) {
  return valor - calcularSinIVA(valor);
}

function valorCarpa(tipo: string | null) {
  if (tipo === "Tracto Mula") return 46500;
  if (tipo === "Doble Troque") return 23150;
  if (tipo === "Sencillo") return 16950;
  return 0;
}

export async function POST(req: Request) {
  try {
    const { ids } = await req.json();

    if (!ids || ids.length === 0) {
      return NextResponse.json({ error: "No hay servicios" }, { status: 400 });
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
      return NextResponse.json({ error: "No encontrados" }, { status: 404 });
    }

    let filas: any[] = [];
    let subtotalSinIVA = 0;
    let totalIVA = 0;

    servicios.forEach((s) => {
      const valorBase = s.valorUnitario * s.cantidad;
      const baseSinIVA = calcularSinIVA(valorBase);
      const ivaBase = calcularIVA(valorBase);

      subtotalSinIVA += baseSinIVA;
      totalIVA += ivaBase;

      // 🔹 SERVICIO PRINCIPAL
      filas.push({
        codigo: s.tarifa?.codigo || "",
        descripcion: s.descripcion,
        unidad: s.unidadMedida || "",
        cantidad: s.cantidad,
        valorUnitario: calcularSinIVA(s.valorUnitario),
        subtotal: baseSinIVA,
        iva: ivaBase,
      });

      // 🔹 CARPA COMO LINEA APARTE
      if (s.tipoCarpa) {
        const valorC = valorCarpa(s.tipoCarpa);
        const baseC = calcularSinIVA(valorC);
        const ivaC = calcularIVA(valorC);

        subtotalSinIVA += baseC;
        totalIVA += ivaC;

        filas.push({
          codigo: "CARPA",
          descripcion: `Carpa ${s.tipoCarpa}`,
          unidad: "Unidad",
          cantidad: 1,
          valorUnitario: baseC,
          subtotal: baseC,
          iva: ivaC,
        });
      }
    });

    const total = subtotalSinIVA + totalIVA;

    return NextResponse.json({
      cliente: servicios[0].cliente,
      vehiculo: servicios[0].vehiculo,
      centro: servicios[0].centroOperacion,
      seccion: servicios[0].seccion,
      fecha: servicios[0].createdAt,
      filas,
      subtotalSinIVA,
      iva: totalIVA,
      total,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error factura" }, { status: 500 });
  }
}