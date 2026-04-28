import { NextResponse } from "next/server";
import { getUser } from "@/src/lib/auth";

type Rol = "admin" | "operador";

export async function requireUser() {
  const user = await getUser();

  if (!user) {
    return {
      user: null,
      denied: NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      ),
    };
  }

  return { user, denied: null };
}

export async function requireAdmin() {
  const user = await getUser();

  if (!user) {
    return {
      user: null,
      denied: NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      ),
    };
  }

  if (user.rol !== "admin") {
    return {
      user,
      denied: NextResponse.json(
        { error: "Solo admin puede hacer esta acción" },
        { status: 403 }
      ),
    };
  }

  return { user, denied: null };
}

export async function requireRoles(rolesPermitidos: Rol[]) {
  const user = await getUser();

  if (!user) {
    return {
      user: null,
      denied: NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      ),
    };
  }

  if (!rolesPermitidos.includes(user.rol)) {
    return {
      user,
      denied: NextResponse.json(
        { error: "No tienes permiso para esta acción" },
        { status: 403 }
      ),
    };
  }

  return { user, denied: null };
}