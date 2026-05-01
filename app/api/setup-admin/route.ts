import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/src/lib/prisma";

export async function GET() {
  try {
    const email = "admin@losercol.com";
    const passwordPlano = "123456";

    const existe = await prisma.usuario.findUnique({
      where: { email },
    });

    if (existe) {
      const password = await bcrypt.hash(passwordPlano, 10);

      const usuarioActualizado = await prisma.usuario.update({
        where: { email },
        data: {
          nombre: "Administrador",
          password,
          rol: "admin",
        },
      });

      return NextResponse.json({
        ok: true,
        mensaje: "Admin actualizado correctamente",
        usuario: {
          id: usuarioActualizado.id,
          email: usuarioActualizado.email,
          rol: usuarioActualizado.rol,
        },
      });
    }

    const password = await bcrypt.hash(passwordPlano, 10);

    const usuario = await prisma.usuario.create({
      data: {
        nombre: "Administrador",
        email,
        password,
        rol: "admin",
      },
    });

    return NextResponse.json({
      ok: true,
      mensaje: "Admin creado correctamente",
      usuario: {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol,
      },
    });
  } catch (error) {
    console.error("Error creando admin:", error);

    return NextResponse.json(
      { error: "Error creando admin" },
      { status: 500 }
    );
  }
}