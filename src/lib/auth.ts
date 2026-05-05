import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from "@/src/lib/prisma";
import {
  parsearPermisos,
  type PermisosUsuario,
  type Rol as RolPermiso,
} from "@/src/lib/permisos";

export type Rol = RolPermiso;

export type AuthUser = {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  permisos: PermisosUsuario;
  exp?: number;
  iat?: number;
};

type TokenUser = {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  exp?: number;
  iat?: number;
};

function rolValido(rol: unknown): rol is Rol {
  return (
    rol === "superadmin" ||
    rol === "admin" ||
    rol === "auxiliar" ||
    rol === "operador"
  );
}

function esTokenValido(value: unknown): value is TokenUser {
  if (!value || typeof value !== "object") return false;

  const user = value as Partial<TokenUser>;

  return (
    typeof user.id === "number" &&
    typeof user.nombre === "string" &&
    typeof user.email === "string" &&
    rolValido(user.rol)
  );
}

export async function getUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) return null;

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    console.error("Falta configurar JWT_SECRET");
    return null;
  }

  try {
    const decoded = jwt.verify(token, secret);

    if (!esTokenValido(decoded)) return null;

    const usuarioDb = await prisma.usuario.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        permisos: true,
      },
    });

    if (!usuarioDb || !rolValido(usuarioDb.rol)) return null;

    return {
      id: usuarioDb.id,
      nombre: usuarioDb.nombre,
      email: usuarioDb.email,
      rol: usuarioDb.rol,
      permisos: parsearPermisos(usuarioDb.permisos, usuarioDb.rol),
      exp: decoded.exp,
      iat: decoded.iat,
    };
  } catch {
    return null;
  }
}
