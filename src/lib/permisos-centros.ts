import type { AccionPermiso, PermisosUsuario } from "@/src/lib/permisos";
import type { AuthUser } from "@/src/lib/auth";

export type PermisosCentro = Partial<Record<AccionPermiso, boolean>>;
export type CentrosAcceso = Record<string, PermisosCentro>;

export const EMAILS_GESTORES_CENTROS = new Set([
  "admin@losercol.com",
  "soporte@losercol.com",
]);

export function puedeAdministrarAccesoCentros(
  user: Pick<AuthUser, "email" | "rol"> | null | undefined
) {
  if (!user) return false;
  return EMAILS_GESTORES_CENTROS.has(user.email.trim().toLowerCase());
}

export function obtenerCentrosAcceso(permisos: PermisosUsuario | null | undefined): CentrosAcceso | null {
  const mapa = permisos?.centrosAcceso;
  if (!mapa || typeof mapa !== "object") return null;
  return mapa;
}

export function tienePermisoCentro(
  user: Pick<AuthUser, "id" | "email" | "rol" | "permisos">,
  centroOperacionId: number,
  accion: AccionPermiso = "ver"
) {
  if (!centroOperacionId || puedeAdministrarAccesoCentros(user) || user.rol === "superadmin") {
    return true;
  }

  const mapa = obtenerCentrosAcceso(user.permisos);

  // Compatibilidad: usuarios existentes sin configuración por centro
  // conservan acceso a los centros actuales hasta que se les configure.
  if (!mapa) return true;

  return Boolean(mapa[String(centroOperacionId)]?.[accion]);
}

export function idsCentrosConPermiso(
  user: Pick<AuthUser, "id" | "email" | "rol" | "permisos">,
  accion: AccionPermiso = "ver"
) {
  const mapa = obtenerCentrosAcceso(user.permisos);
  if (!mapa) return null;
  return Object.entries(mapa)
    .filter(([, permisos]) => Boolean(permisos?.[accion]))
    .map(([id]) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0);
}

export function agregarCentrosAcceso(
  permisos: PermisosUsuario,
  centros: CentrosAcceso | undefined
): PermisosUsuario {
  const resultado = JSON.parse(JSON.stringify(permisos)) as PermisosUsuario;
  if (centros && typeof centros === "object") {
    resultado.centrosAcceso = centros;
  }
  return resultado;
}
