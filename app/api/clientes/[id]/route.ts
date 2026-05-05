import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getUser } from "@/src/lib/auth";
import { registrarAccion } from "@/src/lib/historial";
import {
  limpiarTexto,
  validarCcNit,
  validarEmail,
  validarFormaPago,
  validarTelefono,
  normalizarFormaPago,
} from "@/src/lib/validaciones";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

function puedeAdministrarCliente(rol?: string) {
  return rol === "admin" || rol === "superadmin";
}

export async function PUT(req: Request, { params }: Params) {
  const user = await getUser();

  if (!user || !puedeAdministrarCliente(user.rol)) {
    return NextResponse.json(
      { error: "Solo admin o superadmin puede editar clientes" },
      { status: 403 }
    );
  }

  try {
    const { id: rawId } = await params;
    const id = Number(rawId);

    if (!id) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await req.json();

    const ccNit = limpiarTexto(body.ccNit);
    const nombre = limpiarTexto(body.nombre);
    const correo = limpiarTexto(body.correo).toLowerCase();
    const telefono = limpiarTexto(body.telefono);
    const formaPago = normalizarFormaPago(body.formaPago || "efectivo");

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

    const clienteActual = await prisma.cliente.findUnique({
      where: { id },
    });

    if (!clienteActual) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    const otroConMismoDocumento = await prisma.cliente.findUnique({
      where: { ccNit },
    });

    if (otroConMismoDocumento && otroConMismoDocumento.id !== id) {
      return NextResponse.json(
        { error: "Ya existe otro cliente con ese CC/NIT" },
        { status: 400 }
      );
    }

    const cliente = await prisma.cliente.update({
      where: { id },
      data: {
        ccNit,
        nombre,
        correo,
        telefono,
        formaPago,
      },
    });

    await registrarAccion(
      "EDITAR",
      "Clientes",
      `Editó el cliente ${cliente.nombre} con CC/NIT ${cliente.ccNit}`
    );

    return NextResponse.json(cliente);
  } catch (error) {
    console.error("Error PUT /api/clientes/[id]:", error);

    return NextResponse.json(
      { error: "Error al actualizar cliente" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: Params) {
  const user = await getUser();

  if (!user || !puedeAdministrarCliente(user.rol)) {
    return NextResponse.json(
      { error: "Solo admin o superadmin puede eliminar clientes" },
      { status: 403 }
    );
  }

  try {
    const { id: rawId } = await params;
    const id = Number(rawId);

    if (!id) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const cliente = await prisma.cliente.findUnique({
      where: { id },
      include: {
        vehiculos: {
          select: { id: true },
          take: 1,
        },
        servicios: {
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!cliente) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    if (cliente.vehiculos.length > 0 || cliente.servicios.length > 0) {
      return NextResponse.json(
        {
          error:
            "Este cliente ya tiene vehículos o servicios asociados. No se puede eliminar para proteger el historial. Puedes editar sus datos.",
        },
        { status: 400 }
      );
    }

    await prisma.cliente.delete({
      where: { id },
    });

    await registrarAccion(
      "ELIMINAR",
      "Clientes",
      `Eliminó el cliente ${cliente.nombre} con CC/NIT ${cliente.ccNit}`
    );

    return NextResponse.json({
      ok: true,
      mensaje: "Cliente eliminado correctamente",
    });
  } catch (error) {
    console.error("Error DELETE /api/clientes/[id]:", error);

    return NextResponse.json(
      { error: "Error al eliminar cliente" },
      { status: 500 }
    );
  }
}
