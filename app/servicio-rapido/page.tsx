"use client";

import { useEffect, useState } from "react";

export default function ServicioRapidoPage() {
  const [placa, setPlaca] = useState("");
  const [clientes, setClientes] = useState<any[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [centros, setCentros] = useState<any[]>([]);
  const [centroId, setCentroId] = useState("");
  const [secciones, setSecciones] = useState<any[]>([]);
  const [seccionId, setSeccionId] = useState("");
  const [tarifas, setTarifas] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [tarifaSeleccionada, setTarifaSeleccionada] = useState<any>(null);
  const [cantidad, setCantidad] = useState("");

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    const [resClientes, resCentros, resSecciones, resTarifas] =
      await Promise.all([
        fetch("/api/clientes"),
        fetch("/api/centros"),
        fetch("/api/secciones"),
        fetch("/api/tarifas"),
      ]);

    setClientes(await resClientes.json());
    setCentros(await resCentros.json());
    setSecciones(await resSecciones.json());
    setTarifas(await resTarifas.json());
  };

  const tarifasFiltradas = tarifas.filter((t) =>
    t.descripcion.toLowerCase().includes(busqueda.toLowerCase())
  );

  const guardar = async () => {
    if (!placa || !clienteId || !centroId || !seccionId || !tarifaSeleccionada) {
      alert("Completa todos los campos");
      return;
    }

    await fetch("/api/servicios", {
      method: "POST",
      body: JSON.stringify({
        placa,
        clienteId,
        centroId,
        seccionId,
        tarifaId: tarifaSeleccionada.id,
        cantidad: Number(cantidad),
      }),
    });

    alert("Servicio guardado");

    setTarifaSeleccionada(null);
    setCantidad("");
    setBusqueda("");
  };

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <h1 style={styles.title}>Servicio rápido</h1>

        <div style={styles.grid}>
          <input
            placeholder="Placa"
            value={placa}
            onChange={(e) => setPlaca(e.target.value)}
            style={styles.input}
          />

          <select
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            style={styles.input}
          >
            <option value="">Selecciona cliente</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>

          <select
            value={centroId}
            onChange={(e) => setCentroId(e.target.value)}
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
          placeholder="Buscar servicio..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ ...styles.input, marginTop: 12 }}
        />

        <div style={styles.tarifas}>
          {tarifasFiltradas.slice(0, 6).map((t) => (
            <button
              key={t.id}
              onClick={() => setTarifaSeleccionada(t)}
              style={{
                ...styles.tarifaBtn,
                background:
                  tarifaSeleccionada?.id === t.id ? "#facc15" : "#fff",
              }}
            >
              {t.descripcion}
            </button>
          ))}
        </div>

        {tarifaSeleccionada && (
          <div style={styles.selected}>
            <strong>{tarifaSeleccionada.descripcion}</strong>
          </div>
        )}

        <input
          placeholder="Cantidad"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          style={{ ...styles.input, marginTop: 12 }}
        />

        <button style={styles.button} onClick={guardar}>
          Guardar
        </button>
      </section>
    </main>
  );
}

/* ================== ESTILOS ================== */

const styles: any = {
  page: {
    minHeight: "100vh",
    background: "#f3f4f6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    background: "#fff",
    padding: "30px",
    borderRadius: "16px",
    width: "100%",
    maxWidth: "700px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
  },
  title: {
    fontSize: "28px",
    marginBottom: "20px",
    fontWeight: "bold",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },
  input: {
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #ddd",
    fontSize: "14px",
  },
  tarifas: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap" as const,
    marginTop: "12px",
  },
  tarifaBtn: {
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    cursor: "pointer",
  },
  selected: {
    marginTop: "10px",
    padding: "10px",
    background: "#f9fafb",
    borderRadius: "8px",
  },
  button: {
    marginTop: "20px",
    width: "100%",
    padding: "14px",
    background: "#facc15",
    border: "none",
    borderRadius: "10px",
    fontWeight: "bold",
    cursor: "pointer",
  },
};