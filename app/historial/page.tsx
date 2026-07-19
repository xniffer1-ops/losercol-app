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

function mostrarRolHistorial(rol: string) {
  return String(rol || "").toLowerCase() === "superadmin" ? "admin" : rol;
}

export default function HistorialPage() {
  const [historial, setHistorial] = useState<Historial[]>([]);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [filtro, setFiltro] = useState<FiltroTipo>("todos");
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    cargarHistorial();
  }, []);

  const cargarHistorial = async () => {
    try {
      const res = await fetch("/api/historial", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        setMensaje(data.error || "Solo admin puede hacer esta acción");
        return;
      }

      setHistorial(Array.isArray(data) ? data : []);
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

      const esServicio = modulo.includes("servicio");
      const esFacturaElectronica = detalle.includes("factura electrónica");

      if (filtro === "servicios") {
        return coincideBusqueda && esServicio;
      }

      if (filtro === "factura") {
        return coincideBusqueda && esFacturaElectronica;
      }

      return coincideBusqueda;
    });
  }, [historial, filtro, busqueda]);

  const totalServicios = historial.filter((h) =>
    String(h.modulo || "").toLowerCase().includes("servicio")
  ).length;

  const totalFacturaElectronica = historial.filter((h) =>
    String(h.detalle || "").toLowerCase().includes("factura electrónica")
  ).length;

  return (
    <main style={styles.page}>
      <div style={styles.topBar}>
        <div>
          <span style={styles.badge}>Admin</span>
          <h1 style={styles.title}>Historial de acciones</h1>
          <p style={styles.subtitle}>
            Revisa cambios del sistema y controla las acciones realizadas en la aplicación.
          </p>
        </div>

      </div>

      <section style={styles.statsGrid}>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Total acciones</span>
          <strong style={styles.statValue}>{historial.length}</strong>
        </div>

        <div style={styles.statCard}>
          <span style={styles.statLabel}>Acciones de servicios</span>
          <strong style={styles.statValue}>{totalServicios}</strong>
        </div>

        <div style={styles.statCardDark}>
          <span style={styles.statLabelDark}>Factura electrónica</span>
          <strong style={styles.statValueDark}>{totalFacturaElectronica}</strong>
        </div>
      </section>

      <section style={styles.filtersCard}>
        <div style={styles.filtersRow}>
          <button
            type="button"
            onClick={() => setFiltro("todos")}
            style={filtro === "todos" ? styles.filterButtonActive : styles.filterButton}
          >
            Todos
          </button>

          <button
            type="button"
            onClick={() => setFiltro("servicios")}
            style={filtro === "servicios" ? styles.filterButtonActive : styles.filterButton}
          >
            Servicios
          </button>

          <button
            type="button"
            onClick={() => setFiltro("factura")}
            style={filtro === "factura" ? styles.filterButtonActive : styles.filterButton}
          >
            Factura electrónica
          </button>
        </div>

        <input
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
          placeholder="Buscar por usuario, módulo, acción o detalle..."
          style={styles.searchInput}
        />
      </section>

      <section style={styles.table}>
        <div style={styles.header}>
          <span>Fecha</span>
          <span>Usuario</span>
          <span>Rol</span>
          <span>Acción</span>
          <span>Módulo</span>
          <span>Factura electrónica</span>
          <span>Detalle</span>
        </div>

        {loading ? (
          <div style={styles.empty}>Cargando historial...</div>
        ) : mensaje ? (
          <div style={styles.error}>{mensaje}</div>
        ) : historialFiltrado.length === 0 ? (
          <div style={styles.empty}>No hay registros con este filtro</div>
        ) : (
          historialFiltrado.map((h) => {
            const detalle = String(h.detalle || "");
            const requiereFactura = detalle.toLowerCase().includes(
              "factura electrónica: sí"
            );

            const hablaDeFactura = detalle
              .toLowerCase()
              .includes("factura electrónica");

            return (
              <div key={h.id} style={styles.row}>
                <span>{new Date(h.createdAt).toLocaleString("es-CO")}</span>
                <span>{h.usuario}</span>
                <span>{mostrarRolHistorial(h.rol)}</span>
                <strong>{h.accion}</strong>
                <span>{h.modulo}</span>

                <span>
                  {hablaDeFactura ? (
                    <span
                      style={
                        requiereFactura
                          ? styles.facturaSi
                          : styles.facturaNo
                      }
                    >
                      {requiereFactura ? "Sí requiere" : "No requiere"}
                    </span>
                  ) : (
                    <span style={styles.noAplica}>No aplica</span>
                  )}
                </span>

                <span>{h.detalle}</span>
              </div>
            );
          })
        )}
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)",
    padding: "30px",
    fontFamily: "Arial, sans-serif",
    color: "#111827",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "18px",
    marginBottom: "24px",
    flexWrap: "wrap",
  },
  badge: {
    display: "inline-flex",
    padding: "6px 10px",
    borderRadius: "999px",
    background: "#fff7cc",
    color: "#7c5c00",
    fontSize: "12px",
    fontWeight: 900,
    textTransform: "uppercase",
    marginBottom: "10px",
  },
  title: {
    margin: 0,
    fontSize: "38px",
    color: "#0f172a",
  },
  subtitle: {
    marginTop: "8px",
    color: "#475569",
    fontSize: "17px",
  },
  backLink: {
    background: "#fff",
    border: "1px solid #d7dce4",
    borderRadius: "12px",
    padding: "12px 16px",
    color: "#0b5cab",
    textDecoration: "none",
    fontWeight: 900,
    boxShadow: "0 8px 18px rgba(15, 23, 42, 0.08)",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "14px",
    marginBottom: "18px",
  },
  statCard: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    padding: "18px",
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
  },
  statCardDark: {
    background: "#0f172a",
    border: "1px solid #0f172a",
    borderRadius: "16px",
    padding: "18px",
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.14)",
  },
  statLabel: {
    display: "block",
    color: "#64748b",
    fontSize: "14px",
    marginBottom: "6px",
  },
  statLabelDark: {
    display: "block",
    color: "#cbd5e1",
    fontSize: "14px",
    marginBottom: "6px",
  },
  statValue: {
    color: "#0f172a",
    fontSize: "30px",
  },
  statValueDark: {
    color: "#ffffff",
    fontSize: "30px",
  },
  filtersCard: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    padding: "16px",
    marginBottom: "18px",
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
  },
  filtersRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "12px",
  },
  filterButton: {
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#334155",
    borderRadius: "999px",
    padding: "10px 16px",
    fontWeight: 900,
    cursor: "pointer",
  },
  filterButtonActive: {
    border: "1px solid #0f172a",
    background: "#0f172a",
    color: "#ffffff",
    borderRadius: "999px",
    padding: "10px 16px",
    fontWeight: 900,
    cursor: "pointer",
  },
  searchInput: {
    width: "100%",
    minHeight: "48px",
    border: "1px solid #d7dce4",
    borderRadius: "12px",
    padding: "12px 14px",
    fontSize: "15px",
    outline: "none",
    boxSizing: "border-box",
  },
  table: {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "16px",
    overflow: "auto",
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
  },
  header: {
    minWidth: "1200px",
    display: "grid",
    gridTemplateColumns: "1.35fr 1.2fr 0.7fr 0.8fr 0.9fr 1.1fr 2.7fr",
    gap: "10px",
    background: "#f5c400",
    padding: "14px",
    fontWeight: 900,
    color: "#111",
  },
  row: {
    minWidth: "1200px",
    display: "grid",
    gridTemplateColumns: "1.35fr 1.2fr 0.7fr 0.8fr 0.9fr 1.1fr 2.7fr",
    gap: "10px",
    padding: "14px",
    borderTop: "1px solid #eee",
    alignItems: "center",
    color: "#111",
    fontSize: "14px",
  },
  facturaSi: {
    display: "inline-flex",
    padding: "6px 10px",
    borderRadius: "999px",
    background: "#dcfce7",
    color: "#166534",
    fontWeight: 900,
    fontSize: "13px",
  },
  facturaNo: {
    display: "inline-flex",
    padding: "6px 10px",
    borderRadius: "999px",
    background: "#f1f5f9",
    color: "#475569",
    fontWeight: 900,
    fontSize: "13px",
  },
  noAplica: {
    display: "inline-flex",
    padding: "6px 10px",
    borderRadius: "999px",
    background: "#f8fafc",
    color: "#94a3b8",
    fontWeight: 800,
    fontSize: "13px",
  },
  empty: {
    padding: "20px",
    color: "#111",
  },
  error: {
    padding: "20px",
    color: "#b91c1c",
    fontWeight: 900,
  },
};