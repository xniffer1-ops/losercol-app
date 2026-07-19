"use client";

import { useEffect, useMemo, useState } from "react";

type Historial = {
  id: number;
  usuario: string;
  rol: string;
  accion: string;
  modulo: string;
  detalle: string;
  createdAt: string;
};

type FiltroTipo = "todos" | "servicios";

const EMAIL_OCULTO = "soporte@losercol.com";

function mostrarRolHistorial(rol: string) {
  return String(rol || "").toLowerCase() === "superadmin" ? "admin" : rol;
}

function fechaColombia(valor: string) {
  return new Date(valor).toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function limpiarTextoHistorial(texto: string) {
  return String(texto || "")
    .replace(/\s*-\s*Factura electrónica:\s*(sí|si|no)/gi, "")
    .replace(/\s*-\s*factura electrónica:\s*(sí|si|no)/gi, "")
    .replace(/\s*-\s*Factura electronica:\s*(sí|si|no)/gi, "")
    .trim();
}

export default function HistorialPage() {
  const [historial, setHistorial] = useState<Historial[]>([]);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [filtro, setFiltro] = useState<FiltroTipo>("todos");
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    void cargarHistorial();
  }, []);

  const cargarHistorial = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/historial", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        setMensaje(data.error || "Solo admin puede hacer esta acción");
        return;
      }

      const lista = Array.isArray(data) ? data : [];
      setHistorial(
        lista.filter(
          (item) =>
            String(item.usuario || "").trim().toLowerCase() !== EMAIL_OCULTO
        )
      );
    } catch {
      setMensaje("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const historialFiltrado = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return historial.filter((h) => {
      const modulo = String(h.modulo || "").toLowerCase();
      const detalle = String(h.detalle || "").toLowerCase();
      const usuario = String(h.usuario || "").toLowerCase();
      const rol = mostrarRolHistorial(String(h.rol || "")).toLowerCase();
      const accion = String(h.accion || "").toLowerCase();

      const coincideBusqueda =
        !texto ||
        modulo.includes(texto) ||
        detalle.includes(texto) ||
        usuario.includes(texto) ||
        rol.includes(texto) ||
        accion.includes(texto);

      if (filtro === "servicios") {
        return coincideBusqueda && modulo.includes("servicio");
      }

      return coincideBusqueda;
    });
  }, [historial, filtro, busqueda]);

  const totalServicios = historial.filter((h) =>
    String(h.modulo || "").toLowerCase().includes("servicio")
  ).length;

  return (
    <main className="losercol-page historial-page">
      <header className="losercol-page-header historial-header">
        <div>
          <span className="losercol-chip">Admin</span>
          <h1 className="losercol-title">Historial de acciones</h1>
          <p className="losercol-subtitle">
            Acciones recientes registradas en el sistema.
          </p>
        </div>
      </header>

      <section className="losercol-kpi-grid historial-kpis">
        <article className="losercol-kpi-card">
          <span>Total acciones</span>
          <strong>{historial.length}</strong>
        </article>

        <article className="losercol-kpi-card">
          <span>Acciones de servicios</span>
          <strong>{totalServicios}</strong>
        </article>
      </section>

      <section className="losercol-card historial-filtros">
        <div className="historial-filtro-botones">
          <button
            type="button"
            onClick={() => setFiltro("todos")}
            className={filtro === "todos" ? "losercol-pill activo" : "losercol-pill"}
          >
            Todos
          </button>

          <button
            type="button"
            onClick={() => setFiltro("servicios")}
            className={filtro === "servicios" ? "losercol-pill activo" : "losercol-pill"}
          >
            Servicios
          </button>
        </div>

        <input
          className="losercol-input"
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
          placeholder="Buscar por usuario, módulo, acción o detalle..."
        />
      </section>

      <section className="losercol-table-card historial-table-card">
        <div className="losercol-grid-header historial-grid">
          <span>Fecha</span>
          <span>Usuario</span>
          <span>Rol</span>
          <span>Acción</span>
          <span>Módulo</span>
          <span>Detalle</span>
        </div>

        {loading ? (
          <div className="losercol-empty">Cargando historial...</div>
        ) : mensaje ? (
          <div className="losercol-empty losercol-error">{mensaje}</div>
        ) : historialFiltrado.length === 0 ? (
          <div className="losercol-empty">No hay registros con este filtro.</div>
        ) : (
          historialFiltrado.map((h) => (
            <div key={h.id} className="losercol-grid-row historial-grid">
              <span data-label="Fecha">{fechaColombia(h.createdAt)}</span>
              <span data-label="Usuario">{h.usuario}</span>
              <span data-label="Rol">{mostrarRolHistorial(h.rol)}</span>
              <strong data-label="Acción">{h.accion}</strong>
              <span data-label="Módulo">{h.modulo}</span>
              <span data-label="Detalle">{limpiarTextoHistorial(h.detalle)}</span>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
