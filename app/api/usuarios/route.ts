import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/prisma";
import bcrypt from "bcryptjs";
import { requireRoles } from "@/src/lib/roles";
import { registrarAccion } from "@/src/lib/historial";
import { limpiarTexto, validarEmail } from "@/src/lib/validaciones";

type RolUsuario = "superadmin" | "admin" | "operador";

function validarRolUsuario(rol: string): rol is RolUsuario {
  return rol === "superadmin" || rol === "admin" || rol === "operador";
}

function puedeVerUsuario(rolActual: string, rolUsuario: string) {
  if (rolActual === "superadmin") return true;
  if (rolActual === "admin" && rolUsuario !== "superadmin") return true;
  return false;
}

function puedeGestionarUsuario(rolActual: string, rolObjetivo: string) {
  if (rolActual === "superadmin") return true;
  if (rolActual === "admin" && rolObjetivo !== "superadmin") return true;
  return false;
}

async function contarAdminsDisponibles() {
  return prisma.usuario.count({
    where: {
      rol: {
        in: ["superadmin", "admin"],
      },
    },
  });
}

export async function GET() {
  const { user, denied } = await requireRoles(["superadmin", "admin"]);
  if (denied) return denied;

  try {
    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        createdAt: true,
      },
      orderBy: { id: "desc" },
    });

    const usuariosPermitidos = usuarios.filter((usuario) =>
      puedeVerUsuario(user.rol, usuario.rol)
    );

    return NextResponse.json(usuariosPermitidos);
  } catch (error) {
    console.error("Error GET /api/usuarios:", error);
    return NextResponse.json(
      { error: "Error al obtener usuarios" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const { user, denied } = await requireRoles(["superadmin", "admin"]);
  if (denied) return denied;

  try {
    const body = await req.json();

    const nombre = limpiarTexto(body.nombre);
    const email = limpiarTexto(body.email).toLowerCase();
    const password = limpiarTexto(body.password);
    const rol = limpiarTexto(body.rol);

    if (!nombre || !email || !password || !rol) {
      return NextResponse.json(
        { error: "Todos los campos son obligatorios" },
        { status: 400 }
      );
    }

    if (nombre.length < 3) {
      return NextResponse.json({ error: "Nombre muy corto" }, { status: 400 });
    }

    if (!validarEmail(email)) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "La contraseña debe tener mínimo 8 caracteres" },
        { status: 400 }
      );
    }

    if (!validarRolUsuario(rol)) {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
    }

    if (rol === "superadmin" && user.rol !== "superadmin") {
      return NextResponse.json(
        { error: "Solo superadmin puede crear otro superadmin" },
        { status: 403 }
      );
    }

    const existe = await prisma.usuario.findUnique({
      where: { email },
    });

    if (existe) {
      return NextResponse.json(
        { error: "El correo ya está registrado" },
        { status: 400 }
      );
    }

    const hash = await bcrypt.hash(password, 10);

    const usuario = await prisma.usuario.create({
      data: {
        nombre,
        email,
        password: hash,
        rol,
      },
    });

    await registrarAccion(
      "CREAR",
      "Usuarios",
      `Creó el usuario ${email} con rol ${rol}`
    );

    return NextResponse.json(
      {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        createdAt: usuario.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error POST /api/usuarios:", error);
    return NextResponse.json(
      { error: "Error al crear usuario" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  const { user, denied } = await requireRoles(["superadmin", "admin"]);
  if (denied) return denied;

  try {
    const body = await req.json();

    const id = Number(body.id);
    const password = limpiarTexto(body.password);
    const rol = limpiarTexto(body.rol);

    if (!id) {
      return NextResponse.json(
        { error: "ID de usuario obligatorio" },
        { status: 400 }
      );
    }

    const usuarioObjetivo = await prisma.usuario.findUnique({
      where: { id },
    });

    if (!usuarioObjetivo) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    if (!puedeGestionarUsuario(user.rol, usuarioObjetivo.rol)) {
      return NextResponse.json(
        { error: "No puedes modificar este usuario" },
        { status: 403 }
      );
    }

    const data: {
      password?: string;
      rol?: string;
    } = {};

    if (password) {
      if (password.length < 8) {
        return NextResponse.json(
          { error: "La contraseña debe tener mínimo 8 caracteres" },
          { status: 400 }
        );
      }

      data.password = await bcrypt.hash(password, 10);
    }

    if (rol) {
      if (!validarRolUsuario(rol)) {
        return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
      }

      if (rol === "superadmin" && user.rol !== "superadmin") {
        return NextResponse.json(
          { error: "Solo superadmin puede asignar rol superadmin" },
          { status: 403 }
        );
      }

      if (
        usuarioObjetivo.rol !== "operador" &&
        rol === "operador" &&
        (await contarAdminsDisponibles()) <= 1
      ) {
        return NextResponse.json(
          { error: "No puedes dejar el sistema sin administrador" },
          { status: 400 }
        );
      }

      data.rol = rol;
    }

    if (!data.password && !data.rol) {
      return NextResponse.json(
        { error: "No hay cambios para guardar" },
        { status: 400 }
      );
    }

    const usuarioActualizado = await prisma.usuario.update({
      where: { id },
      data,
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        createdAt: true,
      },
    });

    await registrarAccion(
      "ACTUALIZAR",
      "Usuarios",
      `Actualizó usuario ${usuarioObjetivo.email}${
        data.password ? " - cambió contraseña" : ""
      }${data.rol ? ` - cambió rol a ${data.rol}` : ""}`
    );

    return NextResponse.json(usuarioActualizado);
  } catch (error) {
    console.error("Error PUT /api/usuarios:", error);
    return NextResponse.json(
      { error: "Error al actualizar usuario" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const { user, denied } = await requireRoles(["superadmin", "admin"]);
  if (denied) return denied;

  try {
    const body = await req.json();
    const id = Number(body.id);

    if (!id) {
      return NextResponse.json(
        { error: "ID de usuario obligatorio" },
        { status: 400 }
      );
    }

    if (id === user.id) {
      return NextResponse.json(
        { error: "No puedes eliminar tu propio usuario" },
        { status: 400 }
      );
    }

    const usuarioObjetivo = await prisma.usuario.findUnique({
      where: { id },
    });

    if (!usuarioObjetivo) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    if (!puedeGestionarUsuario(user.rol, usuarioObjetivo.rol)) {
      return NextResponse.json(
        { error: "No puedes eliminar este usuario" },
        { status: 403 }
      );
    }

    if (
      usuarioObjetivo.rol !== "operador" &&
      (await contarAdminsDisponibles()) <= 1
    ) {
      return NextResponse.json(
        { error: "No puedes eliminar el último administrador del sistema" },
        { status: 400 }
      );
    }

    await prisma.usuario.delete({
      where: { id },
    });

    await registrarAccion(
      "ELIMINAR",
      "Usuarios",
      `Eliminó el usuario ${usuarioObjetivo.email} con rol ${usuarioObjetivo.rol}`
    );

    return NextResponse.json({
      ok: true,
      mensaje: "Usuario eliminado correctamente",
    });
  } catch (error) {
    console.error("Error DELETE /api/usuarios:", error);
    return NextResponse.json(
      { error: "Error al eliminar usuario" },
      { status: 500 }
    );
  }
}