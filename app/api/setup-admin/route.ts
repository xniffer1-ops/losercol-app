import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const email = "admin@losercol.com";
    const passwordPlano = "123456";

    // Verificar si ya existe
    const existe = await prisma.usuario.findUnique({
      where: { email },
    });

    if (existe) {
      return NextResponse.json({ message: "El admin ya existe" });
    }

    // Encriptar contraseña
    const password = await bcrypt.hash(passwordPlano, 10);

    // Crear usuario
    const usuario = await prisma.usuario.create({
      data: {
        nombre: "Administrador",
        email,
        password,
        rol: "ADMIN",
      },
    });

    return NextResponse.json({
      message: "Admin creado correctamente",
      usuario,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error creando admin" }, { status: 500 });
  }
}