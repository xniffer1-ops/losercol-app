"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type AccionPermiso =
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

type ModuloPermiso =
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

type RolUsuario = "superadmin" | "admin" | "auxiliar" | "operador";

type PermisosUsuario = Record<
  ModuloPermiso,
  Partial<Record<AccionPermiso, boolean>>
>;

type Usuario = {
  id: number;
  nombre: string;
  email: string;
  rol: RolUsuario;
  permisos?: PermisosUsuario;
} | null;

type NavItem = {
  href: string;
  label: string;
  descripcion: string;
  icon: string;
  grupo: "Operación" | "Administración" | "Facturación y control";
  modulo?: ModuloPermiso;
  soloRoles?: RolUsuario[];
};

const RUTAS_SIN_NAV = ["/login", "/verificar"];

const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Inicio",
    descripcion: "Dashboard principal",
    icon: "⌂",
    grupo: "Operación",
    modulo: "dashboard",
  },
  {
    href: "/servicio-rapido",
    label: "Servicio rápido",
    descripcion: "Crear soporte en pocos pasos",
    icon: "+",
    grupo: "Operación",
    modulo: "servicioRapido",
  },
  {
    href: "/servicios",
    label: "Servicios",
    descripcion: "Consultar y gestionar soportes",
    icon: "≡",
    grupo: "Operación",
    modulo: "servicios",
  },
  {
    href: "/caja",
    label: "Caja",
    descripcion: "Cuadre y cierre diario",
    icon: "$",
    grupo: "Operación",
    modulo: "caja",
  },
  {
    href: "/operacion",
    label: "Operación",
    descripcion: "Seguimiento por estados",
    icon: "◉",
    grupo: "Operación",
    soloRoles: ["superadmin", "admin"],
  },
  {
    href: "/clientes",
    label: "Clientes",
    descripcion: "Crear y consultar clientes",
    icon: "👥",
    grupo: "Administración",
    modulo: "clientes",
  },
  {
    href: "/vehiculos",
    label: "Vehículos",
    descripcion: "Placas y relación con clientes",
    icon: "▣",
    grupo: "Administración",
    modulo: "vehiculos",
  },
  {
    href: "/centros",
    label: "Centros",
    descripcion: "Centros de operación",
    icon: "▦",
    grupo: "Administración",
    modulo: "centros",
  },
  {
    href: "/secciones",
    label: "Secciones",
    descripcion: "Áreas o secciones de trabajo",
    icon: "□",
    grupo: "Administración",
    soloRoles: ["superadmin", "admin"],
  },
  {
    href: "/tarifas",
    label: "Tarifas",
    descripcion: "Valores, códigos y carpas",
    icon: "#",
    grupo: "Administración",
    modulo: "tarifas",
  },
  {
    href: "/factura-multiple",
    label: "Factura múltiple",
    descripcion: "Agrupar soportes para facturar",
    icon: "▤",
    grupo: "Facturación y control",
    soloRoles: ["superadmin", "admin"],
  },
  {
    href: "/facturas-multiples",
    label: "Historial facturas",
    descripcion: "Consultar facturas múltiples",
    icon: "▥",
    grupo: "Facturación y control",
    soloRoles: ["superadmin", "admin"],
  },
  {
    href: "/reportes",
    label: "Reportes",
    descripcion: "Informes y exportaciones",
    icon: "▧",
    grupo: "Facturación y control",
    modulo: "reportes",
  },
  {
    href: "/usuarios",
    label: "Usuarios",
    descripcion: "Accesos, roles y permisos",
    icon: "⚿",
    grupo: "Facturación y control",
    modulo: "usuarios",
  },
  {
    href: "/historial",
    label: "Historial",
    descripcion: "Acciones realizadas en la app",
    icon: "↺",
    grupo: "Facturación y control",
    modulo: "historial",
  },
];

function esRutaSinNav(pathname: string) {
  return RUTAS_SIN_NAV.some(
    (ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`)
  );
}

function esAdmin(usuario: Usuario) {
  return usuario?.rol === "admin" || usuario?.rol === "superadmin";
}

function puedeVerItem(usuario: Usuario, item: NavItem) {
  if (!usuario) return false;
  if (esAdmin(usuario)) return true;

  if (item.soloRoles) {
    return item.soloRoles.includes(usuario.rol);
  }

  if (!item.modulo) return true;

  return Boolean(usuario.permisos?.[item.modulo]?.ver);
}

function nombreCorto(nombre?: string) {
  const limpio = (nombre || "Usuario").trim();
  if (!limpio) return "Usuario";

  const partes = limpio.split(/\s+/).slice(0, 2);
  return partes.join(" ");
}

export default function AppNav() {
  const pathname = usePathname() || "/";
  const [usuario, setUsuario] = useState<Usuario>(null);
  const [cargado, setCargado] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement | null>(null);

  const rutaSinNav = esRutaSinNav(pathname);

  useEffect(() => {
    setMenuAbierto(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuAbierto) return;

    const cerrarSiClickAfuera = (event: MouseEvent) => {
      if (!contenedorRef.current?.contains(event.target as Node)) {
        setMenuAbierto(false);
      }
    };

    const cerrarConEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuAbierto(false);
    };

    document.addEventListener("mousedown", cerrarSiClickAfuera);
    document.addEventListener("keydown", cerrarConEscape);

    return () => {
      document.removeEventListener("mousedown", cerrarSiClickAfuera);
      document.removeEventListener("keydown", cerrarConEscape);
    };
  }, [menuAbierto]);

  useEffect(() => {
    if (rutaSinNav) {
      setUsuario(null);
      setCargado(true);
      return;
    }

    let activo = true;

    const cargarUsuario = async () => {
      setCargado(false);

      try {
        const res = await fetch("/api/me", { cache: "no-store" });

        if (!res.ok) {
          if (activo) setUsuario(null);
          return;
        }

        const data = (await res.json()) as Usuario;
        if (activo) setUsuario(data);
      } catch {
        if (activo) setUsuario(null);
      } finally {
        if (activo) setCargado(true);
      }
    };

    void cargarUsuario();

    return () => {
      activo = false;
    };
  }, [rutaSinNav, pathname]);

  const cerrarSesion = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  };

  const itemsVisibles = useMemo(
    () => NAV_ITEMS.filter((item) => puedeVerItem(usuario, item)),
    [usuario]
  );

  const grupos = useMemo(() => {
    return itemsVisibles.reduce<Record<NavItem["grupo"], NavItem[]>>(
      (acc, item) => {
        acc[item.grupo].push(item);
        return acc;
      },
      {
        Operación: [],
        Administración: [],
        "Facturación y control": [],
      }
    );
  }, [itemsVisibles]);

  const itemActivo =
    itemsVisibles.find((item) => {
      if (item.href === "/") return pathname === "/";
      return pathname === item.href || pathname.startsWith(`${item.href}/`);
    }) || null;

  if (rutaSinNav || !cargado || !usuario) {
    return null;
  }

  return (
    <div style={styles.raiz} ref={contenedorRef} aria-label="Menú principal LOSERCOL">
      {menuAbierto && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setMenuAbierto(false)}
          style={styles.fondo}
        />
      )}

      <button
        type="button"
        onClick={() => setMenuAbierto((valor) => !valor)}
        style={styles.botonFlotante}
        aria-haspopup="menu"
        aria-expanded={menuAbierto}
        aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
        title={itemActivo ? `Página actual: ${itemActivo.label}` : "Abrir menú"}
      >
        <span style={styles.iconoBoton} aria-hidden="true">
          {menuAbierto ? "×" : "☰"}
        </span>
      </button>

      {menuAbierto && (
        <aside style={styles.panel} role="menu" aria-label="Lista de páginas">
          <div style={styles.panelHeader}>
            <Link href="/" style={styles.marca} aria-label="Ir al inicio">
              <img src="/logo-losercol.png" alt="LOSERCOL" style={styles.logo} />
              <span style={styles.marcaInfo}>
                <strong style={styles.marcaTitulo}>LOSERCOL</strong>
                <small style={styles.marcaSubtitulo}>Menú operativo</small>
              </span>
            </Link>

            <button
              type="button"
              onClick={() => setMenuAbierto(false)}
              style={styles.cerrar}
              aria-label="Cerrar menú"
            >
              ×
            </button>
          </div>

          <div style={styles.usuarioCard}>
            <span style={styles.usuarioEtiqueta}>Sesión activa</span>
            <strong style={styles.usuarioNombre}>{nombreCorto(usuario.nombre)}</strong>
            <span style={styles.usuarioDetalle}>{usuario.rol} · {usuario.email}</span>
          </div>

          <div style={styles.actualCard}>
            <span style={styles.actualEtiqueta}>Página actual</span>
            <strong style={styles.actualTitulo}>{itemActivo?.label || "Seleccionar página"}</strong>
          </div>

          <div style={styles.listaContenedor}>
            {(Object.keys(grupos) as NavItem["grupo"][]).map((grupo) => {
              const items = grupos[grupo];
              if (items.length === 0) return null;

              return (
                <section key={grupo} style={styles.grupo}>
                  <h2 style={styles.grupoTitulo}>{grupo}</h2>
                  <div style={styles.listaLinks}>
                    {items.map((item) => {
                      const activo =
                        item.href === "/"
                          ? pathname === "/"
                          : pathname === item.href || pathname.startsWith(`${item.href}/`);

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          role="menuitem"
                          aria-current={activo ? "page" : undefined}
                          style={{
                            ...styles.linkMenu,
                            ...(activo ? styles.linkMenuActivo : undefined),
                          }}
                        >
                          <span
                            style={{
                              ...styles.linkIcono,
                              ...(activo ? styles.linkIconoActivo : undefined),
                            }}
                            aria-hidden="true"
                          >
                            {item.icon}
                          </span>
                          <span style={styles.linkTextoWrap}>
                            <strong style={styles.linkLabel}>{item.label}</strong>
                            <small style={styles.linkDescripcion}>{item.descripcion}</small>
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>

          <button type="button" onClick={cerrarSesion} style={styles.salir}>
            Cerrar sesión
          </button>
        </aside>
      )}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  raiz: {
    position: "fixed",
    top: 14,
    right: 14,
    zIndex: 80,
    fontFamily:
      "var(--font-geist-sans, system-ui, -apple-system, Segoe UI, sans-serif)",
    pointerEvents: "none",
  },
  fondo: {
    position: "fixed",
    inset: 0,
    zIndex: 70,
    background: "rgba(15, 23, 42, 0.28)",
    borderWidth: 0,
    padding: 0,
    cursor: "default",
    pointerEvents: "auto",
  },
  botonFlotante: {
    position: "relative",
    zIndex: 92,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 54,
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(255, 255, 255, 0.85)",
    background: "linear-gradient(135deg, #0f172a 0%, #0f766e 100%)",
    color: "#ffffff",
    boxShadow: "0 16px 34px rgba(15, 23, 42, 0.28)",
    cursor: "pointer",
    pointerEvents: "auto",
  },
  iconoBoton: {
    fontSize: 26,
    fontWeight: 900,
    lineHeight: 1,
    transform: "translateY(-1px)",
  },
  panel: {
    position: "fixed",
    top: 78,
    right: 14,
    bottom: 14,
    zIndex: 91,
    width: "min(410px, calc(100vw - 28px))",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    borderRadius: 24,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(226, 232, 240, 0.95)",
    background: "rgba(255, 255, 255, 0.98)",
    boxShadow: "0 26px 80px rgba(15, 23, 42, 0.25)",
    backdropFilter: "blur(16px)",
    pointerEvents: "auto",
  },
  panelHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "14px 14px 12px",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: "#e2e8f0",
    background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
  },
  marca: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
    color: "#0f172a",
    textDecoration: "none",
  },
  logo: {
    width: 94,
    height: 40,
    objectFit: "contain",
    display: "block",
    flexShrink: 0,
  },
  marcaInfo: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    lineHeight: 1.1,
  },
  marcaTitulo: {
    color: "#0f172a",
    fontSize: 13,
    letterSpacing: 0.4,
  },
  marcaSubtitulo: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: 800,
  },
  cerrar: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#e2e8f0",
    background: "#ffffff",
    color: "#0f172a",
    fontSize: 24,
    fontWeight: 900,
    cursor: "pointer",
    flexShrink: 0,
  },
  usuarioCard: {
    margin: "12px 14px 0",
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#dbeafe",
    background: "linear-gradient(135deg, #eff6ff 0%, #f0fdfa 100%)",
    display: "flex",
    flexDirection: "column",
    gap: 3,
  },
  usuarioEtiqueta: {
    color: "#0f766e",
    fontSize: 11,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  usuarioNombre: {
    color: "#0f172a",
    fontSize: 15,
    lineHeight: 1.2,
  },
  usuarioDetalle: {
    color: "#475569",
    fontSize: 11,
    fontWeight: 700,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  actualCard: {
    margin: "10px 14px 0",
    padding: "10px 12px",
    borderRadius: 16,
    background: "#0f172a",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  actualEtiqueta: {
    color: "#cbd5e1",
    fontSize: 11,
    fontWeight: 800,
  },
  actualTitulo: {
    color: "#ffffff",
    fontSize: 13,
    textAlign: "right",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  listaContenedor: {
    flex: "1 1 auto",
    overflowY: "auto",
    padding: "14px",
  },
  grupo: {
    marginBottom: 18,
  },
  grupoTitulo: {
    margin: "0 0 9px",
    color: "#0f766e",
    fontSize: 12,
    fontWeight: 950,
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  listaLinks: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 9,
  },
  linkMenu: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    minHeight: 62,
    padding: "10px 11px",
    borderRadius: 16,
    textDecoration: "none",
    color: "#0f172a",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#e2e8f0",
    background: "#ffffff",
    boxShadow: "0 8px 18px rgba(15, 23, 42, 0.04)",
  },
  linkMenuActivo: {
    borderColor: "#14b8a6",
    background: "linear-gradient(135deg, #ecfeff 0%, #f0fdfa 100%)",
    boxShadow: "0 12px 24px rgba(20, 184, 166, 0.15)",
  },
  linkIcono: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 38,
    height: 38,
    borderRadius: 14,
    background: "#f1f5f9",
    color: "#0f172a",
    fontSize: 17,
    fontWeight: 900,
    flexShrink: 0,
  },
  linkIconoActivo: {
    background: "#0f766e",
    color: "#ffffff",
  },
  linkTextoWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    minWidth: 0,
  },
  linkLabel: {
    color: "#0f172a",
    fontSize: 14,
    lineHeight: 1.2,
  },
  linkDescripcion: {
    color: "#64748b",
    fontSize: 11,
    lineHeight: 1.25,
  },
  salir: {
    margin: "0 14px 14px",
    minHeight: 46,
    padding: "10px 14px",
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#fecaca",
    background: "#fff1f2",
    color: "#b91c1c",
    fontWeight: 950,
    cursor: "pointer",
  },
};
