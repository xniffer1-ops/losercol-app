"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Usuario = {
  id: number;
  nombre: string;
  email: string;
  rol: "admin" | "operador";
  createdAt?: string;
};

const initialForm = {
  nombre: "",
  email: "",
  password: "",
  rol: "operador",
};

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [form, setForm] = useState(initialForm);
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    cargarUsuarios();
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

    if (form.password.length < 6) {
      setMensaje("La contraseña debe tener mínimo 6 caracteres");
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
                <span style={u.rol === "admin" ? styles.badgeAdmin : styles.badgeOperador}>
                  {u.rol}
                </span>
                <span>
                  {u.createdAt
                    ? new Date(u.createdAt).toLocaleDateString("es-CO")
                    : "-"}
                </span>
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
    gridTemplateColumns: "1.2fr 1.5fr 0.8fr 0.8fr",
    gap: "10px",
    background: "#f5c400",
    padding: "14px",
    fontWeight: 700,
  },
  tableRow: {
    display: "grid",
    gridTemplateColumns: "1.2fr 1.5fr 0.8fr 0.8fr",
    gap: "10px",
    padding: "12px 14px",
    borderTop: "1px solid #eee",
    alignItems: "center",
    background: "#fff",
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
};