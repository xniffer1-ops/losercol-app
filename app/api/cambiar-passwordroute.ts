import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getUser } from "@/src/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();

    const actual = String(body.actual || "");
    const nueva = String(body.nueva || "");

    if (!actual || !nueva) {
      return NextResponse.json(
        { error: "Completa todos los campos" },
        { status: 400 }
      );
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: user.id },
    });

    if (!usuario) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    const ok = await bcrypt.compare(actual, usuario.password);

    if (!ok) {
      return NextResponse.json(
        { error: "Contraseña actual incorrecta" },
        { status: 400 }
      );
    }

    const hash = await bcrypt.hash(nueva, 10);

    await prisma.usuario.update({
      where: { id: user.id },
      data: { password: hash },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error al cambiar contraseña" },
      { status: 500 }
    );
  }
}