import { NextResponse } from "next/server";
import { getUser, type AuthUser, type Rol } from "@/src/lib/auth";

type GuardResult = {
  user: AuthUser | null;
  denied: NextResponse | null;
};

function deniedJson(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function requireUser(): Promise<GuardResult> {
  const user = await getUser();

  if (!user) {
    return {
      user: null,
      denied: deniedJson("No autorizado", 401),
    };
  }

  return { user, denied: null };
}

export async function requireAdmin(): Promise<GuardResult> {
  const user = await getUser();

  if (!user) {
    return {
      user: null,
      denied: deniedJson("No autorizado", 401),
    };
  }

  if (user.rol !== "admin" && user.rol !== "superadmin") {
    return {
      user,
      denied: deniedJson("Solo admin puede hacer esta acción", 403),
    };
  }

  return { user, denied: null };
}

export async function requireSuperAdmin(): Promise<GuardResult> {
  const user = await getUser();

  if (!user) {
    return {
      user: null,
      denied: deniedJson("No autorizado", 401),
    };
  }

  if (user.rol !== "superadmin") {
    return {
      user,
      denied: deniedJson("Solo superadmin puede hacer esta acción", 403),
    };
  }

  return { user, denied: null };
}

export async function requireRoles(rolesPermitidos: Rol[]): Promise<GuardResult> {
  const user = await getUser();

  if (!user) {
    return {
      user: null,
      denied: deniedJson("No autorizado", 401),
    };
  }

  if (!rolesPermitidos.includes(user.rol)) {
    return {
      user,
      denied: deniedJson("No tienes permiso para esta acción", 403),
    };
  }

  return { user, denied: null };
}
