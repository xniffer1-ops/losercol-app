"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type User = {
  id: number;
  nombre: string;
  email: string;
  rol: "admin" | "operador";
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
    cargarTodo();
  }, []);

  const cargarTodo = async () => {
    try {
      const [soportesRes, userRes] = await Promise.all([
        fetch("/api/soportes", { cache: "no-store" }),
        fetch("/api/me", { cache: "no-store" }),
      ]);

      const soportesData = await soportesRes.json();
      const userData = await userRes.json();

      setSoportes(Array.isArray(soportesData) ? soportesData : []);
      setUser(userData);
    } catch {
      setMensaje("Error cargando operación");
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
      facturados: soportes.filter((s) => s.estado === "facturado").length,
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

  return (
    <main style={styles.page}>
      <div style={styles.topBar}>
        <div>
          <h1 style={styles.title}>Operación en vivo</h1>
          <p style={styles.subtitle}>
            Control diario de vehículos, descargas y soportes.
          </p>

          {user && (
            <p style={styles.userText}>
              Usuario: <strong>{user.nombre}</strong> | Rol:{" "}
              <strong>{user.rol}</strong>
            </p>
          )}
        </div>

        <Link href="/" style={styles.backLink}>
          ← Volver al menú
        </Link>
      </div>

      <section style={styles.kpiGrid}>
        <Kpi title="Pendientes" value={resumen.pendientes} color="#f59e0b" />
        <Kpi title="En proceso" value={resumen.proceso} color="#2563eb" />
        <Kpi title="Terminados" value={resumen.terminados} color="#16a34a" />
        <Kpi title="Facturados" value={resumen.facturados} color="#6b7280" />
      </section>

      {mensaje && <p style={styles.message}>{mensaje}</p>}

      <section style={styles.tableCard}>
        <div style={styles.header}>
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
          <div style={styles.empty}>Cargando operación...</div>
        ) : soportes.length === 0 ? (
          <div style={styles.empty}>No hay soportes creados</div>
        ) : (
          soportes.map((s) => (
            <div key={s.id} style={styles.row}>
              <strong>{s.numero}</strong>

              <span>{s.vehiculo?.placa || "-"}</span>

              <span>{s.cliente?.nombre || "-"}</span>

              <span>
                {s.centroOperacion?.nombre || "-"} / {s.seccion?.nombre || "-"}
              </span>

              <strong>{totalCantidad(s).toLocaleString("es-CO")}</strong>

              <strong>{dinero(totalSoporte(s))}</strong>

              <span style={{ ...styles.estado, ...estadoStyle(s.estado) }}>
                {textoEstado(s.estado)}
              </span>

              <div style={styles.smallText}>
                <div>Inicio: {fecha(s.horaInicio)}</div>
                <div>Final: {fecha(s.horaFinal)}</div>
              </div>

              <div style={styles.actions}>
                {s.estado === "pendiente" && (
                  <button
                    style={styles.startButton}
                    onClick={() => cambiarEstado(s.id, "proceso")}
                  >
                    Iniciar
                  </button>
                )}

                {s.estado === "proceso" && (
                  <button
                    style={styles.finishButton}
                    onClick={() => cambiarEstado(s.id, "terminado")}
                  >
                    Terminar
                  </button>
                )}

                {user?.rol === "admin" && s.estado === "terminado" && (
                  <button
                    style={styles.billButton}
                    onClick={() => cambiarEstado(s.id, "facturado")}
                  >
                    Facturado
                  </button>
                )}

                {s.estado === "facturado" && (
                  <span style={styles.doneText}>Cerrado</span>
                )}
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
    <div style={styles.kpiCard}>
      <span style={styles.kpiLabel}>{title}</span>
      <strong style={{ ...styles.kpiValue, color }}>{value}</strong>
    </div>
  );
}

function textoEstado(estado: string) {
  if (estado === "pendiente") return "Pendiente";
  if (estado === "proceso") return "En proceso";
  if (estado === "terminado") return "Terminado";
  if (estado === "facturado") return "Facturado";
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
    marginBottom: "22px",
  },
  title: {
    margin: 0,
    fontSize: "38px",
    color: "#111",
  },
  subtitle: {
    marginTop: "8px",
    color: "#555",
    fontSize: "17px",
  },
  userText: {
    color: "#374151",
    fontSize: "14px",
    fontWeight: 500,
  },
  backLink: {
    background: "#fff",
    border: "1px solid #ccc",
    borderRadius: "10px",
    padding: "12px 16px",
    color: "#0b5cab",
    textDecoration: "none",
    fontWeight: 800,
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "16px",
    marginBottom: "22px",
  },
  kpiCard: {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "14px",
    padding: "20px",
    boxShadow: "0 3px 10px rgba(0,0,0,0.06)",
  },
  kpiLabel: {
    display: "block",
    color: "#555",
    fontSize: "14px",
    marginBottom: "8px",
    fontWeight: 700,
  },
  kpiValue: {
    display: "block",
    fontSize: "32px",
    fontWeight: 900,
  },
  tableCard: {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "14px",
    overflow: "hidden",
    boxShadow: "0 3px 10px rgba(0,0,0,0.06)",
  },
  header: {
    display: "grid",
    gridTemplateColumns: "1fr 0.8fr 1.4fr 1.5fr 0.8fr 1fr 1fr 1.7fr 1.2fr",
    gap: "10px",
    background: "#f5c400",
    padding: "14px",
    fontWeight: 900,
    color: "#111",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 0.8fr 1.4fr 1.5fr 0.8fr 1fr 1fr 1.7fr 1.2fr",
    gap: "10px",
    padding: "14px",
    borderTop: "1px solid #eee",
    alignItems: "center",
    color: "#111",
  },
  estado: {
    borderRadius: "999px",
    padding: "6px 10px",
    fontSize: "13px",
    fontWeight: 800,
    textAlign: "center",
  },
  smallText: {
    fontSize: "12px",
    color: "#555",
    lineHeight: 1.5,
  },
  actions: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
  },
  startButton: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "8px 10px",
    fontWeight: 800,
    cursor: "pointer",
  },
  finishButton: {
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "8px 10px",
    fontWeight: 800,
    cursor: "pointer",
  },
  billButton: {
    background: "#111827",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "8px 10px",
    fontWeight: 800,
    cursor: "pointer",
  },
  doneText: {
    color: "#555",
    fontWeight: 800,
    fontSize: "13px",
  },
  message: {
    color: "#b91c1c",
    fontWeight: 800,
    marginBottom: "16px",
  },
  empty: {
    padding: "20px",
    color: "#111",
  },
};