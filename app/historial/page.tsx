"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Historial = {
  id: number;
  usuario: string;
  rol: string;
  accion: string;
  modulo: string;
  detalle: string;
  createdAt: string;
};

export default function HistorialPage() {
  const [historial, setHistorial] = useState<Historial[]>([]);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState("");

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

  return (
    <main style={styles.page}>
      <div style={styles.topBar}>
        <div>
          <h1 style={styles.title}>Historial de acciones</h1>
          <p style={styles.subtitle}>
            Registro de cambios realizados en el sistema.
          </p>
        </div>

        <Link href="/" style={styles.backLink}>
          ← Volver al menú
        </Link>
      </div>

      <section style={styles.table}>
        <div style={styles.header}>
          <span>Fecha</span>
          <span>Usuario</span>
          <span>Rol</span>
          <span>Acción</span>
          <span>Módulo</span>
          <span>Detalle</span>
        </div>

        {loading ? (
          <div style={styles.empty}>Cargando historial...</div>
        ) : mensaje ? (
          <div style={styles.error}>{mensaje}</div>
        ) : historial.length === 0 ? (
          <div style={styles.empty}>No hay acciones registradas</div>
        ) : (
          historial.map((h) => (
            <div key={h.id} style={styles.row}>
              <span>{new Date(h.createdAt).toLocaleString("es-CO")}</span>
              <span>{h.usuario}</span>
              <span>{h.rol}</span>
              <strong>{h.accion}</strong>
              <span>{h.modulo}</span>
              <span>{h.detalle}</span>
            </div>
          ))
        )}
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
    color: "#111",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "24px",
  },
  title: {
    margin: 0,
    fontSize: "36px",
    color: "#111",
  },
  subtitle: {
    marginTop: "8px",
    color: "#555",
    fontSize: "17px",
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
  table: {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "14px",
    overflow: "hidden",
    boxShadow: "0 3px 10px rgba(0,0,0,0.06)",
  },
  header: {
    display: "grid",
    gridTemplateColumns: "1.4fr 1.3fr 0.8fr 1fr 1fr 2.4fr",
    gap: "10px",
    background: "#f5c400",
    padding: "14px",
    fontWeight: 900,
    color: "#111",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1.4fr 1.3fr 0.8fr 1fr 1fr 2.4fr",
    gap: "10px",
    padding: "14px",
    borderTop: "1px solid #eee",
    alignItems: "center",
    color: "#111",
  },
  empty: {
    padding: "20px",
    color: "#111",
  },
  error: {
    padding: "20px",
    color: "#b91c1c",
    fontWeight: 800,
  },
};