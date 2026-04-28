"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type FacturaItem = {
  id: number;
  soporte: string;
  descripcion: string;
  subtotal: number;
  servicioId: number;
};

type FacturaMultiple = {
  id: number;
  numero: string;
  cliente: string;
  total: number;
  usuario: string;
  createdAt: string;
  items: FacturaItem[];
};

type User = {
  id: number;
  nombre: string;
  email: string;
  rol: "admin" | "operador";
} | null;

export default function FacturasMultiplesPage() {
  const [facturas, setFacturas] = useState<FacturaMultiple[]>([]);
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [filtro, setFiltro] = useState<"todas" | "hoy" | "semana" | "mes">(
    "todas"
  );

  useEffect(() => {
    cargarTodo();
  }, []);

  const cargarTodo = async () => {
    try {
      const [facturasRes, userRes] = await Promise.all([
        fetch("/api/facturas-multiples", { cache: "no-store" }),
        fetch("/api/me", { cache: "no-store" }),
      ]);

      const facturasData = await facturasRes.json();
      const userData = await userRes.json();

      if (!facturasRes.ok) {
        setMensaje(facturasData.error || "Error cargando historial");
        return;
      }

      setFacturas(Array.isArray(facturasData) ? facturasData : []);
      setUser(userData);
    } catch {
      setMensaje("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const facturasFiltradas = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - 7);

    const inicioMes = new Date(hoy);
    inicioMes.setDate(1);

    return facturas.filter((f) => {
      const fecha = new Date(f.createdAt);

      if (filtro === "hoy") return fecha >= hoy;
      if (filtro === "semana") return fecha >= inicioSemana;
      if (filtro === "mes") return fecha >= inicioMes;

      return true;
    });
  }, [facturas, filtro]);

  const dinero = (valor: number) =>
    `$${Number(valor || 0).toLocaleString("es-CO")}`;

  const anularFactura = async (id: number) => {
    if (user?.rol !== "admin") {
      alert("Solo un administrador puede anular facturas");
      return;
    }

    if (!confirm("¿Seguro deseas anular esta factura?")) return;

    const res = await fetch(`/api/facturas-multiples/${id}`, {
      method: "DELETE",
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Error al anular la factura");
      return;
    }

    alert("Factura anulada correctamente");
    setFacturas((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <main style={styles.page}>
      <div style={styles.topBar}>
        <div>
          <h1 style={styles.title}>Historial de facturas múltiples</h1>
          <p style={styles.subtitle}>
            Consulta, filtra y anula facturas generadas.
          </p>

          {user && (
            <p style={styles.userText}>
              Usuario: <strong>{user.nombre}</strong> | Rol:{" "}
              <strong>{user.rol}</strong>
            </p>
          )}
        </div>

        <Link href="/factura-multiple" style={styles.backLink}>
          ← Volver a factura múltiple
        </Link>
      </div>

      <section style={styles.filters}>
        <button
          onClick={() => setFiltro("todas")}
          style={filtro === "todas" ? styles.activeBtn : styles.filterBtn}
        >
          Todas
        </button>

        <button
          onClick={() => setFiltro("hoy")}
          style={filtro === "hoy" ? styles.activeBtn : styles.filterBtn}
        >
          Hoy
        </button>

        <button
          onClick={() => setFiltro("semana")}
          style={filtro === "semana" ? styles.activeBtn : styles.filterBtn}
        >
          Últimos 7 días
        </button>

        <button
          onClick={() => setFiltro("mes")}
          style={filtro === "mes" ? styles.activeBtn : styles.filterBtn}
        >
          Este mes
        </button>
      </section>

      {mensaje && <p style={styles.message}>{mensaje}</p>}

      <section style={styles.table}>
        <div style={styles.header}>
          <span>Número</span>
          <span>Fecha</span>
          <span>Cliente</span>
          <span>Usuario</span>
          <span>Total</span>
          <span>Detalle</span>
          <span>Acción</span>
        </div>

        {loading ? (
          <div style={styles.empty}>Cargando historial...</div>
        ) : facturasFiltradas.length === 0 ? (
          <div style={styles.empty}>No hay facturas para este filtro</div>
        ) : (
          facturasFiltradas.map((f) => (
            <div key={f.id} style={styles.row}>
              <strong>{f.numero}</strong>

              <span>{new Date(f.createdAt).toLocaleDateString("es-CO")}</span>

              <span>{f.cliente}</span>

              <span>{f.usuario}</span>

              <strong>{dinero(f.total)}</strong>

              <div>
                {f.items?.map((item) => (
                  <div key={item.id} style={styles.item}>
                    <strong>{item.soporte}</strong> - {item.descripcion} -{" "}
                    {dinero(item.subtotal)}
                  </div>
                ))}
              </div>

              <div>
                {user?.rol === "admin" ? (
                  <button
                    style={styles.btnDelete}
                    onClick={() => anularFactura(f.id)}
                  >
                    Anular
                  </button>
                ) : (
                  <span style={styles.noPermission}>Sin permiso</span>
                )}
              </div>
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
    marginBottom: "20px",
  },
  title: {
    margin: 0,
    fontSize: "34px",
  },
  subtitle: {
    marginTop: "8px",
    color: "#555",
  },
  userText: {
    marginTop: "8px",
    color: "#374151",
    fontSize: "14px",
  },
  backLink: {
    textDecoration: "none",
    color: "#0b5cab",
    fontWeight: 700,
  },
  filters: {
    display: "flex",
    gap: "10px",
    marginBottom: "18px",
    flexWrap: "wrap",
  },
  filterBtn: {
    background: "#fff",
    color: "#111",
    border: "1px solid #ccc",
    borderRadius: "8px",
    padding: "10px 14px",
    fontWeight: 700,
    cursor: "pointer",
  },
  activeBtn: {
    background: "#f5c400",
    color: "#111",
    border: "1px solid #f5c400",
    borderRadius: "8px",
    padding: "10px 14px",
    fontWeight: 700,
    cursor: "pointer",
  },
  message: {
    fontWeight: 700,
    marginBottom: "16px",
    color: "#b91c1c",
  },
  table: {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "12px",
    overflow: "hidden",
  },
  header: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1.4fr 1.4fr 1fr 3fr 1fr",
    gap: "10px",
    background: "#f5c400",
    padding: "14px",
    fontWeight: 700,
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1.4fr 1.4fr 1fr 3fr 1fr",
    gap: "10px",
    padding: "14px",
    borderTop: "1px solid #eee",
    alignItems: "start",
  },
  item: {
    marginBottom: "6px",
    fontSize: "13px",
  },
  btnDelete: {
    background: "#b91c1c",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "6px 10px",
    cursor: "pointer",
    fontWeight: 600,
  },
  noPermission: {
    color: "#777",
    fontSize: "13px",
  },
  empty: {
    padding: "18px",
  },
};