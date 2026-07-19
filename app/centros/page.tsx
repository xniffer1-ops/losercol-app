"use client";

import { useEffect, useState } from "react";

type Centro = {
  id: number;
  nombre: string;
  ciudad: string;
};

export default function CentrosPage() {
  const [centros, setCentros] = useState<Centro[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const [form, setForm] = useState({
    nombre: "",
    ciudad: "",
  });

  const cargarCentros = async () => {
    try {
      const res = await fetch("/api/centros", { cache: "no-store" });
      const data = await res.json();
      setCentros(Array.isArray(data) ? data : []);
    } catch {
      setMensaje("No se pudieron cargar los centros");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarCentros();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje("");

    if (!form.nombre.trim() || !form.ciudad.trim()) {
      setMensaje("Completa todos los campos");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch("/api/centros", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setMensaje(data.error || "Error al guardar centro");
        return;
      }

      setMensaje("Centro guardado correctamente");
      setForm({
        nombre: "",
        ciudad: "",
      });

      await cargarCentros();
    } catch {
      setMensaje("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main style={styles.page}>
      <div style={styles.topBar}>
        <h1 style={styles.title}>Centros de operación</h1>
      </div>

      <div style={styles.layout}>
        <section style={styles.tableSection}>
          <div style={styles.tableHeader}>
            <span>Nombre</span>
            <span>Ciudad</span>
          </div>

          {loading ? (
            <div style={styles.empty}>Cargando centros...</div>
          ) : centros.length === 0 ? (
            <div style={styles.empty}>No hay centros guardados</div>
          ) : (
            centros.map((centro) => (
              <div key={centro.id} style={styles.tableRow}>
                <span>{centro.nombre}</span>
                <span>{centro.ciudad}</span>
              </div>
            ))
          )}
        </section>

        <section style={styles.formCard}>
          <h2 style={styles.formTitle}>Adicionar Centro</h2>

          <form onSubmit={handleSubmit} style={styles.form}>
            <input
              name="nombre"
              placeholder="Nombre del centro"
              value={form.nombre}
              onChange={handleChange}
              style={styles.input}
            />

            <input
              name="ciudad"
              placeholder="Ciudad"
              value={form.ciudad}
              onChange={handleChange}
              style={styles.input}
            />

            <button type="submit" style={styles.saveButton} disabled={saving}>
              {saving ? "Guardando..." : "Guardar centro"}
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
    gridTemplateColumns: "1.5fr 1fr",
    gap: "10px",
    background: "#f5c400",
    padding: "14px",
    fontWeight: 700,
  },
  tableRow: {
    display: "grid",
    gridTemplateColumns: "1.5fr 1fr",
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