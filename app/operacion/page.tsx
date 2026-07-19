"use client";

import { useEffect, useMemo, useState } from "react";

type User = {
  id: number;
  nombre: string;
  email: string;
  rol: "admin" | "superadmin" | "auxiliar" | "operador";
} | null;

type Servicio = {
  id: number;
  descripcion: string;
  cantidad: number;
  subtotal: number;
  tipoCarpa?: string | null;
};

type Soporte = {
  id: number;
  numero: string;
  estado: "pendiente" | "proceso" | "terminado" | "facturado";
  createdAt: string;
  horaInicio?: string | null;
  horaFinal?: string | null;
  cliente?: {
    nombre: string;
    ccNit: string;
  };
  vehiculo?: {
    placa: string;
  };
  centroOperacion?: {
    nombre: string;
  };
  seccion?: {
    nombre: string;
  };
  servicios?: Servicio[];
};

export default function OperacionPage() {
  const [soportes, setSoportes] = useState<Soporte[]>([]);
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    void cargarTodo();
  }, []);

  const cargarTodo = async () => {
    try {
      setLoading(true);
      const [soportesRes, userRes] = await Promise.all([
        fetch("/api/soportes", { cache: "no-store" }),
        fetch("/api/me", { cache: "no-store" }),
      ]);

      const soportesData = await soportesRes.json();
      const userData = await userRes.json();

      if (!soportesRes.ok) {
        setMensaje(soportesData.error || "No se pudo cargar la operación.");
        setSoportes([]);
      } else {
        setSoportes(Array.isArray(soportesData) ? soportesData : []);
      }

      setUser(userData);
    } catch {
      setMensaje("Error cargando operación.");
    } finally {
      setLoading(false);
    }
  };

  const cambiarEstado = async (id: number, estado: Soporte["estado"]) => {
    setMensaje("");

    const res = await fetch(`/api/soportes/${id}/estado`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ estado }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Error actualizando estado");
      return;
    }

    setSoportes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...data } : s))
    );
  };

  const resumen = useMemo(() => {
    return {
      pendientes: soportes.filter((s) => s.estado === "pendiente").length,
      proceso: soportes.filter((s) => s.estado === "proceso").length,
      terminados: soportes.filter((s) => s.estado === "terminado").length,
      cerrados: soportes.filter((s) => s.estado === "facturado").length,
    };
  }, [soportes]);

  const dinero = (valor: number) =>
    `$${Math.round(valor || 0).toLocaleString("es-CO")}`;

  const totalSoporte = (s: Soporte) =>
    s.servicios?.reduce((acc, item) => acc + Number(item.subtotal || 0), 0) ||
    0;

  const totalCantidad = (s: Soporte) =>
    s.servicios?.reduce((acc, item) => acc + Number(item.cantidad || 0), 0) ||
    0;

  const fecha = (valor?: string | null) => {
    if (!valor) return "-";
    return new Date(valor).toLocaleString("es-CO");
  };

  const esAdmin = user?.rol === "admin" || user?.rol === "superadmin";

  return (
    <main className="losercol-page">
      <header className="losercol-page-header">
        <div>
          <h1 className="losercol-title">Estado de operación</h1>
          <p className="losercol-subtitle">
            Vista opcional para controlar soportes por estados: pendiente, en proceso, terminado y cerrado.
          </p>

          {user && (
            <p style={styles.userText}>
              Usuario: <strong>{user.nombre}</strong> | Rol: <strong>{user.rol}</strong>
            </p>
          )}
        </div>
      </header>

      <section style={styles.infoCard}>
        <strong>¿Para qué sirve?</strong>
        <span>
          Esta pantalla sirve cuando necesitas hacer seguimiento de una operación antes de cerrarla.
          Si solo estás creando soportes rápidos, puedes trabajar normalmente desde Servicio rápido o Servicios.
        </span>
      </section>

      <section style={styles.kpiGrid}>
        <Kpi title="Pendientes" value={resumen.pendientes} color="#f59e0b" />
        <Kpi title="En proceso" value={resumen.proceso} color="#2563eb" />
        <Kpi title="Terminados" value={resumen.terminados} color="#16a34a" />
        <Kpi title="Cerrados" value={resumen.cerrados} color="#6b7280" />
      </section>

      {mensaje && <p style={styles.message}>{mensaje}</p>}

      <section className="losercol-table-card">
        <div className="losercol-grid-header" style={styles.headerGrid} data-los-grid-header>
          <span>Soporte</span>
          <span>Placa</span>
          <span>Cliente</span>
          <span>Centro / Sección</span>
          <span>Cantidad</span>
          <span>Total</span>
          <span>Estado</span>
          <span>Horas</span>
          <span>Acciones</span>
        </div>

        {loading ? (
          <div className="losercol-empty">Cargando operación...</div>
        ) : soportes.length === 0 ? (
          <div className="losercol-empty">
            No hay soportes con seguimiento por estados. Puedes seguir usando Servicio rápido y Servicios sin problema.
          </div>
        ) : (
          soportes.map((s) => (
            <div key={s.id} className="losercol-grid-row" style={styles.rowGrid} data-los-grid-row>
              <strong data-label="Soporte">{s.numero}</strong>
              <span data-label="Placa">{s.vehiculo?.placa || "-"}</span>
              <span data-label="Cliente">{s.cliente?.nombre || "-"}</span>
              <span data-label="Centro / Sección">
                {s.centroOperacion?.nombre || "-"} / {s.seccion?.nombre || "-"}
              </span>
              <span data-label="Cantidad">{totalCantidad(s)}</span>
              <strong data-label="Total">{dinero(totalSoporte(s))}</strong>
              <span data-label="Estado">
                <span style={{ ...styles.badge, ...estadoStyle(s.estado) }}>
                  {textoEstado(s.estado)}
                </span>
              </span>
              <span data-label="Horas" style={styles.timeText}>
                Inicio: {fecha(s.horaInicio)}
                <br />
                Fin: {fecha(s.horaFinal)}
              </span>
              <div data-label="Acciones" style={styles.actions}>
                {s.estado === "pendiente" && (
                  <button
                    type="button"
                    style={styles.startButton}
                    onClick={() => cambiarEstado(s.id, "proceso")}
                  >
                    Iniciar
                  </button>
                )}

                {s.estado === "proceso" && (
                  <button
                    type="button"
                    style={styles.finishButton}
                    onClick={() => cambiarEstado(s.id, "terminado")}
                  >
                    Terminar
                  </button>
                )}

                {esAdmin && s.estado === "terminado" && (
                  <button
                    type="button"
                    style={styles.closeButton}
                    onClick={() => cambiarEstado(s.id, "facturado")}
                  >
                    Cerrar
                  </button>
                )}

                {s.estado === "facturado" && <span style={styles.doneText}>Cerrado</span>}
              </div>
            </div>
          ))
        )}
      </section>
    </main>
  );
}

function Kpi({
  title,
  value,
  color,
}: {
  title: string;
  value: number;
  color: string;
}) {
  return (
    <div className="losercol-card" style={styles.kpiCard}>
      <span style={styles.kpiLabel}>{title}</span>
      <strong style={{ ...styles.kpiValue, color }}>{value}</strong>
    </div>
  );
}

function textoEstado(estado: string) {
  if (estado === "pendiente") return "Pendiente";
  if (estado === "proceso") return "En proceso";
  if (estado === "terminado") return "Terminado";
  if (estado === "facturado") return "Cerrado";
  return estado;
}

function estadoStyle(estado: string): React.CSSProperties {
  if (estado === "pendiente") {
    return { background: "#fef3c7", color: "#92400e" };
  }

  if (estado === "proceso") {
    return { background: "#dbeafe", color: "#1d4ed8" };
  }

  if (estado === "terminado") {
    return { background: "#dcfce7", color: "#166534" };
  }

  return { background: "#e5e7eb", color: "#374151" };
}

const styles: Record<string, React.CSSProperties> = {
  userText: {
    marginTop: 10,
    color: "#334155",
    fontSize: 14,
  },
  infoCard: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
    marginBottom: 18,
    padding: 15,
    borderRadius: 16,
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
    color: "#0f172a",
    lineHeight: 1.45,
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(160px, 1fr))",
    gap: 14,
    marginBottom: 20,
  },
  kpiCard: {
    padding: 18,
    minHeight: 98,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: 8,
  },
  kpiLabel: {
    color: "#334155",
    fontSize: 14,
    fontWeight: 800,
  },
  kpiValue: {
    fontSize: 32,
    lineHeight: 1,
    fontWeight: 900,
  },
  message: {
    color: "#b91c1c",
    fontWeight: 800,
  },
  headerGrid: {
    gridTemplateColumns: "1fr 0.8fr 1.3fr 1.4fr 0.8fr 0.9fr 0.9fr 1.5fr 1fr",
  },
  rowGrid: {
    gridTemplateColumns: "1fr 0.8fr 1.3fr 1.4fr 0.8fr 0.9fr 0.9fr 1.5fr 1fr",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "nowrap",
  },
  timeText: {
    color: "#475569",
    fontSize: 12,
    lineHeight: 1.4,
  },
  actions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  startButton: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "8px 10px",
    fontWeight: 900,
    cursor: "pointer",
  },
  finishButton: {
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "8px 10px",
    fontWeight: 900,
    cursor: "pointer",
  },
  closeButton: {
    background: "#0f172a",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "8px 10px",
    fontWeight: 900,
    cursor: "pointer",
  },
  doneText: {
    color: "#64748b",
    fontWeight: 900,
  },
};
