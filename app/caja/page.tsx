"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ServicioCaja = {
  id: number;
  numeroSoporte?: string | null;
  cliente: string;
  placa: string;
  servicio: string;
  formaPago: string;
  subtotal: number;
  totalNeto?: number;
  createdAt: string;
};

type Cierre = {
  id: number;
  fecha: string;
  usuario: string;
  total: number;
};

type CajaData = {
  fecha: string;
  usuario: string;
  cerrado: boolean;
  esAdmin?: boolean;
  cierresDelDia?: Cierre[];
  resumen: {
    efectivo: number;
    transferencia: number;
    credito: number;
    total: number;
    cantidadServicios: number;
  };
  servicios: ServicioCaja[];
};

export default function CajaPage() {
  const [data, setData] = useState<CajaData | null>(null);
  const [fecha, setFecha] = useState("");
  const [loading, setLoading] = useState(true);
  const [cerrando, setCerrando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    void cargarCaja();
  }, []);

  const leerJsonSeguro = async (res: Response) => {
    try {
      return await res.json();
    } catch {
      return null;
    }
  };

  const cargarCaja = async (fechaElegida?: string) => {
    setLoading(true);
    setMensaje("");

    try {
      const url = fechaElegida ? `/api/caja?fecha=${fechaElegida}` : "/api/caja";

      const res = await fetch(url, { cache: "no-store" });
      const json = await leerJsonSeguro(res);

      if (!res.ok) {
        setData(null);
        setMensaje(
          json?.error ||
            "No fue posible cargar la caja. Verifica que tengas sesión iniciada."
        );
        setLoading(false);
        return;
      }

      setData(json);
      setFecha(json.fecha || fechaElegida || "");
      setLoading(false);
    } catch {
      setData(null);
      setMensaje("Error de conexión cargando caja.");
      setLoading(false);
    }
  };

  const cerrarCaja = async () => {
    if (!data) return;

    if (data.cerrado) {
      alert("Esta caja ya está cerrada");
      return;
    }

    const ok = confirm(`¿Seguro deseas cerrar la caja del día ${data.fecha}?`);
    if (!ok) return;

    setCerrando(true);
    setMensaje("");

    try {
      const res = await fetch("/api/caja/cerrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha: data.fecha }),
      });

      const json = await leerJsonSeguro(res);

      if (!res.ok) {
        alert(json?.error || "Error cerrando caja");
        setCerrando(false);
        return;
      }

      alert("Caja cerrada correctamente");
      await cargarCaja(data.fecha);
      setCerrando(false);
    } catch {
      alert("Error de conexión cerrando caja");
      setCerrando(false);
    }
  };

  const abrirCaja = async (id: number) => {
    const ok = confirm("¿Seguro deseas abrir nuevamente esta caja?");
    if (!ok) return;

    setMensaje("");

    try {
      const res = await fetch("/api/caja/cerrar", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const json = await leerJsonSeguro(res);

      if (!res.ok) {
        alert(json?.error || "Error abriendo caja");
        return;
      }

      alert("Caja abierta nuevamente");
      await cargarCaja(data?.fecha);
    } catch {
      alert("Error de conexión abriendo caja");
    }
  };

  const dinero = (valor: number) =>
    `$${Math.round(valor || 0).toLocaleString("es-CO")}`;

  const normalizarPago = (formaPago: string) => {
    const pago = String(formaPago || "").toLowerCase().trim();

    if (pago === "credito") return "Crédito";
    if (pago === "efectivo") return "Efectivo";
    if (pago === "transferencia") return "Transferencia";

    return formaPago || "-";
  };

  return (
    <main style={styles.page}>
      <div style={styles.topBar}>
        <div>
          <h1 style={styles.title}>Cierre de caja</h1>
          <p style={styles.subtitle}>
            Cuadre diario por efectivo, transferencia y crédito.
          </p>
        </div>

        <Link href="/" style={styles.backLink}>
          ← Volver al menú
        </Link>
      </div>

      <section style={styles.filterCard}>
        <div>
          <label style={styles.label}>Fecha</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => {
              setFecha(e.target.value);
              void cargarCaja(e.target.value);
            }}
            style={styles.input}
          />
        </div>

        <button
          onClick={() => void cerrarCaja()}
          style={data?.cerrado ? styles.closedButton : styles.closeButton}
          disabled={cerrando || loading || data?.cerrado || !data}
        >
          {data?.cerrado
            ? "Caja cerrada"
            : cerrando
            ? "Cerrando..."
            : "Cerrar caja"}
        </button>
      </section>

      {mensaje && <p style={styles.error}>{mensaje}</p>}

      {loading ? (
        <section style={styles.card}>Cargando caja...</section>
      ) : data ? (
        <>
          <section style={styles.kpiGrid}>
            <Card title="Total caja" value={dinero(data.resumen.total)} />
            <Card title="Efectivo" value={dinero(data.resumen.efectivo)} />
            <Card
              title="Transferencia"
              value={dinero(data.resumen.transferencia)}
            />
            <Card title="Crédito" value={dinero(data.resumen.credito)} />
            <Card title="Servicios" value={data.resumen.cantidadServicios} />
          </section>

          <section style={styles.statusCard}>
            <strong>Estado:</strong>
            <span style={data.cerrado ? styles.statusClosed : styles.statusOpen}>
              {data.cerrado ? "CERRADA" : "ABIERTA"}
            </span>
            <span style={styles.userText}>Usuario actual: {data.usuario}</span>
          </section>

          {data.esAdmin && data.cierresDelDia && data.cierresDelDia.length > 0 && (
            <section style={styles.closuresCard}>
              <h3 style={styles.closuresTitle}>Cierres del día</h3>

              {data.cierresDelDia.map((c) => (
                <div key={c.id} style={styles.rowCierre}>
                  <span>
                    <strong>Usuario:</strong> {c.usuario}
                  </span>

                  <strong>{dinero(c.total)}</strong>

                  <button
                    onClick={() => void abrirCaja(c.id)}
                    style={styles.reopenButton}
                  >
                    Abrir caja
                  </button>
                </div>
              ))}
            </section>
          )}

          <section style={styles.tableCard}>
            <div style={styles.header}>
              <span>Soporte</span>
              <span>Hora</span>
              <span>Cliente</span>
              <span>Placa</span>
              <span>Servicio</span>
              <span>Pago</span>
              <span>Total</span>
            </div>

            {data.servicios.length === 0 ? (
              <div style={styles.empty}>No hay servicios en esta fecha</div>
            ) : (
              data.servicios.map((s) => {
                const totalMostrar =
                  typeof s.totalNeto === "number" && s.totalNeto > 0
                    ? s.totalNeto
                    : s.subtotal;

                return (
                  <div key={s.id} style={styles.row}>
                    <strong>{s.numeroSoporte || `SP-${s.id}`}</strong>
                    <span>
                      {new Date(s.createdAt).toLocaleTimeString("es-CO", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span>{s.cliente}</span>
                    <span>{s.placa}</span>
                    <span>{s.servicio}</span>
                    <span style={styles.payment}>
                      {normalizarPago(s.formaPago)}
                    </span>
                    <strong>{dinero(totalMostrar)}</strong>
                  </div>
                );
              })
            )}
          </section>
        </>
      ) : (
        <section style={styles.card}>
          No fue posible mostrar la caja. Vuelve al menú e intenta ingresar de
          nuevo.
        </section>
      )}
    </main>
  );
}

function Card({ title, value }: { title: string; value: string | number }) {
  return (
    <div style={styles.card}>
      <span style={styles.cardTitle}>{title}</span>
      <strong style={styles.cardValue}>{value}</strong>
    </div>
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
    marginBottom: "22px",
  },
  title: {
    margin: 0,
    fontSize: "38px",
  },
  subtitle: {
    color: "#555",
    marginTop: "8px",
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
  filterCard: {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "14px",
    padding: "20px",
    marginBottom: "18px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "end",
    gap: "16px",
  },
  label: {
    display: "block",
    marginBottom: "6px",
    color: "#374151",
    fontWeight: 700,
  },
  input: {
    height: "44px",
    borderRadius: "10px",
    border: "1px solid #ccc",
    padding: "0 12px",
    color: "#111",
    background: "#fff",
  },
  closeButton: {
    height: "44px",
    background: "#f5c400",
    color: "#111",
    border: "none",
    borderRadius: "10px",
    padding: "0 18px",
    fontWeight: 900,
    cursor: "pointer",
  },
  closedButton: {
    height: "44px",
    background: "#d1d5db",
    color: "#374151",
    border: "none",
    borderRadius: "10px",
    padding: "0 18px",
    fontWeight: 900,
    cursor: "not-allowed",
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: "14px",
    marginBottom: "18px",
  },
  card: {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "14px",
    padding: "20px",
    boxShadow: "0 3px 10px rgba(0,0,0,0.06)",
  },
  cardTitle: {
    display: "block",
    color: "#555",
    fontSize: "14px",
    marginBottom: "8px",
    fontWeight: 700,
  },
  cardValue: {
    color: "#111",
    fontSize: "26px",
    fontWeight: 900,
  },
  statusCard: {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "14px",
    padding: "16px 20px",
    marginBottom: "18px",
    display: "flex",
    gap: "12px",
    alignItems: "center",
  },
  statusOpen: {
    background: "#dcfce7",
    color: "#166534",
    padding: "6px 10px",
    borderRadius: "999px",
    fontWeight: 900,
  },
  statusClosed: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "6px 10px",
    borderRadius: "999px",
    fontWeight: 900,
  },
  userText: {
    marginLeft: "auto",
    color: "#555",
    fontWeight: 700,
  },
  closuresCard: {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "14px",
    padding: "18px",
    marginBottom: "18px",
    boxShadow: "0 3px 10px rgba(0,0,0,0.06)",
  },
  closuresTitle: {
    margin: "0 0 12px",
    fontSize: "20px",
  },
  rowCierre: {
    display: "grid",
    gridTemplateColumns: "1fr 160px 160px",
    gap: "12px",
    alignItems: "center",
    padding: "12px",
    borderTop: "1px solid #eee",
  },
  reopenButton: {
    height: "40px",
    background: "#ef4444",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "0 12px",
    cursor: "pointer",
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
    gridTemplateColumns: "1fr 0.8fr 1.4fr 0.8fr 2fr 1fr 1fr",
    gap: "10px",
    background: "#f5c400",
    padding: "14px",
    fontWeight: 900,
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 0.8fr 1.4fr 0.8fr 2fr 1fr 1fr",
    gap: "10px",
    padding: "14px",
    borderTop: "1px solid #eee",
    alignItems: "center",
  },
  payment: {
    background: "#f3f4f6",
    borderRadius: "999px",
    padding: "5px 8px",
    fontWeight: 800,
    textAlign: "center",
  },
  empty: {
    padding: "20px",
  },
  error: {
    color: "#b91c1c",
    fontWeight: 800,
  },
};