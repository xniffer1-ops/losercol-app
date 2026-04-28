import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const SESSION_SECONDS = 60 * 60 * 8; // 8 horas

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "").trim();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contraseña son obligatorios" },
        { status: 400 }
      );
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email },
    });

    if (!usuario) {
      return NextResponse.json(
        { error: "Credenciales incorrectas" },
        { status: 401 }
      );
    }

    const passwordOk = await bcrypt.compare(password, usuario.password);

    if (!passwordOk) {
      return NextResponse.json(
        { error: "Credenciales incorrectas" },
        { status: 401 }
      );
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      return NextResponse.json(
        { error: "Falta JWT_SECRET en .env" },
        { status: 500 }
      );
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
      },
      secret,
      { expiresIn: SESSION_SECONDS }
    );

    const response = NextResponse.json({
      ok: true,
      nombre: usuario.nombre,
      rol: usuario.rol,
    });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_SECONDS,
    });

    return response;
  } catch (error) {
    console.error("Error login:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Error al iniciar sesión",
      },
      { status: 500 }
    );
  }
}