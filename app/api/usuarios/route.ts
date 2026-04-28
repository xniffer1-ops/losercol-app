import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/prisma";
import bcrypt from "bcryptjs";
import { requireRoles } from "@/src/lib/roles";
import { registrarAccion } from "@/src/lib/historial";
import {
  limpiarTexto,
  validarEmail,
  validarRol,
} from "@/src/lib/validaciones";

export async function GET() {
  const { denied } = await requireRoles(["admin"]);
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

    return NextResponse.json(usuarios);
  } catch (error) {
    console.error("Error GET /api/usuarios:", error);
    return NextResponse.json(
      { error: "Error al obtener usuarios" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const { denied } = await requireRoles(["admin"]);
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

    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener mínimo 6 caracteres" },
        { status: 400 }
      );
    }

    if (!validarRol(rol)) {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
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