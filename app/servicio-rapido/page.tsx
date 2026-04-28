"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

type Cliente = {
  id: number;
  nombre: string;
  ccNit: string;
  correo?: string;
  telefono?: string;
  formaPago?: string;
};

type Vehiculo = {
  id: number;
  placa: string;
  clienteId: number;
  tipoVehiculo?: string;
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

  const [nuevoClienteId, setNuevoClienteId] = useState("");
  const [nuevoTipoVehiculo, setNuevoTipoVehiculo] = useState("");
  const [creandoVehiculo, setCreandoVehiculo] = useState(false);

  const [mostrarClienteRapido, setMostrarClienteRapido] = useState(false);
  const [nuevoCcNit, setNuevoCcNit] = useState("");
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoTelefono, setNuevoTelefono] = useState("");
  const [nuevoCorreo, setNuevoCorreo] = useState("");
  const [nuevoFormaPago, setNuevoFormaPago] = useState("credito");
  const [creandoCliente, setCreandoCliente] = useState(false);

  const [centroOperacionId, setCentroOperacionId] = useState("");
  const [seccionId, setSeccionId] = useState("");
  const [tarifaId, setTarifaId] = useState("");
  const [busquedaTarifa, setBusquedaTarifa] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [tipoCarpa, setTipoCarpa] = useState("");
  const [formaPago, setFormaPago] = useState("credito");

  const [mensaje, setMensaje] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [ultimoServicioId, setUltimoServicioId] = useState<number | null>(null);

  const placaRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    cargarDatos();

    const centroGuardado = localStorage.getItem("centroOperacionId");
    const seccionGuardada = localStorage.getItem("seccionId");
    const formaPagoGuardada = localStorage.getItem("formaPago");

    if (centroGuardado) setCentroOperacionId(centroGuardado);
    if (seccionGuardada) setSeccionId(seccionGuardada);
    if (formaPagoGuardada) setFormaPago(formaPagoGuardada);
  }, []);

  const cargarDatos = async () => {
    const [a, b, c, d, e] = await Promise.all([
      fetch("/api/clientes", { cache: "no-store" }),
      fetch("/api/vehiculos", { cache: "no-store" }),
      fetch("/api/centros", { cache: "no-store" }),
      fetch("/api/secciones", { cache: "no-store" }),
      fetch("/api/tarifas", { cache: "no-store" }),
    ]);

    setClientes(await a.json());
    setVehiculos(await b.json());
    setCentros(await c.json());
    setSecciones(await d.json());
    setTarifas(await e.json());
  };

  useEffect(() => {
    if (!placa.trim()) {
      setVehiculoId("");
      setClienteId("");
      return;
    }

    const vehiculoEncontrado = vehiculos.find(
      (v) => v.placa.toUpperCase() === placa.toUpperCase()
    );

    if (vehiculoEncontrado) {
      setVehiculoId(String(vehiculoEncontrado.id));
      setClienteId(String(vehiculoEncontrado.clienteId));
      setMensaje("");
    } else {
      setVehiculoId("");
      setClienteId("");
    }
  }, [placa, vehiculos]);

  const cliente = clientes.find((c) => c.id === Number(clienteId));
  const tarifa = tarifas.find((t) => t.id === Number(tarifaId));
  const placaNoExiste = placa.trim().length >= 5 && !vehiculoId;

  const tarifasFiltradas = useMemo(() => {
    const texto = busquedaTarifa.trim().toLowerCase();

    if (!texto) return tarifas.slice(0, 6);

    return tarifas
      .filter(
        (t) =>
          t.codigo.toLowerCase().includes(texto) ||
          t.descripcion.toLowerCase().includes(texto)
      )
      .slice(0, 8);
  }, [busquedaTarifa, tarifas]);

  const seleccionarTarifa = (t: Tarifa) => {
    setTarifaId(String(t.id));
    setBusquedaTarifa(`${t.codigo} - ${t.descripcion}`);
  };

  const valorCarpa = () => {
    if (tipoCarpa === "Tracto Mula") return 46500;
    if (tipoCarpa === "Doble Troque") return 23150;
    if (tipoCarpa === "Sencillo") return 16950;
    return 0;
  };

  const subtotal =
    Number(tarifa?.valorUnitario || 0) * Number(cantidad || 0) + valorCarpa();

  const dinero = (valor: number) =>
    `$${Math.round(valor || 0).toLocaleString("es-CO")}`;

  const limpiarParaSiguiente = () => {
    setPlaca("");
    setClienteId("");
    setVehiculoId("");
    setTarifaId("");
    setBusquedaTarifa("");
    setCantidad("");
    setTipoCarpa("");
    setNuevoClienteId("");
    setNuevoTipoVehiculo("");
    setMostrarClienteRapido(false);

    setTimeout(() => {
      placaRef.current?.focus();
    }, 100);
  };

  const crearClienteRapido = async () => {
    setMensaje("");

    if (!nuevoCcNit || !nuevoNombre || !nuevoTelefono) {
      setMensaje("Completa CC/NIT, nombre y teléfono del cliente.");
      return;
    }

    setCreandoCliente(true);

    const res = await fetch("/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ccNit: nuevoCcNit,
        nombre: nuevoNombre,
        telefono: nuevoTelefono,
        correo: nuevoCorreo || "sin-correo@losercol.com",
        formaPago: nuevoFormaPago,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMensaje(data.error || "Error al crear cliente.");
      setCreandoCliente(false);
      return;
    }

    const nuevoCliente = data.cliente || data;

    setClientes((actual) => [...actual, nuevoCliente]);
    setNuevoClienteId(String(nuevoCliente.id));
    setNuevoCcNit("");
    setNuevoNombre("");
    setNuevoTelefono("");
    setNuevoCorreo("");
    setNuevoFormaPago("credito");
    setMostrarClienteRapido(false);
    setCreandoCliente(false);
    setMensaje("Cliente creado. Ahora crea el vehículo.");
  };

  const crearVehiculoRapido = async () => {
    setMensaje("");

    if (!placa.trim()) {
      setMensaje("Digita la placa.");
      return;
    }

    if (!nuevoClienteId || !nuevoTipoVehiculo) {
      setMensaje("Selecciona cliente y tipo de vehículo.");
      return;
    }

    setCreandoVehiculo(true);

    const res = await fetch("/api/vehiculos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        placa: placa.toUpperCase(),
        clienteId: nuevoClienteId,
        tipoVehiculo: nuevoTipoVehiculo,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMensaje(data.error || "Error al crear vehículo.");
      setCreandoVehiculo(false);
      return;
    }

    const nuevoVehiculo = data.vehiculo || data;

    setVehiculos((actual) => [...actual, nuevoVehiculo]);
    setVehiculoId(String(nuevoVehiculo.id));
    setClienteId(String(nuevoVehiculo.clienteId));
    setNuevoClienteId("");
    setNuevoTipoVehiculo("");
    setCreandoVehiculo(false);
    setMensaje("Vehículo creado. Continúa con el servicio.");
  };

  const guardar = async () => {
    setMensaje("");

    if (!placa.trim()) {
      setMensaje("Digita la placa del vehículo.");
      return;
    }

    if (!vehiculoId || !clienteId) {
      setMensaje("La placa no existe. Crea el vehículo rápido.");
      return;
    }

    if (!centroOperacionId || !seccionId || !tarifaId || !cantidad) {
      setMensaje("Completa todos los campos obligatorios.");
      return;
    }

    setGuardando(true);

    const res = await fetch("/api/servicios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clienteId,
        vehiculoId,
        centroOperacionId,
        seccionId,
        tarifaId,
        cantidad,
        tipoCarpa,
        formaPago,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMensaje(data.error || "Error al guardar servicio.");
      setGuardando(false);
      return;
    }

    setUltimoServicioId(data.id);
    setMensaje("Servicio guardado correctamente. Puedes registrar el siguiente.");
    setGuardando(false);
    limpiarParaSiguiente();
  };

  return (
    <main style={styles.page}>
      <div style={styles.topBar}>
        <div>
          <h1 style={styles.title}>Servicio rápido</h1>
          <p style={styles.subtitle}>Modo operación continua.</p>
        </div>

        <Link href="/" style={styles.backLink}>
          ← Volver al menú
        </Link>
      </div>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Datos del servicio</h2>

        {ultimoServicioId && (
          <div style={styles.lastServiceBox}>
            <span>Último servicio guardado correctamente.</span>
            <Link
              href={`/servicios/${ultimoServicioId}/soporte`}
              target="_blank"
              style={styles.supportLink}
            >
              Ver soporte
            </Link>
          </div>
        )}

        <div style={styles.grid}>
          <input
            ref={placaRef}
            value={placa}
            onChange={(e) => setPlaca(e.target.value.toUpperCase())}
            placeholder="Digite placa"
            style={styles.input}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") guardar();
            }}
          />

          <input
            value={cliente ? `${cliente.nombre} - ${cliente.ccNit}` : ""}
            placeholder="Cliente automático"
            style={styles.input}
            disabled
          />

          <select
            value={centroOperacionId}
            onChange={(e) => {
              setCentroOperacionId(e.target.value);
              localStorage.setItem("centroOperacionId", e.target.value);
            }}
            style={styles.input}
          >
            <option value="">Centro operativo</option>
            {centros.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>

          <select
            value={seccionId}
            onChange={(e) => {
              setSeccionId(e.target.value);
              localStorage.setItem("seccionId", e.target.value);
            }}
            style={styles.input}
          >
            <option value="">Sección</option>
            {secciones.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>

          <div style={styles.tarifaSearchBox}>
            <input
              value={busquedaTarifa}
              onChange={(e) => {
                setBusquedaTarifa(e.target.value);
                setTarifaId("");
              }}
              placeholder="Buscar servicio por código o descripción"
              style={styles.inputWide}
            />

            {busquedaTarifa && !tarifaId && (
              <div style={styles.tarifaResults}>
                {tarifasFiltradas.length === 0 ? (
                  <div style={styles.noResult}>
                    No hay tarifas con esa búsqueda
                  </div>
                ) : (
                  tarifasFiltradas.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => seleccionarTarifa(t)}
                      style={styles.tarifaOption}
                    >
                      <strong>
                        {t.codigo} - {t.descripcion}
                      </strong>
                      <span>{dinero(t.valorUnitario)}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <input
            type="number"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            placeholder="Cantidad / toneladas"
            style={styles.input}
            onKeyDown={(e) => {
              if (e.key === "Enter") guardar();
            }}
          />

          <select
            value={tipoCarpa}
            onChange={(e) => setTipoCarpa(e.target.value)}
            style={styles.input}
          >
            <option value="">Sin carpa</option>
            <option value="Tracto Mula">Carpa Tracto Mula</option>
            <option value="Doble Troque">Carpa Doble Troque</option>
            <option value="Sencillo">Carpa Sencillo</option>
          </select>

          <select
            value={formaPago}
            onChange={(e) => {
              setFormaPago(e.target.value);
              localStorage.setItem("formaPago", e.target.value);
            }}
            style={styles.input}
          >
            <option value="credito">Crédito</option>
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
          </select>
        </div>

        {placaNoExiste && (
          <div style={styles.quickVehicleBox}>
            <h3 style={styles.quickVehicleTitle}>
              Placa no encontrada: {placa}
            </h3>

            <div style={styles.grid}>
              <select
                value={nuevoClienteId}
                onChange={(e) => setNuevoClienteId(e.target.value)}
                style={styles.inputWide}
              >
                <option value="">Selecciona cliente para este vehículo</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} - {c.ccNit}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setMostrarClienteRapido(!mostrarClienteRapido)}
                type="button"
                style={styles.secondaryButton}
              >
                {mostrarClienteRapido
                  ? "Ocultar cliente rápido"
                  : "Crear cliente rápido"}
              </button>

              <select
                value={nuevoTipoVehiculo}
                onChange={(e) => setNuevoTipoVehiculo(e.target.value)}
                style={styles.input}
              >
                <option value="">Tipo vehículo</option>
                <option value="TM">TM - Tracto Mula</option>
                <option value="DT">DT - Doble Troque</option>
                <option value="SC">SC - Sencillo</option>
                <option value="TB">TB - Turbo</option>
              </select>

              <button
                onClick={crearVehiculoRapido}
                disabled={creandoVehiculo}
                type="button"
                style={styles.createVehicleButton}
              >
                {creandoVehiculo ? "Creando..." : "Crear vehículo rápido"}
              </button>
            </div>

            {mostrarClienteRapido && (
              <div style={styles.quickClientBox}>
                <h3 style={styles.quickVehicleTitle}>Crear cliente rápido</h3>

                <div style={styles.grid}>
                  <input
                    value={nuevoCcNit}
                    onChange={(e) => setNuevoCcNit(e.target.value)}
                    placeholder="CC / NIT"
                    style={styles.input}
                  />

                  <input
                    value={nuevoNombre}
                    onChange={(e) => setNuevoNombre(e.target.value)}
                    placeholder="Nombre cliente"
                    style={styles.input}
                  />

                  <input
                    value={nuevoTelefono}
                    onChange={(e) => setNuevoTelefono(e.target.value)}
                    placeholder="Teléfono"
                    style={styles.input}
                  />

                  <input
                    value={nuevoCorreo}
                    onChange={(e) => setNuevoCorreo(e.target.value)}
                    placeholder="Correo opcional"
                    style={styles.input}
                  />

                  <select
                    value={nuevoFormaPago}
                    onChange={(e) => setNuevoFormaPago(e.target.value)}
                    style={styles.input}
                  >
                    <option value="credito">Crédito</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                  </select>

                  <button
                    onClick={crearClienteRapido}
                    disabled={creandoCliente}
                    type="button"
                    style={styles.createClientButton}
                  >
                    {creandoCliente ? "Creando..." : "Crear cliente"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div style={styles.summary}>
          <div>
            <span style={styles.label}>Servicio seleccionado</span>
            <strong style={styles.summaryText}>
              {tarifa?.descripcion || "-"}
            </strong>
          </div>

          <div>
            <span style={styles.label}>Subtotal</span>
            <strong style={styles.total}>{dinero(subtotal)}</strong>
          </div>
        </div>

        <button
          onClick={guardar}
          disabled={guardando}
          style={styles.saveButton}
        >
          {guardando ? "Guardando..." : "Guardar y registrar otro"}
        </button>

        {mensaje && <p style={styles.message}>{mensaje}</p>}
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f2f2f2",
    padding: "30px",
    fontFamily: "Arial, sans-serif",
    color: "#111827",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "24px",
  },
  title: {
    margin: 0,
    fontSize: "38px",
    color: "#111827",
  },
  subtitle: {
    marginTop: "8px",
    color: "#4b5563",
    fontSize: "17px",
  },
  backLink: {
    background: "#fff",
    border: "1px solid #d1d5db",
    borderRadius: "10px",
    padding: "12px 16px",
    color: "#0b5cab",
    textDecoration: "none",
    fontWeight: 800,
  },
  card: {
    maxWidth: "1120px",
    margin: "0 auto",
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
  },
  sectionTitle: {
    margin: "0 0 18px",
    color: "#111827",
    fontSize: "22px",
  },
  lastServiceBox: {
    marginBottom: "18px",
    background: "#ecfdf5",
    border: "1px solid #86efac",
    borderRadius: "12px",
    padding: "14px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontWeight: 800,
    color: "#166534",
  },
  supportLink: {
    background: "#16a34a",
    color: "#fff",
    padding: "10px 14px",
    borderRadius: "10px",
    textDecoration: "none",
    fontWeight: 900,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "14px",
  },
  input: {
    height: "48px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    padding: "0 12px",
    background: "#fff",
    color: "#111827",
    fontSize: "15px",
  },
  inputWide: {
    width: "100%",
    height: "48px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    padding: "0 12px",
    background: "#fff",
    color: "#111827",
    fontSize: "15px",
  },
  tarifaSearchBox: {
    gridColumn: "span 2",
    position: "relative",
  },
  tarifaResults: {
    position: "absolute",
    top: "54px",
    left: 0,
    right: 0,
    background: "#fff",
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    boxShadow: "0 10px 24px rgba(0,0,0,0.14)",
    zIndex: 20,
    overflow: "hidden",
  },
  tarifaOption: {
    width: "100%",
    minHeight: "52px",
    padding: "10px 14px",
    background: "#fff",
    border: "none",
    borderBottom: "1px solid #e5e7eb",
    textAlign: "left",
    cursor: "pointer",
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    color: "#111827",
    fontSize: "14px",
  },
  noResult: {
    padding: "14px",
    color: "#b91c1c",
    fontWeight: 800,
  },
  quickVehicleBox: {
    marginTop: "22px",
    background: "#fff7d6",
    border: "1px solid #f5c400",
    borderRadius: "14px",
    padding: "18px",
  },
  quickClientBox: {
    marginTop: "18px",
    background: "#eef6ff",
    border: "1px solid #93c5fd",
    borderRadius: "14px",
    padding: "18px",
  },
  quickVehicleTitle: {
    margin: "0 0 14px",
    color: "#111827",
    fontSize: "18px",
  },
  secondaryButton: {
    height: "48px",
    background: "#0b5cab",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: "15px",
  },
  createVehicleButton: {
    height: "48px",
    background: "#111827",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: "15px",
  },
  createClientButton: {
    height: "48px",
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: "15px",
  },
  summary: {
    marginTop: "22px",
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "18px",
    display: "flex",
    justifyContent: "space-between",
    gap: "20px",
  },
  label: {
    display: "block",
    color: "#4b5563",
    fontWeight: 700,
    marginBottom: "8px",
  },
  summaryText: {
    color: "#111827",
    fontSize: "17px",
  },
  total: {
    color: "#111827",
    fontSize: "32px",
    fontWeight: 900,
  },
  saveButton: {
    marginTop: "22px",
    width: "100%",
    height: "56px",
    background: "#f5c400",
    color: "#111827",
    border: "none",
    borderRadius: "12px",
    fontWeight: 900,
    fontSize: "18px",
    cursor: "pointer",
  },
  message: {
    marginTop: "16px",
    color: "#b91c1c",
    fontWeight: 800,
  },
};