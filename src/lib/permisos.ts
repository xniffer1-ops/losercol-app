export type Rol = "superadmin" | "admin" | "auxiliar" | "operador";

export type ModuloPermiso =
  | "dashboard"
  | "clientes"
  | "vehiculos"
  | "centros"
  | "tarifas"
  | "servicioRapido"
  | "servicios"
  | "caja"
  | "reportes"
  | "historial"
  | "usuarios"
  | "backup";

export type AccionPermiso =
  | "ver"
  | "crear"
  | "editar"
  | "eliminar"
  | "pdf"
  | "whatsapp"
  | "cerrar"
  | "reabrir"
  | "exportar"
  | "cambiarPassword"
  | "cambiarRol";

export type PermisosUsuario = Record<ModuloPermiso, Partial<Record<AccionPermiso, boolean>>>;

export const PERMISOS_TODOS: PermisosUsuario = {
  dashboard: { ver: true },
  clientes: { ver: true, crear: true, editar: true, eliminar: true },
  vehiculos: { ver: true, crear: true, editar: true, eliminar: true },
  centros: { ver: true, crear: true, editar: true, eliminar: true },
  tarifas: { ver: true, crear: true, editar: true, eliminar: true },
  servicioRapido: { ver: true, crear: true },
  servicios: { ver: true, crear: true, editar: true, eliminar: true, pdf: true, whatsapp: true },
  caja: { ver: true, cerrar: true, reabrir: true },
  reportes: { ver: true, exportar: true },
  historial: { ver: true },
  usuarios: { ver: true, crear: true, editar: true, eliminar: true, cambiarPassword: true, cambiarRol: true },
  backup: { ver: true, exportar: true },
};

export const PERMISOS_AUXILIAR: PermisosUsuario = {
  dashboard: { ver: false },
  clientes: { ver: true, crear: true, editar: true, eliminar: false },
  vehiculos: { ver: true, crear: true, editar: true, eliminar: false },
  centros: { ver: true, crear: false, editar: false, eliminar: false },
  tarifas: { ver: true, crear: false, editar: false, eliminar: false },
  servicioRapido: { ver: true, crear: true },
  servicios: { ver: true, crear: true, editar: true, eliminar: false, pdf: true, whatsapp: true },
  caja: { ver: true, cerrar: true, reabrir: false },
  reportes: { ver: true, exportar: true },
  historial: { ver: false },
  usuarios: { ver: false, crear: false, editar: false, eliminar: false, cambiarPassword: false, cambiarRol: false },
  backup: { ver: false, exportar: false },
};

export const PERMISOS_OPERADOR: PermisosUsuario = {
  dashboard: { ver: false },
  clientes: { ver: false, crear: false, editar: false, eliminar: false },
  vehiculos: { ver: false, crear: false, editar: false, eliminar: false },
  centros: { ver: false, crear: false, editar: false, eliminar: false },
  tarifas: { ver: false, crear: false, editar: false, eliminar: false },
  servicioRapido: { ver: true, crear: true },
  servicios: { ver: false, crear: false, editar: false, eliminar: false, pdf: false, whatsapp: false },
  caja: { ver: false, cerrar: false, reabrir: false },
  reportes: { ver: false, exportar: false },
  historial: { ver: false },
  usuarios: { ver: false, crear: false, editar: false, eliminar: false, cambiarPassword: false, cambiarRol: false },
  backup: { ver: false, exportar: false },
};

export function permisosPorRol(rol: string): PermisosUsuario {
  if (rol === "superadmin" || rol === "admin") return clonarPermisos(PERMISOS_TODOS);
  if (rol === "auxiliar") return clonarPermisos(PERMISOS_AUXILIAR);
  return clonarPermisos(PERMISOS_OPERADOR);
}

export function clonarPermisos(permisos: PermisosUsuario): PermisosUsuario {
  return JSON.parse(JSON.stringify(permisos)) as PermisosUsuario;
}

export function parsearPermisos(permisos: unknown, rol = "operador"): PermisosUsuario {
  const base = permisosPorRol(rol);

  if (!permisos) return base;

  try {
    const parsed =
      typeof permisos === "string"
        ? JSON.parse(permisos || "{}")
        : permisos;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return base;
    }

    const entrada = parsed as Record<string, Record<string, unknown>>;

    Object.keys(base).forEach((modulo) => {
      const acciones = entrada[modulo];

      if (!acciones || typeof acciones !== "object" || Array.isArray(acciones)) {
        return;
      }

      Object.keys(base[modulo as ModuloPermiso]).forEach((accion) => {
        const valor = acciones[accion];
        if (typeof valor === "boolean") {
          base[modulo as ModuloPermiso][accion as AccionPermiso] = valor;
        }
      });
    });

    return base;
  } catch {
    return base;
  }
}

export function serializarPermisos(permisos: unknown, rol = "operador") {
  return JSON.stringify(parsearPermisos(permisos, rol));
}

export function tienePermiso(
  permisos: PermisosUsuario | undefined | null,
  modulo: ModuloPermiso,
  accion: AccionPermiso = "ver"
) {
  return Boolean(permisos?.[modulo]?.[accion]);
}

export function permisosSeguroParaRol(rolActual: string, rolObjetivo: string, permisos: unknown) {
  if (rolActual !== "superadmin" && rolObjetivo === "superadmin") {
    return serializarPermisos(PERMISOS_TODOS, "superadmin");
  }

  return serializarPermisos(permisos, rolObjetivo);
}
