"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Cliente = {
  id: number;
  nombre: string;
  ccNit: string;
};

type Vehiculo = {
  id: number;
  placa: string;
  clienteId: number;
};

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
  const [tipoCarpa, setTipoCarpa] = useState("");
  const [formaPago, setFormaPago] = useState("credito");

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

  // 🔥 CLAVE: NO BLOQUEAR CLIENTE
  useEffect(() => {
    if (!placa.trim()) {
      setVehiculoId("");
      return;
    }

    const vehiculoEncontrado = vehiculos.find(
      (v) => v.placa.toUpperCase() === placa.toUpperCase()
    );

    if (vehiculoEncontrado) {
      setVehiculoId(String(vehiculoEncontrado.id));

      // SOLO SUGIERE, NO OBLIGA
      setClienteId((prev) =>
        prev ? prev : String(vehiculoEncontrado.clienteId)
      );
    } else {
      setVehiculoId("");
      // NO borra cliente → clave logística
    }
  }, [placa, vehiculos]);

  const tarifa = tarifas.find((t) => t.id === Number(tarifaId));

  const tarifasFiltradas = useMemo(() => {
    const texto = busquedaTarifa.toLowerCase();
    return tarifas.filter(
      (t) =>
        t.codigo.toLowerCase().includes(texto) ||
        t.descripcion.toLowerCase().includes(texto)
    );
  }, [busquedaTarifa, tarifas]);

  const subtotal =
    Number(tarifa?.valorUnitario || 0) * Number(cantidad || 0);

  const guardar = async () => {
    setMensaje("");

    if (!clienteId) {
      setMensaje("Selecciona cliente.");
      return;
    }

    // 🔥 AHORA PERMITE VEHÍCULO NUEVO
    let vehiculoFinalId = vehiculoId;

    if (!vehiculoFinalId) {
      const resVehiculo = await fetch("/api/vehiculos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placa,
          clienteId,
        }),
      });

      const nuevoVehiculo = await resVehiculo.json();
      vehiculoFinalId = String(nuevoVehiculo.id);
    }

    if (!centroOperacionId || !seccionId || !tarifaId || !cantidad) {
      setMensaje("Completa todos los campos.");
      return;
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
        tipoCarpa,
        formaPago,
      }),
    });

    if (!res.ok) {
      setMensaje("Error al guardar.");
      setGuardando(false);
      return;
    }

    setMensaje("Guardado correctamente.");
    setGuardando(false);

    setPlaca("");
    setCantidad("");
    setTarifaId("");
    setBusquedaTarifa("");

    placaRef.current?.focus();
  };

  return (
    <main style={styles.page}>
      <h1>Servicio rápido</h1>

      <input
        ref={placaRef}
        value={placa}
        onChange={(e) => setPlaca(e.target.value.toUpperCase())}
        placeholder="Placa"
        style={styles.input}
      />

      {/* 🔥 CLIENTE EDITABLE */}
      <select
        value={clienteId}
        onChange={(e) => setClienteId(e.target.value)}
        style={styles.input}
      >
        <option value="">Selecciona cliente (puedes cambiarlo)</option>
        {clientes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre} - {c.ccNit}
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

      <input
        value={busquedaTarifa}
        onChange={(e) => setBusquedaTarifa(e.target.value)}
        placeholder="Buscar servicio"
        style={styles.input}
      />

      {tarifasFiltradas.map((t) => (
        <button
          key={t.id}
          onClick={() => {
            setTarifaId(String(t.id));
            setBusquedaTarifa(t.descripcion);
          }}
        >
          {t.descripcion}
        </button>
      ))}

      <input
        type="number"
        value={cantidad}
        onChange={(e) => setCantidad(e.target.value)}
        placeholder="Cantidad"
        style={styles.input}
      />

      <button onClick={guardar} style={styles.button}>
        {guardando ? "Guardando..." : "Guardar"}
      </button>

      {mensaje && <p>{mensaje}</p>}
    </main>
  );
}

const styles = {
  page: {
    padding: "30px",
  },
  input: {
    display: "block",
    marginBottom: "10px",
    padding: "10px",
    width: "300px",
  },
  button: {
    padding: "12px",
    background: "gold",
    border: "none",
    cursor: "pointer",
  },
};