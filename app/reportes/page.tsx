"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
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

type Cliente = {
  nombre?: string | null;
  ccNit?: string | null;
};

type Vehiculo = {
  placa?: string | null;
};

type CentroOperacion = {
  id?: number | null;
  nombre?: string | null;
};

type Centro = {
  id: number;
  nombre: string;
};

type Seccion = {
  nombre?: string | null;
};

type Tarifa = {
  codigo?: string | null;
  descripcion?: string | null;
  valorUnitario?: number | null;
  unidadMedida?: string | null;
  cuentaTonelajeOperativo?: boolean | null;
};

type Servicio = {
  id: number;
  numeroSoporte?: string | null;
  descripcion?: string | null;
  cantidad?: number | string | null;
  valorUnitario?: number | string | null;
  subtotal?: number | string | null;
  totalNeto?: number | string | null;
  valorReteIva?: number | string | null;
  reteIva?: boolean | null;
  facturaElectronica?: boolean | null;
  formaPago?: string | null;
  tipoCarpa?: string | null;
  createdAt: string;
  cliente?: Cliente | null;
  vehiculo?: Vehiculo | null;
  centroOperacion?: CentroOperacion | null;
  seccion?: Seccion | null;
  tarifa?: Tarifa | null;
};

type ResumenPago = {
  efectivo: number;
  transferencia: number;
  credito: number;
};

function fechaHoyInput() {
  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = String(hoy.getMonth() + 1).padStart(2, "0");
  const day = String(hoy.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function fechaInicioMesInput() {
  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = String(hoy.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}-01`;
}

function numeroSoporte(s: Servicio) {
  if (s.numeroSoporte) return s.numeroSoporte;

  return `SP-${String(s.id).padStart(6, "0")}`;
}

function dinero(valor: number) {
  return `$${Math.round(valor || 0).toLocaleString("es-CO")}`;
}

function numero(valor: unknown) {
  const parsed = Number(valor || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function cantidadTexto(valor: number) {
  return Number(valor || 0).toLocaleString("es-CO", {
    maximumFractionDigits: 2,
  });
}

function normalizarUnidadMedida(valor?: string | null) {
  const unidad = String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (unidad.includes("tonelada")) return "toneladas";
  if (unidad.includes("hora")) return "horasHombre";
  if (unidad.includes("unidad")) return "unidades";
  if (unidad.includes("vehiculo")) return "vehiculos";
  return "otros";
}

function cuentaTonelajeOperativo(tarifa?: Tarifa | null) {
  const unidad = normalizarUnidadMedida(tarifa?.unidadMedida);

  if (unidad !== "toneladas") return true;

  return tarifa?.cuentaTonelajeOperativo !== false;
}

function unidadResumenServicio(s: Servicio) {
  const unidad = normalizarUnidadMedida(s.tarifa?.unidadMedida);

  if (unidad === "toneladas" && !cuentaTonelajeOperativo(s.tarifa)) {
    return "toneladasAdicionales";
  }

  return unidad;
}

function valorRealServicio(s: Servicio) {
  const totalNeto = numero(s.totalNeto);
  const subtotal = numero(s.subtotal);

  return totalNeto > 0 ? totalNeto : subtotal;
}

function normalizarPago(valor?: string | null): keyof ResumenPago {
  const pago = String(valor || "credito").toLowerCase().trim();

  if (pago === "efectivo") return "efectivo";
  if (pago === "transferencia") return "transferencia";

  return "credito";
}

function textoPago(valor?: string | null) {
  const pago = normalizarPago(valor);

  if (pago === "efectivo") return "Efectivo";
  if (pago === "transferencia") return "Transferencia";

  return "Crédito";
}


export default function ReportesPage() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [centros, setCentros] = useState<Centro[]>([]);
  const [centroFiltro, setCentroFiltro] = useState("");
  const [tipoUsoFiltro, setTipoUsoFiltro] = useState("");
  const [desde, setDesde] = useState(fechaInicioMesInput());
  const [hasta, setHasta] = useState(fechaHoyInput());
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  const cargarServicios = useCallback(async (fechaInicio?: string, fechaFin?: string, centro?: string, tipoUso?: string) => {
    setLoading(true);
    setMensaje("");

    try {
      const params = new URLSearchParams();

      if (fechaInicio) params.set("fechaInicio", fechaInicio);
      if (fechaFin) params.set("fechaFin", fechaFin);
      if (centro) params.set("centroOperacionId", centro);
      if (tipoUso) params.set("tipoUso", tipoUso);

      const url = params.toString()
        ? `/api/servicios?${params.toString()}`
        : "/api/servicios";

      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        setServicios([]);
        setMensaje(data?.error || "No fue posible cargar los reportes");
        return;
      }

      setServicios(Array.isArray(data) ? data : []);
    } catch {
      setServicios([]);
      setMensaje("Error de conexión cargando reportes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const cargarCentros = async () => {
      try {
        const res = await fetch("/api/centros", { cache: "no-store" });
        const data = await res.json();
        setCentros(Array.isArray(data) ? data : []);
      } catch {
        setCentros([]);
      }
    };

    void cargarCentros();
  }, []);

  useEffect(() => {
    const revisarPantalla = () => setIsMobile(window.innerWidth <= 760);
    revisarPantalla();

    window.addEventListener("resize", revisarPantalla);
    return () => window.removeEventListener("resize", revisarPantalla);
  }, []);

  useEffect(() => {
    void cargarServicios(desde, hasta, centroFiltro, tipoUsoFiltro);
  }, [cargarServicios, desde, hasta, centroFiltro, tipoUsoFiltro]);

  const resumen = useMemo(() => {
    const pagos: ResumenPago = {
      efectivo: 0,
      transferencia: 0,
      credito: 0,
    };

    let totalFacturado = 0;
    let totalReteIva = 0;
    const cantidadesPorUnidad = {
      toneladas: 0,
      toneladasAdicionales: 0,
      horasHombre: 0,
      unidades: 0,
      vehiculos: 0,
      otros: 0,
    };

    let totalConReteIva = 0;

    servicios.forEach((s) => {
      const totalServicio = valorRealServicio(s);
      const pago = normalizarPago(s.formaPago);

      pagos[pago] += totalServicio;

      totalFacturado += totalServicio;
      totalReteIva += numero(s.valorReteIva);

      const unidad = unidadResumenServicio(s);
      cantidadesPorUnidad[unidad] += numero(s.cantidad);

      if (s.reteIva) {
        totalConReteIva += 1;
      }

    });

    return {
      pagos,
      totalServicios: servicios.length,
      totalFacturado,
      totalReteIva,
      cantidadesPorUnidad,
      totalConReteIva,
    };
  }, [servicios]);

  const grafica = useMemo(() => {
    const mapa: Record<string, number> = {};

    servicios.forEach((s) => {
      const fecha = new Date(s.createdAt).toLocaleDateString("es-CO");
      mapa[fecha] = (mapa[fecha] || 0) + valorRealServicio(s);
    });

    return Object.entries(mapa).map(([fecha, total]) => ({
      fecha,
      total,
    }));
  }, [servicios]);


  const limpiarFiltros = () => {
    setDesde(fechaInicioMesInput());
    setHasta(fechaHoyInput());
    setCentroFiltro("");
    setTipoUsoFiltro("");
  };

  const exportarExcel = () => {
    if (servicios.length === 0) {
      alert("No hay datos para exportar");
      return;
    }

    const hojaResumen = [
      { Concepto: "Servicios del periodo", Valor: resumen.totalServicios },
      { Concepto: "Total soportes / neto", Valor: resumen.totalFacturado },
      {
        Concepto: "Toneladas operativas",
        Valor: resumen.cantidadesPorUnidad.toneladas,
      },
      {
        Concepto: "Toneladas adicionales no operativas",
        Valor: resumen.cantidadesPorUnidad.toneladasAdicionales,
      },
      { Concepto: "Horas hombre", Valor: resumen.cantidadesPorUnidad.horasHombre },
      { Concepto: "Unidades", Valor: resumen.cantidadesPorUnidad.unidades },
      { Concepto: "Vehículos por unidad de cobro", Valor: resumen.cantidadesPorUnidad.vehiculos },
      { Concepto: "Otras cantidades", Valor: resumen.cantidadesPorUnidad.otros },
      { Concepto: "Total Retención 4%", Valor: resumen.totalReteIva },
      { Concepto: "Efectivo", Valor: resumen.pagos.efectivo },
      { Concepto: "Transferencia", Valor: resumen.pagos.transferencia },
      { Concepto: "Crédito", Valor: resumen.pagos.credito },
    ];

    const hojaDetalle = servicios.map((s) => ({
      Soporte: numeroSoporte(s),
      Fecha: new Date(s.createdAt).toLocaleDateString("es-CO"),
      Cliente: s.cliente?.nombre || "",
      Documento: s.cliente?.ccNit || "",
      Vehiculo: s.vehiculo?.placa || "",
      Centro: s.centroOperacion?.nombre || "",
      Seccion: s.seccion?.nombre || "",
      Tarifa: s.tarifa?.codigo || "",
      Descripcion: s.descripcion || "",
      Cantidad: numero(s.cantidad),
      "Unidad de medida": s.tarifa?.unidadMedida || "",
      "Cuenta tonelaje operativo": cuentaTonelajeOperativo(s.tarifa) ? "Sí" : "No",
      "Forma de pago": textoPago(s.formaPago),
      "Retención 4%": s.reteIva ? "Sí" : "No",
      "Valor Retención 4%": numero(s.valorReteIva),
      Subtotal: numero(s.subtotal),
      "Total neto": valorRealServicio(s),
    }));


    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(hojaResumen),
      "Resumen"
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(hojaDetalle),
      "Detalle"
    );


    XLSX.writeFile(workbook, "reporte_servicios.xlsx");
  };

  return (
    <main style={isMobile ? { ...styles.page, ...styles.pageMobile } : styles.page}>
      <div style={isMobile ? { ...styles.topBar, ...styles.topBarMobile } : styles.topBar}>
        <div>
          <div style={styles.breadcrumb}>📊 Reportes</div>
          <h1 style={styles.title}>Reportes operativos</h1>
          <p style={styles.subtitle}>
            Servicios, pagos, retención 4% y actividad operativa.
          </p>
        </div>
      </div>

      <section style={styles.filterCard}>
        <h2 style={styles.sectionTitle}>📅 Filtro por fecha</h2>

        <div style={isMobile ? { ...styles.filters, ...styles.filtersMobile } : styles.filters}>
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

          <div style={styles.field}>
            <label style={styles.label}>Centro</label>
            <select
              value={centroFiltro}
              onChange={(e) => setCentroFiltro(e.target.value)}
              style={styles.input}
            >
              <option value="">Todos</option>
              {centros.map((centro) => (
                <option key={centro.id} value={centro.id}>
                  {centro.nombre}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Tipo</label>
            <select
              value={tipoUsoFiltro}
              onChange={(e) => setTipoUsoFiltro(e.target.value)}
              style={styles.input}
            >
              <option value="">Todos</option>
              <option value="terceros">Cobro a terceros</option>
              <option value="interno">Movimiento interno</option>
            </select>
          </div>

          <button
            type="button"
            onClick={limpiarFiltros}
            style={styles.clearButton}
          >
            ↻ Mes actual
          </button>

          <button type="button" onClick={exportarExcel} style={styles.excelButton}>
            📊 Excel
          </button>
        </div>
      </section>

      {mensaje && <div style={styles.errorBox}>{mensaje}</div>}

      <section style={isMobile ? styles.kpiGridMobile : styles.kpiGrid}>
        <div style={{ ...styles.kpiCard, ...styles.kpiYellow }}>
          <div style={styles.iconBoxYellow}>$</div>
          <div>
            <span style={styles.kpiLabel}>Valor total de soportes</span>
            <strong style={styles.kpiValueYellow}>
              {dinero(resumen.totalFacturado)}
            </strong>
            <p style={styles.kpiText}>Valor neto del periodo</p>
          </div>
        </div>

        <div style={{ ...styles.kpiCard, ...styles.kpiBlue }}>
          <div style={styles.iconBoxBlue}>▤</div>
          <div>
            <span style={styles.kpiLabel}>Servicios registrados</span>
            <strong style={styles.kpiValueBlue}>{resumen.totalServicios}</strong>
            <p style={styles.kpiText}>Cantidad de soportes generados</p>
          </div>
        </div>

        <div style={{ ...styles.kpiCard, ...styles.kpiPurple }}>
          <div style={styles.iconBoxPurple}>T</div>
          <div>
            <span style={styles.kpiLabel}>Toneladas operativas</span>
            <strong style={styles.kpiValuePurple}>
              {cantidadTexto(resumen.cantidadesPorUnidad.toneladas)}
            </strong>
            <p style={styles.kpiText}>Solo las que cuentan como tonelaje real</p>
          </div>
        </div>

        <div style={{ ...styles.kpiCard, ...styles.kpiPurple }}>
          <div style={styles.iconBoxPurple}>TA</div>
          <div>
            <span style={styles.kpiLabel}>Toneladas adicionales</span>
            <strong style={styles.kpiValuePurple}>
              {cantidadTexto(resumen.cantidadesPorUnidad.toneladasAdicionales)}
            </strong>
            <p style={styles.kpiText}>Cobros por tonelada que no duplican operación</p>
          </div>
        </div>

        <div style={{ ...styles.kpiCard, ...styles.kpiPurple }}>
          <div style={styles.iconBoxPurple}>HH</div>
          <div>
            <span style={styles.kpiLabel}>Horas hombre</span>
            <strong style={styles.kpiValuePurple}>
              {cantidadTexto(resumen.cantidadesPorUnidad.horasHombre)}
            </strong>
            <p style={styles.kpiText}>Solo tarifas por Hora Hombre</p>
          </div>
        </div>

        <div style={{ ...styles.kpiCard, ...styles.kpiPurple }}>
          <div style={styles.iconBoxPurple}>U</div>
          <div>
            <span style={styles.kpiLabel}>Unidades</span>
            <strong style={styles.kpiValuePurple}>
              {cantidadTexto(resumen.cantidadesPorUnidad.unidades)}
            </strong>
            <p style={styles.kpiText}>Solo tarifas con unidad Unidad</p>
          </div>
        </div>

        <div style={{ ...styles.kpiCard, ...styles.kpiRed }}>
          <div style={styles.iconBoxRed}>4%</div>
          <div>
            <span style={styles.kpiLabel}>Retención 4%</span>
            <strong style={styles.kpiValueRed}>{dinero(resumen.totalReteIva)}</strong>
            <p style={styles.kpiText}>{resumen.totalConReteIva} servicio(s)</p>
          </div>
        </div>
      </section>

      <section style={isMobile ? styles.kpiGridSmallMobile : styles.kpiGridSmall}>
        <div style={styles.payCard}>
          <span style={styles.payLabel}>Efectivo</span>
          <strong style={styles.payValue}>{dinero(resumen.pagos.efectivo)}</strong>
        </div>

        <div style={styles.payCard}>
          <span style={styles.payLabel}>Transferencia</span>
          <strong style={styles.payValue}>
            {dinero(resumen.pagos.transferencia)}
          </strong>
        </div>

        <div style={styles.payCard}>
          <span style={styles.payLabel}>Crédito</span>
          <strong style={styles.payValue}>{dinero(resumen.pagos.credito)}</strong>
        </div>
      </section>

      <section style={isMobile ? { ...styles.chartCard, ...styles.chartCardMobile } : styles.chartCard}>
        <h2 style={styles.sectionTitle}>📈 Servicios por día</h2>

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
        <div style={styles.tableTitleRow}>
          <h2 style={styles.tableTitle}>Detalle general de servicios</h2>
          <span style={styles.tableCount}>{servicios.length}</span>
        </div>

        <div style={styles.tableScroll}>
          <div style={isMobile ? styles.tableInnerMobile : undefined}>
            <div style={styles.tableHeaderGeneral}>
              <span>Soporte</span>
              <span>Fecha</span>
              <span>Cliente</span>
              <span>Vehículo</span>
              <span>Pago</span>
              <span>Total</span>
            </div>

            {loading ? (
              <div style={styles.empty}>Cargando reportes...</div>
            ) : servicios.length === 0 ? (
              <div style={styles.empty}>No hay datos para este filtro</div>
            ) : (
              servicios.map((s) => (
                <div key={s.id} style={styles.tableRowGeneral}>
                  <strong>{numeroSoporte(s)}</strong>
                  <span>{new Date(s.createdAt).toLocaleDateString("es-CO")}</span>
                  <span>{s.cliente?.nombre || "-"}</span>
                  <span>{s.vehiculo?.placa || "-"}</span>
                  <span>{textoPago(s.formaPago)}</span>
                  <strong>{dinero(valorRealServicio(s))}</strong>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={styles.tableFooter}>Mostrando {servicios.length} registro(s)</div>
      </section>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)",
    padding: "28px",
    fontFamily: "Arial, sans-serif",
    color: "#111827",
  },
  pageMobile: {
    padding: "18px 14px 88px 58px",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "26px",
    gap: "14px",
    flexWrap: "wrap",
  },
  topBarMobile: {
    marginBottom: "18px",
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
  filtersMobile: {
    gridTemplateColumns: "1fr",
    gap: "12px",
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
  errorBox: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#991b1b",
    borderRadius: "12px",
    padding: "14px",
    marginBottom: "18px",
    fontWeight: 800,
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "16px",
    marginBottom: "18px",
  },
  kpiGridMobile: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "12px",
    marginBottom: "14px",
  },
  kpiGridSmall: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "16px",
    marginBottom: "18px",
  },
  kpiGridSmallMobile: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "12px",
    marginBottom: "14px",
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
  kpiPurple: {
    background: "linear-gradient(135deg, #fff 0%, #f5f3ff 100%)",
  },
  kpiRed: {
    background: "linear-gradient(135deg, #fff 0%, #fef2f2 100%)",
  },
  kpiGray: {
    background: "linear-gradient(135deg, #fff 0%, #f9fafb 100%)",
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
    flex: "0 0 auto",
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
    flex: "0 0 auto",
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
    fontSize: "22px",
    flex: "0 0 auto",
  },
  iconBoxPurple: {
    width: "58px",
    height: "58px",
    borderRadius: "16px",
    display: "grid",
    placeItems: "center",
    background: "#ede9fe",
    color: "#7c3aed",
    fontWeight: 900,
    fontSize: "26px",
    flex: "0 0 auto",
  },
  iconBoxRed: {
    width: "58px",
    height: "58px",
    borderRadius: "16px",
    display: "grid",
    placeItems: "center",
    background: "#fee2e2",
    color: "#dc2626",
    fontWeight: 900,
    fontSize: "22px",
    flex: "0 0 auto",
  },
  iconBoxGray: {
    width: "58px",
    height: "58px",
    borderRadius: "16px",
    display: "grid",
    placeItems: "center",
    background: "#e5e7eb",
    color: "#374151",
    fontWeight: 900,
    fontSize: "22px",
    flex: "0 0 auto",
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
  kpiValuePurple: {
    display: "block",
    fontSize: "30px",
    color: "#7c3aed",
  },
  kpiValueRed: {
    display: "block",
    fontSize: "30px",
    color: "#dc2626",
  },
  kpiValueGray: {
    display: "block",
    fontSize: "30px",
    color: "#374151",
  },
  kpiText: {
    margin: "6px 0 0 0",
    color: "#6b7280",
    fontSize: "13px",
  },
  payCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "18px",
    boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
  },
  payLabel: {
    display: "block",
    color: "#4b5563",
    fontWeight: 800,
    marginBottom: "8px",
  },
  payValue: {
    color: "#111827",
    fontSize: "24px",
  },
  chartCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "22px",
    marginBottom: "18px",
    boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
  },
  chartCardMobile: {
    padding: "14px",
  },
  tableCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    overflow: "hidden",
    boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
    marginBottom: "18px",
  },
  tableScroll: {
    overflowX: "auto",
    WebkitOverflowScrolling: "touch",
  },
  tableInnerMobile: {
    minWidth: "760px",
  },
  tableTitleRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "18px",
    borderBottom: "1px solid #e5e7eb",
    gap: "12px",
  },
  tableTitle: {
    margin: 0,
    color: "#111827",
    fontSize: "20px",
  },
  tableCount: {
    background: "#111827",
    color: "#fff",
    borderRadius: "999px",
    padding: "6px 12px",
    fontWeight: 900,
  },
  tableHeaderGeneral: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 2fr 1fr 1fr 1fr",
    gap: "12px",
    background: "#f5c400",
    color: "#111827",
    padding: "15px",
    fontWeight: 900,
  },
  tableRowGeneral: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 2fr 1fr 1fr 1fr",
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
