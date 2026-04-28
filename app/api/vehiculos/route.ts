import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireAdmin, requireUser } from "@/src/lib/roles";
import { registrarAccion } from "@/src/lib/historial";
import {
  limpiarPlaca,
  limpiarTexto,
  validarTipoVehiculo,
} from "@/src/lib/validaciones";

// ===============================
// 🔍 GET → LISTAR VEHÍCULOS
// ===============================
export async function GET() {
  const { denied } = await requireUser();
  if (denied) return denied;

  try {
    const vehiculos = await prisma.vehiculo.findMany({
      include: {
        cliente: true,
      },
      orderBy: { id: "desc" },
    });

    return NextResponse.json(vehiculos);
  } catch (error) {
    console.error("Error GET vehiculos:", error);
    return NextResponse.json(
      { error: "Error al obtener vehículos" },
      { status: 500 }
    );
  }
}

// ===============================
// ➕ POST → CREAR VEHÍCULO
// ===============================
export async function POST(req: Request) {
  const { denied, usuario } = await requireUser();
  if (denied) return denied;

  try {
    const body = await req.json();

    const placa = limpiarPlaca(body.placa);
    const tipoVehiculo = limpiarTexto(body.tipoVehiculo);
    const clienteId = Number(body.clienteId);

    if (!placa || !tipoVehiculo || !clienteId) {
      return NextResponse.json(
        { error: "Todos los campos son obligatorios" },
        { status: 400 }
      );
    }

    if (!validarTipoVehiculo(tipoVehiculo)) {
      return NextResponse.json(
        { error: "Tipo de vehículo inválido" },
        { status: 400 }
      );
    }

    const existente = await prisma.vehiculo.findUnique({
      where: { placa },
    });

    if (existente) {
      return NextResponse.json(
        { error: "La placa ya existe" },
        { status: 400 }
      );
    }

    const vehiculo = await prisma.vehiculo.create({
      data: {
        placa,
        tipoVehiculo,
        clienteId,
      },
    });

    await registrarAccion(
      "CREAR",
      "Vehículos",
      `Creó el vehículo ${placa} para el cliente ID ${clienteId}`,
      usuario?.email || "sistema",
      usuario?.rol || "operador"
    );

    return NextResponse.json(vehiculo);
  } catch (error) {
    console.error("Error POST vehiculos:", error);
    return NextResponse.json(
      { error: "Error al crear vehículo" },
      { status: 500 }
    );
  }
}