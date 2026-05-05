import { NextResponse } from "next/server";
import { getUser, type AuthUser, type Rol } from "@/src/lib/auth";
import {
  tienePermiso,
  type AccionPermiso,
  type ModuloPermiso,
} from "@/src/lib/permisos";

type GuardPermitido = {
  user: AuthUser;
  denied: null;
};

type GuardDenegado = {
  user: AuthUser | null;
  denied: NextResponse;
};

type GuardResult = GuardPermitido | GuardDenegado;

function deniedJson(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

function noAutorizado(): GuardDenegado {
  return {
    user: null,
    denied: deniedJson("No autorizado", 401),
  };
}

export async function requireUser(): Promise<GuardResult> {
  const user = await getUser();

  if (!user) {
    return noAutorizado();
  }

  return { user, denied: null };
}

export async function requireAdmin(): Promise<GuardResult> {
  const user = await getUser();

  if (!user) {
    return noAutorizado();
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
    return noAutorizado();
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
    return noAutorizado();
  }

  if (!rolesPermitidos.includes(user.rol)) {
    return {
      user,
      denied: deniedJson("No tienes permiso para esta acción", 403),
    };
  }

  return { user, denied: null };
}

export async function requirePermiso(
  modulo: ModuloPermiso,
  accion: AccionPermiso = "ver"
): Promise<GuardResult> {
  const user = await getUser();

  if (!user) {
    return noAutorizado();
  }

  if (user.rol === "superadmin") {
    return { user, denied: null };
  }

  if (!tienePermiso(user.permisos, modulo, accion)) {
    return {
      user,
      denied: deniedJson("No tienes permiso para esta acción", 403),
    };
  }

  return { user, denied: null };
}
