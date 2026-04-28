"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Tarifa = {
  id: number;
  codigo: string;
  descripcion: string;
  valorUnitario: number;
  unidadMedida: string;
  presentacion: string;
  categoria: string;
  createdAt?: string;
};

const initialForm = {
  codigo: "",
  descripcion: "",
  valorUnitario: "",
  unidadMedida: "",
  presentacion: "",
  categoria: "",
};

export default function TarifasPage() {
  const [tarifas, setTarifas] = useState<Tarifa[]>([]);
  const [form, setForm] = useState(initialForm);
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const cargarTarifas = async () => {
    try {
      const res = await fetch("/api/tarifas", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        setMensaje(data.error || "Error al cargar tarifas");
        setTarifas([]);
        return;
      }

      setTarifas(Array.isArray(data) ? data : []);
    } catch {
      setMensaje("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarTarifas();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: name === "codigo" ? value.toUpperCase() : value,
    }));
  };

  const guardarTarifa = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje("");

    if (
      !form.codigo.trim() ||
      !form.descripcion.trim() ||
      !form.valorUnitario ||
      !form.unidadMedida.trim() ||
      !form.presentacion.trim() ||
      !form.categoria.trim()
    ) {
      setMensaje("Completa todos los campos");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch("/api/tarifas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          valorUnitario: Number(form.valorUnitario),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMensaje(data.error || "Error al guardar tarifa");
        return;
      }

      setMensaje("Tarifa creada correctamente");
      setForm(initialForm);
      await cargarTarifas();
    } catch {
      setMensaje("Error de conexión al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main style={styles.page}>
      <div style={styles.topBar}>
        <div>
          <h1 style={styles.title}>Tarifas</h1>
          <p style={styles.subtitle}>Gestión de valores de servicios</p>
        </div>

        <Link href="/" style={styles.backLink}>
          ← Volver al menú
        </Link>
      </div>

      <div style={styles.layout}>
        <section style={styles.tableSection}>
          <div style={styles.tableHeader}>
            <span>ID</span>
            <span>Descripción</span>
            <span>Valor Unitario</span>
            <span>Unidad Medida</span>
            <span>Presentación</span>
            <span>Categoría</span>
          </div>

          {loading ? (
            <div style={styles.empty}>Cargando tarifas...</div>
          ) : tarifas.length === 0 ? (
            <div style={styles.empty}>No hay tarifas registradas</div>
          ) : (
            tarifas.map((t) => (
              <div key={t.id} style={styles.tableRow}>
                <span>{t.codigo}</span>
                <span>{t.descripcion}</span>
                <span>${t.valorUnitario.toLocaleString("es-CO")}</span>
                <span>{t.unidadMedida}</span>
                <span>{t.presentacion}</span>
                <span>{t.categoria}</span>
              </div>
            ))
          )}
        </section>

        <section style={styles.formCard}>
          <h2 style={styles.formTitle}>Adicionar Tarifa</h2>

          <form onSubmit={guardarTarifa} style={styles.form}>
            <input
              name="codigo"
              placeholder="ID Ej: LS001"
              value={form.codigo}
              onChange={handleChange}
              style={styles.input}
            />

            <input
              name="descripcion"
              placeholder="Descripción"
              value={form.descripcion}
              onChange={handleChange}
              style={styles.input}
            />

            <input
              name="valorUnitario"
              type="number"
              placeholder="Valor unitario"
              value={form.valorUnitario}
              onChange={handleChange}
              style={styles.input}
            />

            <select
              name="unidadMedida"
              value={form.unidadMedida}
              onChange={handleChange}
              style={styles.input}
            >
                <option value="">Unidad Medida</option>
                <option value="Tonelada">Tonelada</option>
                <option value="Hora Hombre">Hora Hombre</option>
                <option value="Unidad">Unidad</option>
                <option value="Vehículo">Vehículo</option>
            </select>

            <select
              name="presentacion"
              value={form.presentacion}
              onChange={handleChange}
              style={styles.input}
            >
                <option value="">Presentación</option>
                <option value="Bulto">Bulto</option>
                <option value="Granel">Granel</option>
                <option value="Hombre">Hombre</option>
                <option value="Pacas - Rollos">Pacas - Rollos</option>
                <option value="Tracto Mula">Tracto Mula</option>
                <option value="Doble Troque">Doble Troque</option>
                <option value="Sencillo">Sencillo</option>
                <option value="Carpa">Carpa</option>
                <option value="Estiba">Estiba</option>
                <option value="Vehículo">Vehículo</option>
            </select>

            <select
              name="categoria"
              value={form.categoria}
              onChange={handleChange}
              style={styles.input}
            >
              <option value="">Categoría</option>
              <option value="Descargue">Descargue</option>
              <option value="Cargue">Cargue</option>
              <option value="Servicio">Servicio</option>
              <option value="Movimientos">Movimientos</option>
            </select>

            <button type="submit" style={styles.saveButton} disabled={saving}>
              {saving ? "Guardando..." : "Guardar tarifa"}
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
    gridTemplateColumns: "0.8fr 1.7fr 1fr 1fr 1fr 1fr",
    gap: "10px",
    background: "#f5c400",
    padding: "14px",
    fontWeight: 700,
  },
  tableRow: {
    display: "grid",
    gridTemplateColumns: "0.8fr 1.7fr 1fr 1fr 1fr 1fr",
    gap: "10px",
    padding: "12px 14px",
    borderTop: "1px solid #eee",
    alignItems: "center",
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