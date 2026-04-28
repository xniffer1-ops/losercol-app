"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type FacturaItem = {
  id: number;
  soporte: string;
  descripcion: string;
  subtotal: number;
  servicioId?: number;
};

type Factura = {
  id: number;
  numero: string;
  cliente: string;
  total: number;
  usuario?: string;
  createdAt: string;
  items?: FacturaItem[];
};

export default function ReportesPage() {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarFacturas();
  }, []);

  const cargarFacturas = async () => {
    const res = await fetch("/api/facturas-multiples", { cache: "no-store" });
    const data = await res.json();
    setFacturas(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const filtradas = useMemo(() => {
    return facturas.filter((f) => {
      const fecha = new Date(f.createdAt);
      const inicio = desde ? new Date(`${desde}T00:00:00`) : null;
      const fin = hasta ? new Date(`${hasta}T23:59:59`) : null;

      if (inicio && fecha < inicio) return false;
      if (fin && fecha > fin) return false;

      return true;
    });
  }, [facturas, desde, hasta]);

  const totalFacturado = filtradas.reduce(
    (acc, f) => acc + Number(f.total || 0),
    0
  );

  const totalFacturas = filtradas.length;
  const promedio = totalFacturas > 0 ? totalFacturado / totalFacturas : 0;

  const grafica = useMemo(() => {
    const mapa: Record<string, number> = {};

    filtradas.forEach((f) => {
      const fecha = new Date(f.createdAt).toLocaleDateString("es-CO");
      mapa[fecha] = (mapa[fecha] || 0) + Number(f.total || 0);
    });

    return Object.entries(mapa).map(([fecha, total]) => ({
      fecha,
      total,
    }));
  }, [filtradas]);

  const dinero = (valor: number) =>
    `$${Math.round(valor || 0).toLocaleString("es-CO")}`;

  const limpiarFiltros = () => {
    setDesde("");
    setHasta("");
  };

  const exportarExcel = () => {
    if (filtradas.length === 0) {
      alert("No hay datos para exportar");
      return;
    }

    const resumen = [
      { Concepto: "Total facturado", Valor: totalFacturado },
      { Concepto: "Total facturas", Valor: totalFacturas },
      { Concepto: "Promedio por factura", Valor: promedio },
    ];

    const detalle = filtradas.map((f) => ({
      Numero: f.numero,
      Fecha: new Date(f.createdAt).toLocaleDateString("es-CO"),
      Cliente: f.cliente,
      Usuario: f.usuario || "-",
      Servicios: f.items?.length || 0,
      Total: Number(f.total || 0),
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(resumen),
      "Resumen"
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(detalle),
      "Detalle"
    );

    XLSX.writeFile(workbook, "reporte_facturacion.xlsx");
  };

  return (
    <main style={styles.page}>
      <div style={styles.topBar}>
        <div>
          <div style={styles.breadcrumb}>📊 Reportes</div>
          <h1 style={styles.title}>Análisis de facturación</h1>
          <p style={styles.subtitle}>Consulta y analiza tu información de ventas</p>
        </div>

        <Link href="/" style={styles.backButton}>
          ← Volver
        </Link>
      </div>

      <section style={styles.filterCard}>
        <h2 style={styles.sectionTitle}>📅 Filtro por fecha</h2>

        <div style={styles.filters}>
          <div style={styles.field}>
            <label style={styles.label}>Fecha inicio</label>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Fecha fin</label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              style={styles.input}
            />
          </div>

          <button onClick={limpiarFiltros} style={styles.clearButton}>
            ↻ Limpiar
          </button>

          <button onClick={exportarExcel} style={styles.excelButton}>
            📊 Excel
          </button>
        </div>
      </section>

      <section style={styles.kpiGrid}>
        <div style={{ ...styles.kpiCard, ...styles.kpiYellow }}>
          <div style={styles.iconBoxYellow}>$</div>
          <div>
            <span style={styles.kpiLabel}>Total facturado</span>
            <strong style={styles.kpiValueYellow}>
              {dinero(totalFacturado)}
            </strong>
            <p style={styles.kpiText}>Totales del periodo seleccionado</p>
          </div>
        </div>

        <div style={{ ...styles.kpiCard, ...styles.kpiBlue }}>
          <div style={styles.iconBoxBlue}>▤</div>
          <div>
            <span style={styles.kpiLabel}>Facturas generadas</span>
            <strong style={styles.kpiValueBlue}>{totalFacturas}</strong>
            <p style={styles.kpiText}>Cantidad de facturas emitidas</p>
          </div>
        </div>

        <div style={{ ...styles.kpiCard, ...styles.kpiGreen }}>
          <div style={styles.iconBoxGreen}>↗</div>
          <div>
            <span style={styles.kpiLabel}>Promedio por factura</span>
            <strong style={styles.kpiValueGreen}>{dinero(promedio)}</strong>
            <p style={styles.kpiText}>Valor promedio de cada factura</p>
          </div>
        </div>
      </section>

      <section style={styles.chartCard}>
        <h2 style={styles.sectionTitle}>📈 Ventas por día</h2>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={grafica}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="fecha" />
            <YAxis />
            <Tooltip
              formatter={(value) => [dinero(Number(value)), "Total"]}
              contentStyle={{
                background: "#111827",
                color: "#fff",
                borderRadius: "8px",
                border: "none",
              }}
            />
            <Line
              type="monotone"
              dataKey="total"
              stroke="#f5c400"
              strokeWidth={4}
              dot={{ r: 6, fill: "#f5c400", strokeWidth: 2 }}
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </section>

      <section style={styles.tableCard}>
        <div style={styles.tableHeader}>
          <span>Número</span>
          <span>Fecha</span>
          <span>Cliente</span>
          <span>Total</span>
        </div>

        {loading ? (
          <div style={styles.empty}>Cargando reportes...</div>
        ) : filtradas.length === 0 ? (
          <div style={styles.empty}>No hay datos para este filtro</div>
        ) : (
          filtradas.map((f) => (
            <div key={f.id} style={styles.tableRow}>
              <strong>{f.numero}</strong>
              <span>{new Date(f.createdAt).toLocaleDateString("es-CO")}</span>
              <span>{f.cliente}</span>
              <strong>{dinero(f.total)}</strong>
            </div>
          ))
        )}

        <div style={styles.tableFooter}>
          Mostrando {filtradas.length} registro(s)
        </div>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)",
    padding: "28px",
    fontFamily: "Arial, sans-serif",
    color: "#111827",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "26px",
  },
  breadcrumb: {
    fontWeight: 800,
    color: "#111827",
    marginBottom: "10px",
  },
  title: {
    margin: 0,
    fontSize: "32px",
    color: "#111827",
  },
  subtitle: {
    marginTop: "8px",
    color: "#4b5563",
    fontSize: "16px",
  },
  backButton: {
    background: "#fff",
    border: "1px solid #d1d5db",
    borderRadius: "10px",
    padding: "12px 18px",
    color: "#0b5cab",
    fontWeight: 800,
    textDecoration: "none",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },
  filterCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "22px",
    marginBottom: "18px",
    boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
  },
  sectionTitle: {
    margin: "0 0 16px 0",
    color: "#111827",
    fontSize: "22px",
  },
  filters: {
    display: "grid",
    gridTemplateColumns: "1.5fr 1.5fr 0.8fr 0.8fr",
    gap: "16px",
    alignItems: "end",
  },
  field: {
    display: "grid",
    gap: "6px",
  },
  label: {
    color: "#374151",
    fontWeight: 700,
    fontSize: "14px",
  },
  input: {
    height: "44px",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    padding: "0 12px",
    color: "#111827",
    background: "#fff",
    fontSize: "15px",
  },
  clearButton: {
    height: "44px",
    background: "#fff",
    color: "#111827",
    border: "1px solid #d1d5db",
    borderRadius: "10px",
    fontWeight: 800,
    cursor: "pointer",
  },
  excelButton: {
    height: "44px",
    background: "#f5c400",
    color: "#111827",
    border: "none",
    borderRadius: "10px",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 3px 10px rgba(245,196,0,0.35)",
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "16px",
    marginBottom: "18px",
  },
  kpiCard: {
    display: "flex",
    alignItems: "center",
    gap: "18px",
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "22px",
    boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
  },
  kpiYellow: {
    background: "linear-gradient(135deg, #fff 0%, #fff8dc 100%)",
  },
  kpiBlue: {
    background: "linear-gradient(135deg, #fff 0%, #eff6ff 100%)",
  },
  kpiGreen: {
    background: "linear-gradient(135deg, #fff 0%, #ecfdf5 100%)",
  },
  iconBoxYellow: {
    width: "58px",
    height: "58px",
    borderRadius: "16px",
    display: "grid",
    placeItems: "center",
    background: "#fff2b8",
    color: "#f5a400",
    fontWeight: 900,
    fontSize: "28px",
  },
  iconBoxBlue: {
    width: "58px",
    height: "58px",
    borderRadius: "16px",
    display: "grid",
    placeItems: "center",
    background: "#dbeafe",
    color: "#2563eb",
    fontWeight: 900,
    fontSize: "28px",
  },
  iconBoxGreen: {
    width: "58px",
    height: "58px",
    borderRadius: "16px",
    display: "grid",
    placeItems: "center",
    background: "#dcfce7",
    color: "#16a34a",
    fontWeight: 900,
    fontSize: "28px",
  },
  kpiLabel: {
    display: "block",
    color: "#374151",
    fontWeight: 800,
    marginBottom: "4px",
  },
  kpiValueYellow: {
    display: "block",
    fontSize: "30px",
    color: "#eab308",
  },
  kpiValueBlue: {
    display: "block",
    fontSize: "30px",
    color: "#2563eb",
  },
  kpiValueGreen: {
    display: "block",
    fontSize: "30px",
    color: "#16a34a",
  },
  kpiText: {
    margin: "6px 0 0 0",
    color: "#6b7280",
    fontSize: "13px",
  },
  chartCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "22px",
    marginBottom: "18px",
    boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
  },
  tableCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    overflow: "hidden",
    boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
  },
  tableHeader: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 2fr 1fr",
    gap: "12px",
    background: "#f5c400",
    color: "#111827",
    padding: "15px",
    fontWeight: 900,
  },
  tableRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 2fr 1fr",
    gap: "12px",
    padding: "15px",
    borderTop: "1px solid #e5e7eb",
    alignItems: "center",
    color: "#111827",
  },
  tableFooter: {
    padding: "14px",
    color: "#4b5563",
    fontWeight: 700,
    borderTop: "1px solid #e5e7eb",
  },
  empty: {
    padding: "20px",
    color: "#111827",
  },
};