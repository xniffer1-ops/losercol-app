import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export type Rol = "superadmin" | "admin" | "operador";

export type AuthUser = {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  exp?: number;
  iat?: number;
};

function rolValido(rol: unknown): rol is Rol {
  return rol === "superadmin" || rol === "admin" || rol === "operador";
}

function esUsuarioValido(value: unknown): value is AuthUser {
  if (!value || typeof value !== "object") return false;

  const user = value as Partial<AuthUser>;

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

    if (!esUsuarioValido(decoded)) return null;

    return decoded;
  } catch {
    return null;
  }
}
