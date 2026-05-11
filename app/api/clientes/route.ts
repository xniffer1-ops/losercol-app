import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/prisma";
import { registrarAccion } from "@/src/lib/historial";
import { getUser } from "@/src/lib/auth";
import { tienePermiso, type AccionPermiso, type ModuloPermiso } from "@/src/lib/permisos";
import {
  limpiarTexto,
  validarCcNit,
  validarEmail,
  validarFormaPago,
  validarTelefono,
  normalizarFormaPago,
} from "@/src/lib/validaciones";

function correoSeguro(valor: unknown) {
  const correo = limpiarTexto(valor).toLowerCase();
  return correo || "sin-correo@losercol.com";
}

function telefonoSeguro(valor: unknown) {
  const telefono = limpiarTexto(valor);
  return telefono || "3147897436";
}

async function requirePermisoInterno(
  permisosPermitidos: Array<[ModuloPermiso, AccionPermiso]>
) {
  const user = await getUser();

  if (!user) {
    return {
      user: null,
      denied: NextResponse.json({ error: "No autorizado" }, { status: 401 }),
    };
  }

  if (user.rol === "superadmin") {
    return { user, denied: null };
  }

  const permitido = permisosPermitidos.some(([modulo, accion]) =>
    tienePermiso(user.permisos, modulo, accion)
  );

  if (!permitido) {
    return {
      user,
      denied: NextResponse.json(
        { error: "No tienes permiso para esta acción" },
        { status: 403 }
      ),
    };
  }

  return { user, denied: null };
}

export async function GET() {
  const { denied } = await requirePermisoInterno([
    ["clientes", "ver"],
    ["servicioRapido", "ver"],
  ]);
  if (denied) return denied;

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
  const { denied } = await requirePermisoInterno([
    ["clientes", "crear"],
    ["servicioRapido", "crear"],
  ]);
  if (denied) return denied;

  try {
    const body = await req.json();

    const ccNit = limpiarTexto(body.ccNit);
    const nombre = limpiarTexto(body.nombre);
    const correo = correoSeguro(body.correo);
    const telefono = telefonoSeguro(body.telefono);
    const formaPago = normalizarFormaPago(body.formaPago || "no_aplica");

    if (!ccNit || !nombre || !correo || !telefono) {
      return NextResponse.json(
        { error: "CC/NIT, nombre, correo y teléfono son obligatorios" },
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
