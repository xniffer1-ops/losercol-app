"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type RolUsuario = "superadmin" | "admin" | "operador";

type Usuario = {
  id: number;
  nombre: string;
  email: string;
  rol: RolUsuario;
  createdAt?: string;
};

type UsuarioActual = {
  id: number;
  nombre: string;
  email: string;
  rol: RolUsuario;
} | null;

const initialForm = {
  nombre: "",
  email: "",
  password: "",
  rol: "operador",
};

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuarioActual, setUsuarioActual] = useState<UsuarioActual>(null);
  const [form, setForm] = useState(initialForm);
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [passwordEditandoId, setPasswordEditandoId] = useState<number | null>(
    null
  );
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [rolEditandoId, setRolEditandoId] = useState<number | null>(null);
  const [nuevoRol, setNuevoRol] = useState<RolUsuario>("operador");

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

    cargar();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
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

  return (
    <main style={styles.page}>
      <div style={styles.topBar}>
        <div>
          <h1 style={styles.title}>Usuarios</h1>
          <p style={styles.subtitle}>Crear administradores y operadores</p>
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

          {loading ? (
            <div style={styles.empty}>Cargando usuarios...</div>
          ) : usuarios.length === 0 ? (
            <div style={styles.empty}>No hay usuarios registrados</div>
          ) : (
            usuarios.map((u) => (
              <div key={u.id} style={styles.tableRow}>
                <span>{u.nombre}</span>
                <span>{u.email}</span>
                <span
                  style={
                    u.rol === "superadmin"
                      ? styles.badgeSuperadmin
                      : u.rol === "admin"
                      ? styles.badgeAdmin
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
                          setPasswordEditandoId(
                            passwordEditandoId === u.id ? null : u.id
                          );
                          setRolEditandoId(null);
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
                          setNuevoRol(u.rol);
                        }}
                        style={styles.smallButton}
                      >
                        Rol
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
                        onChange={(e) =>
                          setNuevoRol(e.target.value as RolUsuario)
                        }
                        style={styles.input}
                      >
                        <option value="operador">Operador</option>
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
                </div>
              </div>
            ))
          )}
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
              <option value="admin">Admin</option>
              {puedeCrearSuperadmin && (
                <option value="superadmin">Superadmin</option>
              )}
            </select>

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
  },
  tableHeader: {
    display: "grid",
    gridTemplateColumns: "1.1fr 1.4fr 0.8fr 0.8fr 1.6fr",
    gap: "10px",
    background: "#f5c400",
    padding: "14px",
    fontWeight: 700,
  },
  tableRow: {
    display: "grid",
    gridTemplateColumns: "1.1fr 1.4fr 0.8fr 0.8fr 1.6fr",
    gap: "10px",
    padding: "12px 14px",
    borderTop: "1px solid #eee",
    alignItems: "center",
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
};