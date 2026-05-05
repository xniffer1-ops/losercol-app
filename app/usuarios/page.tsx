"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type RolUsuario = "superadmin" | "admin" | "auxiliar" | "operador";

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

type PermisosUsuario = Record<ModuloPermiso, Partial<Record<AccionPermiso, boolean>>>;

type Usuario = {
  id: number;
  nombre: string;
  email: string;
  rol: RolUsuario;
  permisos: PermisosUsuario;
  createdAt?: string;
};

type UsuarioActual = {
  id: number;
  nombre: string;
  email: string;
  rol: RolUsuario;
  permisos: PermisosUsuario;
} | null;

const modulos: {
  key: ModuloPermiso;
  label: string;
  acciones: { key: AccionPermiso; label: string }[];
}[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    acciones: [{ key: "ver", label: "Ver" }],
  },
  {
    key: "clientes",
    label: "Clientes",
    acciones: [
      { key: "ver", label: "Ver" },
      { key: "crear", label: "Crear" },
      { key: "editar", label: "Editar" },
      { key: "eliminar", label: "Eliminar" },
    ],
  },
  {
    key: "vehiculos",
    label: "Vehículos",
    acciones: [
      { key: "ver", label: "Ver" },
      { key: "crear", label: "Crear" },
      { key: "editar", label: "Editar" },
      { key: "eliminar", label: "Eliminar" },
    ],
  },
  {
    key: "servicioRapido",
    label: "Servicio rápido",
    acciones: [
      { key: "ver", label: "Ver" },
      { key: "crear", label: "Crear servicios" },
    ],
  },
  {
    key: "servicios",
    label: "Servicios",
    acciones: [
      { key: "ver", label: "Ver" },
      { key: "crear", label: "Crear" },
      { key: "editar", label: "Editar" },
      { key: "eliminar", label: "Eliminar" },
      { key: "pdf", label: "PDF" },
      { key: "whatsapp", label: "WhatsApp" },
    ],
  },
  {
    key: "caja",
    label: "Caja",
    acciones: [
      { key: "ver", label: "Ver" },
      { key: "cerrar", label: "Cerrar caja" },
      { key: "reabrir", label: "Reabrir caja" },
    ],
  },
  {
    key: "reportes",
    label: "Reportes",
    acciones: [
      { key: "ver", label: "Ver" },
      { key: "exportar", label: "Exportar" },
    ],
  },
  {
    key: "historial",
    label: "Historial",
    acciones: [{ key: "ver", label: "Ver" }],
  },
  {
    key: "usuarios",
    label: "Usuarios",
    acciones: [
      { key: "ver", label: "Ver" },
      { key: "crear", label: "Crear" },
      { key: "editar", label: "Editar" },
      { key: "eliminar", label: "Eliminar" },
      { key: "cambiarPassword", label: "Contraseña" },
      { key: "cambiarRol", label: "Rol" },
    ],
  },
  {
    key: "centros",
    label: "Centros",
    acciones: [
      { key: "ver", label: "Ver" },
      { key: "crear", label: "Crear" },
      { key: "editar", label: "Editar" },
      { key: "eliminar", label: "Eliminar" },
    ],
  },
  {
    key: "tarifas",
    label: "Tarifas",
    acciones: [
      { key: "ver", label: "Ver" },
      { key: "crear", label: "Crear" },
      { key: "editar", label: "Editar" },
      { key: "eliminar", label: "Eliminar" },
    ],
  },
  {
    key: "backup",
    label: "Backup",
    acciones: [
      { key: "ver", label: "Ver" },
      { key: "exportar", label: "Exportar" },
    ],
  },
];

const permisosTodos = (): PermisosUsuario => {
  const permisos = {} as PermisosUsuario;
  modulos.forEach((modulo) => {
    permisos[modulo.key] = {};
    modulo.acciones.forEach((accion) => {
      permisos[modulo.key][accion.key] = true;
    });
  });
  return permisos;
};

const permisosVacios = (): PermisosUsuario => {
  const permisos = {} as PermisosUsuario;
  modulos.forEach((modulo) => {
    permisos[modulo.key] = {};
    modulo.acciones.forEach((accion) => {
      permisos[modulo.key][accion.key] = false;
    });
  });
  return permisos;
};

const permisosPorRol = (rol: RolUsuario): PermisosUsuario => {
  if (rol === "superadmin" || rol === "admin") return permisosTodos();

  const p = permisosVacios();

  if (rol === "auxiliar") {
    p.clientes = { ver: true, crear: true, editar: true, eliminar: false };
    p.vehiculos = { ver: true, crear: true, editar: true, eliminar: false };
    p.servicioRapido = { ver: true, crear: true };
    p.servicios = { ver: true, crear: true, editar: true, eliminar: false, pdf: true, whatsapp: true };
    p.caja = { ver: true, cerrar: true, reabrir: false };
    p.reportes = { ver: true, exportar: true };
    p.centros = { ver: true };
    p.tarifas = { ver: true };
    return p;
  }

  p.clientes = { ver: true, crear: true, editar: false, eliminar: false };
  p.vehiculos = { ver: true, crear: true, editar: false, eliminar: false };
  p.servicioRapido = { ver: true, crear: true };
  p.servicios = { ver: true, crear: true, editar: false, eliminar: false, pdf: true, whatsapp: true };
  p.caja = { ver: true, cerrar: true, reabrir: false };
  p.centros = { ver: true };
  p.tarifas = { ver: true };
  return p;
};

const initialForm = {
  nombre: "",
  email: "",
  password: "",
  rol: "operador" as RolUsuario,
  permisos: permisosPorRol("operador"),
};

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuarioActual, setUsuarioActual] = useState<UsuarioActual>(null);
  const [form, setForm] = useState(initialForm);
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [passwordEditandoId, setPasswordEditandoId] = useState<number | null>(null);
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [rolEditandoId, setRolEditandoId] = useState<number | null>(null);
  const [nuevoRol, setNuevoRol] = useState<RolUsuario>("operador");
  const [permisosEditandoId, setPermisosEditandoId] = useState<number | null>(null);
  const [permisosEditando, setPermisosEditando] = useState<PermisosUsuario>(permisosPorRol("operador"));

  const cargarUsuarioActual = async () => {
    try {
      const res = await fetch("/api/me", { cache: "no-store" });
      const data = await res.json();

      if (res.ok) {
        setUsuarioActual(data);
      } else {
        setUsuarioActual(null);
      }
    } catch {
      setUsuarioActual(null);
    }
  };

  const cargarUsuarios = async () => {
    try {
      const res = await fetch("/api/usuarios", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        setMensaje(data.error || "Error al cargar usuarios");
        setUsuarios([]);
        return;
      }

      setUsuarios(Array.isArray(data) ? data : []);
    } catch {
      setMensaje("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const cargar = async () => {
      await cargarUsuarioActual();
      await cargarUsuarios();
    };

    void cargar();
  }, []);

  const puedeCrearSuperadmin = usuarioActual?.rol === "superadmin";

  const puedeGestionar = (usuario: Usuario) => {
    if (usuario.rol === "superadmin" && usuarioActual?.rol !== "superadmin") {
      return false;
    }

    if (usuarioActual?.id === usuario.id && usuario.rol === "superadmin") {
      return false;
    }

    return usuarioActual?.rol === "admin" || usuarioActual?.rol === "superadmin";
  };

  const usuariosConPermisos = useMemo(() => {
    return usuarios.map((usuario) => ({
      ...usuario,
      permisos: usuario.permisos || permisosPorRol(usuario.rol),
    }));
  }, [usuarios]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setForm((prev) => {
      if (name === "rol") {
        const rol = value as RolUsuario;
        return {
          ...prev,
          rol,
          permisos: permisosPorRol(rol),
        };
      }

      return { ...prev, [name]: value };
    });
  };

  const cambiarPermisoFormulario = (
    modulo: ModuloPermiso,
    accion: AccionPermiso,
    valor: boolean
  ) => {
    setForm((prev) => ({
      ...prev,
      permisos: {
        ...prev.permisos,
        [modulo]: {
          ...prev.permisos[modulo],
          [accion]: valor,
        },
      },
    }));
  };

  const cambiarPermisoEdicion = (
    modulo: ModuloPermiso,
    accion: AccionPermiso,
    valor: boolean
  ) => {
    setPermisosEditando((prev) => ({
      ...prev,
      [modulo]: {
        ...prev[modulo],
        [accion]: valor,
      },
    }));
  };

  const crearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje("");

    if (!form.nombre.trim() || !form.email.trim() || !form.password.trim()) {
      setMensaje("Completa nombre, correo y contraseña");
      return;
    }

    if (form.password.length < 8) {
      setMensaje("La contraseña debe tener mínimo 8 caracteres");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setMensaje(data.error || "Error al crear usuario");
        return;
      }

      setMensaje("Usuario creado correctamente");
      setForm(initialForm);
      await cargarUsuarios();
    } catch {
      setMensaje("Error de conexión al crear usuario");
    } finally {
      setSaving(false);
    }
  };

  const cambiarPassword = async (id: number) => {
    setMensaje("");

    if (!nuevaPassword.trim()) {
      setMensaje("Escribe la nueva contraseña");
      return;
    }

    if (nuevaPassword.length < 8) {
      setMensaje("La contraseña debe tener mínimo 8 caracteres");
      return;
    }

    try {
      const res = await fetch("/api/usuarios", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          password: nuevaPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMensaje(data.error || "Error al cambiar contraseña");
        return;
      }

      setMensaje("Contraseña actualizada correctamente");
      setPasswordEditandoId(null);
      setNuevaPassword("");
      await cargarUsuarios();
    } catch {
      setMensaje("Error de conexión al cambiar contraseña");
    }
  };

  const cambiarRol = async (id: number) => {
    setMensaje("");

    try {
      const res = await fetch("/api/usuarios", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          rol: nuevoRol,
          permisos: permisosPorRol(nuevoRol),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMensaje(data.error || "Error al cambiar rol");
        return;
      }

      setMensaje("Rol actualizado correctamente");
      setRolEditandoId(null);
      setNuevoRol("operador");
      await cargarUsuarios();
    } catch {
      setMensaje("Error de conexión al cambiar rol");
    }
  };

  const guardarPermisos = async (id: number) => {
    setMensaje("");

    try {
      const res = await fetch("/api/usuarios", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          permisos: permisosEditando,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMensaje(data.error || "Error al actualizar permisos");
        return;
      }

      setMensaje("Permisos actualizados correctamente");
      setPermisosEditandoId(null);
      await cargarUsuarios();
    } catch {
      setMensaje("Error de conexión al actualizar permisos");
    }
  };

  const eliminarUsuario = async (usuario: Usuario) => {
    setMensaje("");

    const ok = window.confirm(
      `¿Seguro que deseas eliminar el usuario ${usuario.email}?`
    );

    if (!ok) return;

    try {
      const res = await fetch("/api/usuarios", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: usuario.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMensaje(data.error || "Error al eliminar usuario");
        return;
      }

      setMensaje("Usuario eliminado correctamente");
      await cargarUsuarios();
    } catch {
      setMensaje("Error de conexión al eliminar usuario");
    }
  };

  const renderPermisos = (
    permisos: PermisosUsuario,
    onChange: (modulo: ModuloPermiso, accion: AccionPermiso, valor: boolean) => void
  ) => (
    <div style={styles.permisosGrid}>
      {modulos.map((modulo) => (
        <div key={modulo.key} style={styles.permissionModule}>
          <strong style={styles.permissionTitle}>{modulo.label}</strong>

          <div style={styles.permissionChecks}>
            {modulo.acciones.map((accion) => (
              <label key={accion.key} style={styles.permissionCheck}>
                <input
                  type="checkbox"
                  checked={Boolean(permisos?.[modulo.key]?.[accion.key])}
                  onChange={(e) => onChange(modulo.key, accion.key, e.target.checked)}
                />
                {accion.label}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <main style={styles.page}>
      <div style={styles.topBar}>
        <div>
          <h1 style={styles.title}>Usuarios</h1>
          <p style={styles.subtitle}>
            Crear usuarios y controlar exactamente qué pueden ver o hacer
          </p>
        </div>

        <Link href="/" style={styles.backLink}>
          ← Volver al menú
        </Link>
      </div>

      <div style={styles.layout}>
        <section style={styles.tableSection}>
          <div style={styles.tableHeader}>
            <span>Nombre</span>
            <span>Correo</span>
            <span>Rol</span>
            <span>Creado</span>
            <span>Acciones</span>
          </div>

          <div style={styles.tableBody}>
            {loading ? (
              <div style={styles.empty}>Cargando usuarios...</div>
            ) : usuariosConPermisos.length === 0 ? (
              <div style={styles.empty}>No hay usuarios registrados</div>
            ) : (
              usuariosConPermisos.map((u) => (
                <div key={u.id} style={styles.tableRow}>
                  <span>{u.nombre}</span>
                  <span>{u.email}</span>
                  <span
                    style={
                      u.rol === "superadmin"
                        ? styles.badgeSuperadmin
                        : u.rol === "admin"
                        ? styles.badgeAdmin
                        : u.rol === "auxiliar"
                        ? styles.badgeAuxiliar
                        : styles.badgeOperador
                    }
                  >
                    {u.rol}
                  </span>
                  <span>
                    {u.createdAt
                      ? new Date(u.createdAt).toLocaleDateString("es-CO")
                      : "-"}
                  </span>

                  <div style={styles.actions}>
                    {puedeGestionar(u) ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setPasswordEditandoId(passwordEditandoId === u.id ? null : u.id);
                            setRolEditandoId(null);
                            setPermisosEditandoId(null);
                            setNuevaPassword("");
                          }}
                          style={styles.smallButton}
                        >
                          Contraseña
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setRolEditandoId(rolEditandoId === u.id ? null : u.id);
                            setPasswordEditandoId(null);
                            setPermisosEditandoId(null);
                            setNuevoRol(u.rol);
                          }}
                          style={styles.smallButton}
                        >
                          Rol
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setPermisosEditandoId(permisosEditandoId === u.id ? null : u.id);
                            setPasswordEditandoId(null);
                            setRolEditandoId(null);
                            setPermisosEditando(u.permisos || permisosPorRol(u.rol));
                          }}
                          style={styles.smallButton}
                        >
                          Permisos
                        </button>

                        <button
                          type="button"
                          onClick={() => eliminarUsuario(u)}
                          style={styles.deleteButton}
                        >
                          Eliminar
                        </button>
                      </>
                    ) : (
                      <span style={styles.protectedText}>Protegido</span>
                    )}

                    {passwordEditandoId === u.id && (
                      <div style={styles.inlineEditor}>
                        <input
                          type="password"
                          placeholder="Nueva contraseña"
                          value={nuevaPassword}
                          onChange={(e) => setNuevaPassword(e.target.value)}
                          style={styles.input}
                        />

                        <button
                          type="button"
                          onClick={() => cambiarPassword(u.id)}
                          style={styles.saveSmallButton}
                        >
                          Guardar
                        </button>
                      </div>
                    )}

                    {rolEditandoId === u.id && (
                      <div style={styles.inlineEditor}>
                        <select
                          value={nuevoRol}
                          onChange={(e) => setNuevoRol(e.target.value as RolUsuario)}
                          style={styles.input}
                        >
                          <option value="operador">Operador</option>
                          <option value="auxiliar">Auxiliar administrativo</option>
                          <option value="admin">Admin</option>
                          {puedeCrearSuperadmin && (
                            <option value="superadmin">Superadmin</option>
                          )}
                        </select>

                        <button
                          type="button"
                          onClick={() => cambiarRol(u.id)}
                          style={styles.saveSmallButton}
                        >
                          Guardar
                        </button>
                      </div>
                    )}

                    {permisosEditandoId === u.id && (
                      <div style={styles.permissionsEditor}>
                        <p style={styles.permissionsNote}>
                          Caja: puedes permitir ver/cerrar caja. Reabrir caja solo debe quedar para admin o superadmin.
                        </p>
                        {renderPermisos(permisosEditando, cambiarPermisoEdicion)}

                        <button
                          type="button"
                          onClick={() => guardarPermisos(u.id)}
                          style={styles.saveButton}
                        >
                          Guardar permisos
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section style={styles.formCard}>
          <h2 style={styles.formTitle}>Crear usuario</h2>

          <form onSubmit={crearUsuario} style={styles.form}>
            <input
              name="nombre"
              placeholder="Nombre"
              value={form.nombre}
              onChange={handleChange}
              style={styles.input}
            />

            <input
              name="email"
              type="email"
              placeholder="Correo"
              value={form.email}
              onChange={handleChange}
              style={styles.input}
            />

            <input
              name="password"
              type="password"
              placeholder="Contraseña"
              value={form.password}
              onChange={handleChange}
              style={styles.input}
            />

            <select
              name="rol"
              value={form.rol}
              onChange={handleChange}
              style={styles.input}
            >
              <option value="operador">Operador</option>
              <option value="auxiliar">Auxiliar administrativo</option>
              <option value="admin">Admin</option>
              {puedeCrearSuperadmin && (
                <option value="superadmin">Superadmin</option>
              )}
            </select>

            <div style={styles.permissionsCreateBox}>
              <h3 style={styles.permissionCreateTitle}>Permisos del usuario</h3>
              <p style={styles.permissionsNote}>
                Para caja, el usuario puede verla y cerrarla si lo permites. La opción reabrir caja déjala solo para admin/superadmin.
              </p>
              {renderPermisos(form.permisos, cambiarPermisoFormulario)}
            </div>

            <button type="submit" style={styles.saveButton} disabled={saving}>
              {saving ? "Creando..." : "Crear usuario"}
            </button>

            {mensaje && <p style={styles.message}>{mensaje}</p>}
          </form>
        </section>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f2f2f2",
    padding: "30px",
    fontFamily: "Arial, sans-serif",
    color: "#111",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "24px",
    gap: "12px",
    flexWrap: "wrap",
  },
  title: {
    margin: 0,
    fontSize: "32px",
  },
  subtitle: {
    margin: "6px 0 0 0",
    color: "#555",
  },
  backLink: {
    textDecoration: "none",
    color: "#0b5cab",
    fontWeight: 700,
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: "24px",
    alignItems: "start",
  },
  tableSection: {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "10px",
    overflow: "hidden",
    maxHeight: "calc(100vh - 150px)",
    display: "flex",
    flexDirection: "column",
  },
  tableBody: {
    overflowY: "auto",
    flex: 1,
  },
  tableHeader: {
    display: "grid",
    gridTemplateColumns: "1.1fr 1.4fr 0.8fr 0.8fr 1.8fr",
    gap: "10px",
    background: "#f5c400",
    padding: "14px",
    fontWeight: 700,
    position: "sticky",
    top: 0,
    zIndex: 2,
  },
  tableRow: {
    display: "grid",
    gridTemplateColumns: "1.1fr 1.4fr 0.8fr 0.8fr 1.8fr",
    gap: "10px",
    padding: "12px 14px",
    borderTop: "1px solid #eee",
    alignItems: "start",
    background: "#fff",
  },
  badgeSuperadmin: {
    background: "#7c2d12",
    color: "#fff",
    borderRadius: "999px",
    padding: "6px 10px",
    fontWeight: 700,
    textAlign: "center",
    width: "fit-content",
  },
  badgeAdmin: {
    background: "#111827",
    color: "#fff",
    borderRadius: "999px",
    padding: "6px 10px",
    fontWeight: 700,
    textAlign: "center",
    width: "fit-content",
  },
  badgeAuxiliar: {
    background: "#dbeafe",
    color: "#1e40af",
    borderRadius: "999px",
    padding: "6px 10px",
    fontWeight: 700,
    textAlign: "center",
    width: "fit-content",
  },
  badgeOperador: {
    background: "#e5e7eb",
    color: "#111827",
    borderRadius: "999px",
    padding: "6px 10px",
    fontWeight: 700,
    textAlign: "center",
    width: "fit-content",
  },
  formCard: {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "10px",
    padding: "20px",
    position: "sticky",
    top: "20px",
    maxHeight: "calc(100vh - 40px)",
    overflowY: "auto",
  },
  formTitle: {
    marginTop: 0,
    marginBottom: "16px",
  },
  form: {
    display: "grid",
    gap: "12px",
  },
  input: {
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    fontSize: "14px",
    width: "100%",
    boxSizing: "border-box",
  },
  saveButton: {
    background: "#f5c400",
    color: "#111",
    border: "none",
    borderRadius: "8px",
    padding: "12px",
    fontWeight: 700,
    cursor: "pointer",
  },
  message: {
    margin: 0,
    fontWeight: 700,
  },
  empty: {
    padding: "18px",
  },
  actions: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
    alignItems: "center",
  },
  smallButton: {
    background: "#fff",
    color: "#111",
    border: "1px solid #bbb",
    borderRadius: "6px",
    padding: "8px 10px",
    cursor: "pointer",
    fontWeight: 700,
  },
  saveSmallButton: {
    background: "#f5c400",
    color: "#111",
    border: "none",
    borderRadius: "6px",
    padding: "8px 10px",
    cursor: "pointer",
    fontWeight: 700,
  },
  deleteButton: {
    background: "#b91c1c",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "8px 10px",
    cursor: "pointer",
    fontWeight: 700,
  },
  protectedText: {
    color: "#6b7280",
    fontWeight: 700,
  },
  inlineEditor: {
    width: "100%",
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "6px",
    marginTop: "8px",
  },
  permissionsEditor: {
    width: "100%",
    marginTop: "10px",
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #ddd",
    background: "#fafafa",
  },
  permissionsCreateBox: {
    border: "1px solid #ddd",
    borderRadius: "10px",
    padding: "12px",
    background: "#fafafa",
  },
  permissionCreateTitle: {
    margin: "0 0 8px",
  },
  permissionsNote: {
    margin: "0 0 10px",
    color: "#555",
    fontSize: "13px",
    lineHeight: 1.4,
  },
  permisosGrid: {
    display: "grid",
    gap: "10px",
  },
  permissionModule: {
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    padding: "10px",
    background: "#fff",
  },
  permissionTitle: {
    display: "block",
    marginBottom: "8px",
  },
  permissionChecks: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  permissionCheck: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "13px",
    background: "#f3f4f6",
    borderRadius: "999px",
    padding: "6px 9px",
    cursor: "pointer",
  },
};
