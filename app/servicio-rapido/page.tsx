"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Cliente = { id: number; nombre: string; ccNit: string };
type Vehiculo = { id: number; placa: string; clienteId: number };
type Centro = { id: number; nombre: string };
type Seccion = { id: number; nombre: string };
type Tarifa = {
  id: number;
  codigo: string;
  descripcion: string;
  valorUnitario: number;
};

export default function ServicioRapidoPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [centros, setCentros] = useState<Centro[]>([]);
  const [secciones, setSecciones] = useState<Seccion[]>([]);
  const [tarifas, setTarifas] = useState<Tarifa[]>([]);

  const [placa, setPlaca] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [vehiculoId, setVehiculoId] = useState("");

  const [centroOperacionId, setCentroOperacionId] = useState("");
  const [seccionId, setSeccionId] = useState("");
  const [tarifaId, setTarifaId] = useState("");
  const [busquedaTarifa, setBusquedaTarifa] = useState("");
  const [cantidad, setCantidad] = useState("");

  const [mensaje, setMensaje] = useState("");
  const [guardando, setGuardando] = useState(false);

  const placaRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    const [a, b, c, d, e] = await Promise.all([
      fetch("/api/clientes"),
      fetch("/api/vehiculos"),
      fetch("/api/centros"),
      fetch("/api/secciones"),
      fetch("/api/tarifas"),
    ]);

    setClientes(await a.json());
    setVehiculos(await b.json());
    setCentros(await c.json());
    setSecciones(await d.json());
    setTarifas(await e.json());
  };

  // 🔥 LOGICA CORRECTA (NO BLOQUEA CLIENTE)
  useEffect(() => {
    if (!placa.trim()) {
      setVehiculoId("");
      return;
    }

    const v = vehiculos.find(
      (x) => x.placa.toUpperCase() === placa.toUpperCase()
    );

    if (v) {
      setVehiculoId(String(v.id));
      setClienteId((prev) => prev || String(v.clienteId));
    } else {
      setVehiculoId("");
    }
  }, [placa, vehiculos]);

  const tarifa = tarifas.find((t) => t.id === Number(tarifaId));

  const tarifasFiltradas = useMemo(() => {
    const t = busquedaTarifa.toLowerCase();
    return tarifas.filter(
      (x) =>
        x.codigo.toLowerCase().includes(t) ||
        x.descripcion.toLowerCase().includes(t)
    );
  }, [busquedaTarifa, tarifas]);

  const subtotal =
    Number(tarifa?.valorUnitario || 0) * Number(cantidad || 0);

  const guardar = async () => {
    setMensaje("");

    if (!clienteId) return setMensaje("Selecciona cliente.");

    let vehiculoFinalId = vehiculoId;

    if (!vehiculoFinalId) {
      const resVehiculo = await fetch("/api/vehiculos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placa, clienteId }),
      });

      const nuevo = await resVehiculo.json();
      vehiculoFinalId = String(nuevo.id);
    }

    if (!centroOperacionId || !seccionId || !tarifaId || !cantidad) {
      return setMensaje("Completa todos los campos.");
    }

    setGuardando(true);

    const res = await fetch("/api/servicios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clienteId,
        vehiculoId: vehiculoFinalId,
        centroOperacionId,
        seccionId,
        tarifaId,
        cantidad,
      }),
    });

    if (!res.ok) {
      setMensaje("Error al guardar.");
      setGuardando(false);
      return;
    }

    setMensaje("Servicio guardado ✔");
    setGuardando(false);

    setPlaca("");
    setCantidad("");
    setTarifaId("");
    setBusquedaTarifa("");

    placaRef.current?.focus();
  };

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Servicio rápido</h1>

        <div style={styles.grid}>
          <input
            ref={placaRef}
            value={placa}
            onChange={(e) => setPlaca(e.target.value.toUpperCase())}
            placeholder="Placa"
            style={styles.input}
          />

          <select
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            style={styles.input}
          >
            <option value="">Cliente</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>

          <select
            value={centroOperacionId}
            onChange={(e) => setCentroOperacionId(e.target.value)}
            style={styles.input}
          >
            <option value="">Centro</option>
            {centros.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>

          <select
            value={seccionId}
            onChange={(e) => setSeccionId(e.target.value)}
            style={styles.input}
          >
            <option value="">Sección</option>
            {secciones.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </div>

        <input
          value={busquedaTarifa}
          onChange={(e) => setBusquedaTarifa(e.target.value)}
          placeholder="Buscar servicio"
          style={styles.input}
        />

        <div style={styles.tarifas}>
          {tarifasFiltradas.slice(0, 6).map((t) => (
            <button
              key={t.id}
              style={styles.tarifaBtn}
              onClick={() => {
                setTarifaId(String(t.id));
                setBusquedaTarifa(t.descripcion);
              }}
            >
              {t.codigo} - {t.descripcion}
            </button>
          ))}
        </div>

        <input
          type="number"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          placeholder="Cantidad"
          style={styles.input}
        />

        <div style={styles.total}>
          Subtotal: ${subtotal.toLocaleString("es-CO")}
        </div>

        <button onClick={guardar} style={styles.save}>
          {guardando ? "Guardando..." : "Guardar servicio"}
        </button>

        {mensaje && <p style={styles.msg}>{mensaje}</p>}
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f3f4f6",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: "900px",
    background: "#fff",
    padding: "30px",
    borderRadius: "16px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
  },
  title: {
    marginBottom: "20px",
    fontSize: "28px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(4,1fr)",
    gap: "10px",
    marginBottom: "15px",
  },
  input: {
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #ddd",
  },
  tarifas: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    marginBottom: "10px",
  },
  tarifaBtn: {
    padding: "8px 10px",
    background: "#eee",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
  },
  total: {
    marginTop: "10px",
    fontWeight: "bold",
  },
  save: {
    marginTop: "20px",
    width: "100%",
    padding: "14px",
    background: "#facc15",
    border: "none",
    borderRadius: "10px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  msg: {
    marginTop: "10px",
    fontWeight: "bold",
  },
};