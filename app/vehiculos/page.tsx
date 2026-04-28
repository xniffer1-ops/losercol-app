"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Cliente = {
  id: number;
  nombre: string;
  ccNit: string;
};

type Vehiculo = {
  id: number;
  placa: string;
  tipoVehiculo: string;
  clienteId: number;
  cliente: Cliente;
};

export default function VehiculosPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const [form, setForm] = useState({
    placa: "",
    tipoVehiculo: "",
    clienteId: "",
  });

  const cargarTodo = async () => {
    try {
      const [resClientes, resVehiculos] = await Promise.all([
        fetch("/api/clientes", { cache: "no-store" }),
        fetch("/api/vehiculos", { cache: "no-store" }),
      ]);

      const dataClientes = await resClientes.json();
      const dataVehiculos = await resVehiculos.json();

      setClientes(Array.isArray(dataClientes) ? dataClientes : []);
      setVehiculos(Array.isArray(dataVehiculos) ? dataVehiculos : []);
    } catch {
      setMensaje("No se pudieron cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarTodo();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje("");

    if (!form.placa.trim() || !form.tipoVehiculo.trim() || !form.clienteId) {
      setMensaje("Completa todos los campos");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch("/api/vehiculos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          placa: form.placa,
          tipoVehiculo: form.tipoVehiculo,
          clienteId: Number(form.clienteId),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMensaje(data.error || "Error al guardar vehículo");
        return;
      }

      setMensaje("Vehículo guardado correctamente");
      setForm({
        placa: "",
        tipoVehiculo: "",
        clienteId: "",
      });

      await cargarTodo();
    } catch {
      setMensaje("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main style={styles.page}>
      <div style={styles.topBar}>
        <h1 style={styles.title}>Vehículos</h1>
        <Link href="/" style={styles.backLink}>
          ← Volver al menú
        </Link>
      </div>

      <div style={styles.layout}>
        <section style={styles.tableSection}>
          <div style={styles.tableHeader}>
            <span>Placa</span>
            <span>Tipo de Vehículo</span>
            <span>Cliente</span>
            <span>CC/NIT</span>
          </div>

          {loading ? (
            <div style={styles.empty}>Cargando vehículos...</div>
          ) : vehiculos.length === 0 ? (
            <div style={styles.empty}>No hay vehículos guardados</div>
          ) : (
            vehiculos.map((vehiculo) => (
              <div key={vehiculo.id} style={styles.tableRow}>
                <span>{vehiculo.placa}</span>
                <span>{vehiculo.tipoVehiculo}</span>
                <span>{vehiculo.cliente?.nombre}</span>
                <span>{vehiculo.cliente?.ccNit}</span>
              </div>
            ))
          )}
        </section>

        <section style={styles.formCard}>
          <h2 style={styles.formTitle}>Adicionar Vehículo</h2>

          <form onSubmit={handleSubmit} style={styles.form}>
            <input
              name="placa"
              placeholder="Placa"
              value={form.placa}
              onChange={handleChange}
              style={styles.input}
            />

            <select
              name="tipoVehiculo"
              value={form.tipoVehiculo}
              onChange={handleChange}
              style={styles.input}
            >
              <option value="">Tipo de vehículo</option>
              <option value="TM">TM</option>
              <option value="SC">SC</option>
              <option value="DT">DT</option>
              <option value="TB">TB</option>
            </select>

            <select
              name="clienteId"
              value={form.clienteId}
              onChange={handleChange}
              style={styles.input}
            >
              <option value="">Selecciona cliente</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nombre} - {cliente.ccNit}
                </option>
              ))}
            </select>

            <button type="submit" style={styles.saveButton} disabled={saving}>
              {saving ? "Guardando..." : "Guardar vehículo"}
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
    gridTemplateColumns: "1fr 1fr 1.4fr 1fr",
    gap: "10px",
    background: "#f5c400",
    padding: "14px",
    fontWeight: 700,
  },
  tableRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1.4fr 1fr",
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