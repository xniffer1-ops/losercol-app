import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/prisma";
import { getUser } from "@/src/lib/auth";
import { registrarAccion } from "@/src/lib/historial";
import {
  limpiarPlaca,
  limpiarTexto,
  validarTipoVehiculo,
} from "@/src/lib/validaciones";

export async function GET() {
  try {
    const vehiculos = await prisma.vehiculo.findMany({
      include: {
        cliente: true,
      },
      orderBy: { id: "desc" },
    });

    return NextResponse.json(vehiculos);
  } catch (error) {
    console.error("Error GET /api/vehiculos:", error);
    return NextResponse.json(
      { error: "Error al obtener vehículos" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const user = await getUser();

  if (!user || (user.rol !== "admin" && user.rol !== "operador")) {
    return NextResponse.json(
      { error: "No tienes permiso para hacer esta acción" },
      { status: 403 }
    );
  }

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

    if (placa.length < 5 || placa.length > 10) {
      return NextResponse.json({ error: "Placa inválida" }, { status: 400 });
    }

    if (!validarTipoVehiculo(tipoVehiculo)) {
      return NextResponse.json(
        { error: "Tipo de vehículo inválido" },
        { status: 400 }
      );
    }

    const existeCliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
    });

    if (!existeCliente) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    const existeVehiculo = await prisma.vehiculo.findUnique({
      where: { placa },
    });

    if (existeVehiculo) {
      return NextResponse.json(
        { error: "Ya existe un vehículo con esa placa" },
        { status: 400 }
      );
    }

    const vehiculo = await prisma.vehiculo.create({
      data: {
        placa,
        tipoVehiculo,
        clienteId,
      },
      include: {
        cliente: true,
      },
    });

    await registrarAccion(
      "CREAR",
      "Vehículos",
      `Creó el vehículo ${placa} para el cliente ${vehiculo.cliente?.nombre}`
    );

    return NextResponse.json(vehiculo, { status: 201 });
  } catch (error) {
    console.error("Error POST /api/vehiculos:", error);
    return NextResponse.json(
      { error: "Error al guardar vehículo" },
      { status: 500 }
    );
  }
}