import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/prisma";
import { getUser } from "@/src/lib/auth";
import { registrarAccion } from "@/src/lib/historial";
import {
  limpiarTexto,
  validarCcNit,
  validarEmail,
  validarFormaPago,
  validarTelefono,
} from "@/src/lib/validaciones";

export async function GET() {
  try {
    const clientes = await prisma.cliente.findMany({
      orderBy: { id: "desc" },
    });

    return NextResponse.json(clientes);
  } catch (error) {
    console.error("Error GET /api/clientes:", error);
    return NextResponse.json(
      { error: "Error al obtener clientes" },
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

    const ccNit = limpiarTexto(body.ccNit);
    const nombre = limpiarTexto(body.nombre);
    const correo = limpiarTexto(body.correo);
    const telefono = limpiarTexto(body.telefono);
    const formaPago = limpiarTexto(body.formaPago);

    if (!ccNit || !nombre || !correo || !telefono || !formaPago) {
      return NextResponse.json(
        { error: "Todos los campos son obligatorios" },
        { status: 400 }
      );
    }

    if (!validarCcNit(ccNit)) {
      return NextResponse.json({ error: "CC/NIT inválido" }, { status: 400 });
    }

    if (nombre.length < 3) {
      return NextResponse.json({ error: "Nombre muy corto" }, { status: 400 });
    }

    if (!validarEmail(correo)) {
      return NextResponse.json({ error: "Correo inválido" }, { status: 400 });
    }

    if (!validarTelefono(telefono)) {
      return NextResponse.json({ error: "Teléfono inválido" }, { status: 400 });
    }

    if (!validarFormaPago(formaPago)) {
      return NextResponse.json(
        { error: "Forma de pago inválida" },
        { status: 400 }
      );
    }

    const existe = await prisma.cliente.findUnique({
      where: { ccNit },
    });

    if (existe) {
      return NextResponse.json(
        { error: "Ya existe un cliente con ese CC/NIT" },
        { status: 400 }
      );
    }

    const cliente = await prisma.cliente.create({
      data: {
        ccNit,
        nombre,
        correo,
        telefono,
        formaPago,
      },
    });

    await registrarAccion(
      "CREAR",
      "Clientes",
      `Creó el cliente ${nombre} con CC/NIT ${ccNit}`
    );

    return NextResponse.json(cliente, { status: 201 });
  } catch (error) {
    console.error("Error POST /api/clientes:", error);
    return NextResponse.json(
      { error: "Error al guardar cliente" },
      { status: 500 }
    );
  }
}