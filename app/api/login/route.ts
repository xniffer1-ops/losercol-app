import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const SESSION_SECONDS = 60 * 60 * 8; // 8 horas
const ROLES_PERMITIDOS = ["superadmin", "admin", "operador"] as const;

type RolPermitido = (typeof ROLES_PERMITIDOS)[number];

const isRolPermitido = (rol: string): rol is RolPermitido => {
  return ROLES_PERMITIDOS.includes(rol as RolPermitido);
};

const crearRespuestaSinCache = (body: unknown, init?: ResponseInit) => {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
};

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return crearRespuestaSinCache(
        { error: "Solicitud inválida" },
        { status: 400 }
      );
    }

    const rawBody = body as Record<string, unknown>;
    const email = String(rawBody.email || "").trim().toLowerCase();
    const password = typeof rawBody.password === "string" ? rawBody.password : "";

    if (!email || !password) {
      return crearRespuestaSinCache(
        { error: "Email y contraseña son obligatorios" },
        { status: 400 }
      );
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email },
      select: {
        id: true,
        nombre: true,
        email: true,
        password: true,
        rol: true,
      },
    });

    if (!usuario) {
      return crearRespuestaSinCache(
        { error: "Credenciales incorrectas" },
        { status: 401 }
      );
    }

    const passwordOk = await bcrypt.compare(password, usuario.password);

    if (!passwordOk) {
      return crearRespuestaSinCache(
        { error: "Credenciales incorrectas" },
        { status: 401 }
      );
    }

    if (!isRolPermitido(usuario.rol)) {
      return crearRespuestaSinCache(
        { error: "Este usuario tiene un rol inválido. Contacta al administrador." },
        { status: 403 }
      );
    }

    const secret = process.env.JWT_SECRET;

    if (!secret || secret.length < 32) {
      console.error("JWT_SECRET no existe o es demasiado corto.");
      return crearRespuestaSinCache(
        { error: "Configuración de seguridad incompleta" },
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

    const response = crearRespuestaSinCache({
      ok: true,
      user: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
      },
      nombre: usuario.nombre,
      rol: usuario.rol,
    });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: SESSION_SECONDS,
    });

    return response;
  } catch (error) {
    console.error("Error login:", error);

    return crearRespuestaSinCache(
      { error: "Error al iniciar sesión" },
      { status: 500 }
    );
  }
}
