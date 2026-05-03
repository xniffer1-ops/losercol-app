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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    void cargarCaja();
  }, []);

  useEffect(() => {
    const revisarPantalla = () => setIsMobile(window.innerWidth <= 760);
    revisarPantalla();
    window.addEventListener("resize", revisarPantalla);
    return () => window.removeEventListener("resize", revisarPantalla);
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

  const dinero = (valor: number) =>
    `$${Math.round(valor || 0).toLocaleString("es-CO")}`;

  const cerrarCaja = async () => {
    if (!data) return;

    if (data.cerrado) {
      alert("Esta caja ya está cerrada");
      return;
    }

    const ok = confirm(
      `¿Seguro deseas cerrar la caja del día ${data.fecha}?\n\nTotal caja: ${dinero(
        data.resumen.total
      )}\nServicios: ${data.resumen.cantidadServicios}`
    );

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

  const normalizarPago = (formaPago: string) => {
    const pago = String(formaPago || "").toLowerCase().trim();

    if (pago === "credito") return "Crédito";
    if (pago === "efectivo") return "Efectivo";
    if (pago === "transferencia") return "Transferencia";

    return formaPago || "-";
  };

  const totalServicio = (s: ServicioCaja) =>
    typeof s.totalNeto === "number" && s.totalNeto > 0 ? s.totalNeto : s.subtotal;

  const horaServicio = (createdAt: string) =>
    new Date(createdAt).toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <main style={styles.page}>
      <div style={isMobile ? styles.topBarMobile : styles.topBar}>
        <div>
          <h1 style={isMobile ? styles.titleMobile : styles.title}>
            Cierre de caja
          </h1>
          <p style={styles.subtitle}>
            Cuadre diario por efectivo, transferencia y crédito.
          </p>
        </div>

        <Link href="/" style={styles.backLink}>
          ← Volver al menú
        </Link>
      </div>

      <section style={isMobile ? styles.filterCardMobile : styles.filterCard}>
        <div style={isMobile ? styles.dateFieldMobile : undefined}>
          <label style={styles.label}>Fecha</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => {
              setFecha(e.target.value);
              void cargarCaja(e.target.value);
            }}
            style={isMobile ? styles.inputMobile : styles.input}
          />
        </div>

        <button
          onClick={() => void cerrarCaja()}
          style={
            data?.cerrado
              ? isMobile
                ? styles.closedButtonMobile
                : styles.closedButton
              : isMobile
              ? styles.closeButtonMobile
              : styles.closeButton
          }
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
          <section style={styles.mainTotalCard}>
            <span style={styles.mainTotalLabel}>Total caja</span>
            <strong style={styles.mainTotalValue}>
              {dinero(data.resumen.total)}
            </strong>

            <div style={styles.mainTotalFooter}>
              <span>
                Estado:{" "}
                <strong style={data.cerrado ? styles.textClosed : styles.textOpen}>
                  {data.cerrado ? "CERRADA" : "ABIERTA"}
                </strong>
              </span>
              <span>{data.resumen.cantidadServicios} servicio(s)</span>
            </div>
          </section>

          <section style={isMobile ? styles.kpiGridMobile : styles.kpiGrid}>
            <Card title="Efectivo" value={dinero(data.resumen.efectivo)} />
            <Card
              title="Transferencia"
              value={dinero(data.resumen.transferencia)}
            />
            <Card title="Crédito" value={dinero(data.resumen.credito)} />
            <Card title="Servicios" value={data.resumen.cantidadServicios} />
          </section>

          <section style={isMobile ? styles.statusCardMobile : styles.statusCard}>
            <div style={styles.statusLine}>
              <strong>Estado:</strong>
              <span style={data.cerrado ? styles.statusClosed : styles.statusOpen}>
                {data.cerrado ? "CERRADA" : "ABIERTA"}
              </span>
            </div>

            <span style={isMobile ? styles.userTextMobile : styles.userText}>
              Usuario actual: {data.usuario}
            </span>
          </section>

          {data.esAdmin && data.cierresDelDia && data.cierresDelDia.length > 0 && (
            <section style={styles.closuresCard}>
              <h3 style={styles.closuresTitle}>Cierres del día</h3>

              {data.cierresDelDia.map((c) => (
                <div
                  key={c.id}
                  style={isMobile ? styles.rowCierreMobile : styles.rowCierre}
                >
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
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Servicios del día</h2>
              <span style={styles.countBadge}>{data.servicios.length}</span>
            </div>

            {data.servicios.length === 0 ? (
              <div style={styles.empty}>No hay servicios en esta fecha</div>
            ) : isMobile ? (
              <div style={styles.mobileList}>
                {data.servicios.map((s) => (
                  <article key={s.id} style={styles.serviceCardMobile}>
                    <div style={styles.serviceCardTop}>
                      <strong>{s.numeroSoporte || `SP-${s.id}`}</strong>
                      <strong>{dinero(totalServicio(s))}</strong>
                    </div>

                    <div style={styles.serviceMetaGrid}>
                      <span>
                        <strong>Hora:</strong> {horaServicio(s.createdAt)}
                      </span>
                      <span>
                        <strong>Placa:</strong> {s.placa}
                      </span>
                      <span>
                        <strong>Pago:</strong>{" "}
                        <span style={styles.payment}>
                          {normalizarPago(s.formaPago)}
                        </span>
                      </span>
                    </div>

                    <div style={styles.serviceText}>
                      <strong>Cliente:</strong> {s.cliente}
                    </div>

                    <div style={styles.serviceText}>
                      <strong>Servicio:</strong> {s.servicio}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <>
                <div style={styles.header}>
                  <span>Soporte</span>
                  <span>Hora</span>
                  <span>Cliente</span>
                  <span>Placa</span>
                  <span>Servicio</span>
                  <span>Pago</span>
                  <span>Total</span>
                </div>

                {data.servicios.map((s) => (
                  <div key={s.id} style={styles.row}>
                    <strong>{s.numeroSoporte || `SP-${s.id}`}</strong>
                    <span>{horaServicio(s.createdAt)}</span>
                    <span>{s.cliente}</span>
                    <span>{s.placa}</span>
                    <span>{s.servicio}</span>
                    <span style={styles.payment}>
                      {normalizarPago(s.formaPago)}
                    </span>
                    <strong>{dinero(totalServicio(s))}</strong>
                  </div>
                ))}
              </>
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
    padding: "clamp(14px, 3vw, 30px)",
    fontFamily: "Arial, sans-serif",
    color: "#111",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "22px",
    gap: "14px",
  },
  topBarMobile: {
    display: "grid",
    gap: "14px",
    marginBottom: "18px",
  },
  title: {
    margin: 0,
    fontSize: "38px",
  },
  titleMobile: {
    margin: 0,
    fontSize: "30px",
  },
  subtitle: {
    color: "#555",
    marginTop: "8px",
    marginBottom: 0,
  },
  backLink: {
    background: "#fff",
    border: "1px solid #ccc",
    borderRadius: "10px",
    padding: "12px 16px",
    color: "#0b5cab",
    textDecoration: "none",
    fontWeight: 800,
    width: "fit-content",
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
  filterCardMobile: {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "14px",
    padding: "16px",
    marginBottom: "16px",
    display: "grid",
    gap: "12px",
  },
  dateFieldMobile: {
    display: "grid",
    gap: "6px",
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
  inputMobile: {
    width: "100%",
    height: "48px",
    borderRadius: "10px",
    border: "1px solid #ccc",
    padding: "0 12px",
    color: "#111",
    background: "#fff",
    boxSizing: "border-box",
    fontSize: "16px",
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
  closeButtonMobile: {
    width: "100%",
    minHeight: "54px",
    background: "#f5c400",
    color: "#111",
    border: "none",
    borderRadius: "12px",
    padding: "0 18px",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: "17px",
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
  closedButtonMobile: {
    width: "100%",
    minHeight: "54px",
    background: "#d1d5db",
    color: "#374151",
    border: "none",
    borderRadius: "12px",
    padding: "0 18px",
    fontWeight: 900,
    cursor: "not-allowed",
    fontSize: "17px",
  },
  mainTotalCard: {
    background: "#111827",
    color: "#fff",
    borderRadius: "18px",
    padding: "20px",
    marginBottom: "16px",
    boxShadow: "0 8px 20px rgba(17,24,39,0.18)",
  },
  mainTotalLabel: {
    display: "block",
    color: "#e5e7eb",
    fontSize: "14px",
    fontWeight: 800,
    marginBottom: "8px",
  },
  mainTotalValue: {
    display: "block",
    fontSize: "clamp(34px, 8vw, 48px)",
    lineHeight: 1,
    fontWeight: 900,
  },
  mainTotalFooter: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap",
    marginTop: "14px",
    color: "#e5e7eb",
    fontWeight: 700,
  },
  textOpen: {
    color: "#86efac",
  },
  textClosed: {
    color: "#fca5a5",
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "14px",
    marginBottom: "18px",
  },
  kpiGridMobile: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "12px",
    marginBottom: "16px",
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
    fontSize: "clamp(20px, 5vw, 26px)",
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
  statusCardMobile: {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "14px",
    padding: "16px",
    marginBottom: "16px",
    display: "grid",
    gap: "10px",
  },
  statusLine: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
    flexWrap: "wrap",
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
  userTextMobile: {
    color: "#555",
    fontWeight: 700,
    overflowWrap: "anywhere",
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
  rowCierreMobile: {
    display: "grid",
    gap: "10px",
    padding: "12px",
    borderTop: "1px solid #eee",
  },
  reopenButton: {
    minHeight: "40px",
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
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    padding: "16px",
    borderBottom: "1px solid #eee",
  },
  sectionTitle: {
    margin: 0,
    fontSize: "20px",
  },
  countBadge: {
    background: "#f5c400",
    color: "#111",
    borderRadius: "999px",
    padding: "6px 12px",
    fontWeight: 900,
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
  mobileList: {
    display: "grid",
    gap: "12px",
    padding: "12px",
  },
  serviceCardMobile: {
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "14px",
    background: "#fff",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },
  serviceCardTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    alignItems: "center",
    marginBottom: "10px",
    fontSize: "16px",
  },
  serviceMetaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "8px",
    marginBottom: "10px",
    color: "#374151",
    fontSize: "14px",
  },
  serviceText: {
    color: "#111827",
    fontSize: "14px",
    lineHeight: 1.45,
    marginTop: "6px",
  },
  payment: {
    background: "#f3f4f6",
    borderRadius: "999px",
    padding: "5px 8px",
    fontWeight: 800,
    textAlign: "center",
    display: "inline-flex",
    justifyContent: "center",
    width: "fit-content",
  },
  empty: {
    padding: "20px",
  },
  error: {
    color: "#b91c1c",
    fontWeight: 800,
    background: "#fee2e2",
    border: "1px solid #fecaca",
    borderRadius: "12px",
    padding: "12px 14px",
  },
};
