import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/src/lib/prisma";

export async function GET() {
  try {
    const email = "admin@losercol.com";
    const passwordPlano = "123456";

    const existente = await prisma.usuario.findUnique({
      where: { email },
    });

    const password = await bcrypt.hash(passwordPlano, 10);

    if (existente) {
      await prisma.usuario.update({
        where: { email },
        data: {
          password,
          rol: "admin",
        },
      });

      return NextResponse.json({
        ok: true,
        mensaje: "Admin actualizado correctamente",
      });
    }

    await prisma.usuario.create({
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
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error creando admin" },
      { status: 500 }
    );
  }
}