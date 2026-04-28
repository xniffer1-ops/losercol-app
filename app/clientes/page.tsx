"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Cliente = {
  id: number;
  ccNit: string;
  nombre: string;
  correo: string;
  telefono: string;
  formaPago: string;
};

export default function ClientesPage() {
  const [form, setForm] = useState({
    ccNit: "",
    nombre: "",
    correo: "",
    telefono: "",
    formaPago: "",
  });

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const cargarClientes = async () => {
    try {
      const res = await fetch("/api/clientes", { cache: "no-store" });
      const data = await res.json();
      setClientes(Array.isArray(data) ? data : []);
    } catch {
      setMensaje("No se pudieron cargar los clientes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarClientes();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje("");

    if (
      !form.ccNit.trim() ||
      !form.nombre.trim() ||
      !form.correo.trim() ||
      !form.telefono.trim() ||
      !form.formaPago.trim()
    ) {
      setMensaje("Completa todos los campos");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setMensaje(data.error || "Error al guardar cliente");
        return;
      }

      setMensaje("Cliente guardado correctamente");
      setForm({
        ccNit: "",
        nombre: "",
        correo: "",
        telefono: "",
        formaPago: "",
      });

      await cargarClientes();
    } catch {
      setMensaje("Error de conexión al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main style={styles.page}>
      <div style={styles.topBar}>
        <h1 style={styles.title}>Clientes</h1>
        <Link href="/" style={styles.backLink}>
          ← Volver al menú
        </Link>
      </div>

      <div style={styles.layout}>
        <section style={styles.tableSection}>
          <div style={styles.tableHeader}>
            <span>CC/NIT</span>
            <span>Nombre Cliente</span>
            <span>Correo</span>
            <span>Teléfono</span>
            <span>Forma de Pago</span>
          </div>

          {loading ? (
            <div style={styles.empty}>Cargando clientes...</div>
          ) : clientes.length === 0 ? (
            <div style={styles.empty}>No hay clientes guardados</div>
          ) : (
            clientes.map((cliente) => (
              <div key={cliente.id} style={styles.tableRow}>
                <span>{cliente.ccNit}</span>
                <span>{cliente.nombre}</span>
                <span>{cliente.correo}</span>
                <span>{cliente.telefono}</span>
                <span>{cliente.formaPago}</span>
              </div>
            ))
          )}
        </section>

        <section style={styles.formCard}>
          <h2 style={styles.formTitle}>Adicionar Cliente</h2>

          <form onSubmit={handleSubmit} style={styles.form}>
            <input
              name="ccNit"
              placeholder="CC/NIT"
              value={form.ccNit}
              onChange={handleChange}
              style={styles.input}
            />

            <input
              name="nombre"
              placeholder="Nombre Cliente"
              value={form.nombre}
              onChange={handleChange}
              style={styles.input}
            />

            <input
              name="correo"
              type="email"
              placeholder="Correo"
              value={form.correo}
              onChange={handleChange}
              style={styles.input}
            />

            <input
              name="telefono"
              placeholder="Teléfono"
              value={form.telefono}
              onChange={handleChange}
              style={styles.input}
            />

            <select
              name="formaPago"
              value={form.formaPago}
              onChange={handleChange}
              style={styles.input}
            >
              <option value="">Forma de pago</option>
              <option value="Efectivo">Efectivo</option>
              <option value="Transferencia">Transferencia</option>
              <option value="Crédito">Crédito</option>
            </select>

            <button type="submit" style={styles.saveButton} disabled={saving}>
              {saving ? "Guardando..." : "Guardar cliente"}
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
    alignItems: "center",
    marginBottom: "24px",
    flexWrap: "wrap",
    gap: "12px",
  },
  title: {
    margin: 0,
    fontSize: "32px",
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
    gridTemplateColumns: "1fr 1.3fr 1.4fr 1fr 1fr",
    gap: "10px",
    background: "#f5c400",
    padding: "14px",
    fontWeight: 700,
  },
  tableRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1.3fr 1.4fr 1fr 1fr",
    gap: "10px",
    padding: "12px 14px",
    borderTop: "1px solid #eee",
    background: "#fff",
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