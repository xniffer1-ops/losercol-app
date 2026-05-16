"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type AccionPermiso =
  | "ver"
  | "crear"
  | "editar"
  | "eliminar"
  | "pdf"
  | "whatsapp"
  | "cerrar"
  | "reabrir"
  | "exportar"
  | "cambiarPassword"
  | "cambiarRol";

type ModuloPermiso =
  | "dashboard"
  | "clientes"
  | "vehiculos"
  | "centros"
  | "tarifas"
  | "servicioRapido"
  | "servicios"
  | "caja"
  | "reportes"
  | "historial"
  | "usuarios"
  | "backup";

type PermisosUsuario = Record<ModuloPermiso, Partial<Record<AccionPermiso, boolean>>>;

type User = {
  id: number;
  nombre: string;
  email: string;
  rol: "superadmin" | "admin" | "auxiliar" | "operador";
  permisos?: PermisosUsuario;
} | null;

type MenuItem = {
  href: string;
  label: string;
  modulo: ModuloPermiso;
  icon: string;
  desc: string;
  grupo: "operacion" | "administracion" | "control";
};

function fechaColombiaInput(fecha = new Date()) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(fecha);

  const year = partes.find((parte) => parte.type === "year")?.value || "";
  const month = partes.find((parte) => parte.type === "month")?.value || "";
  const day = partes.find((parte) => parte.type === "day")?.value || "";

  return `${year}-${month}-${day}`;
}

const fechaHoyInput = () => fechaColombiaInput();

const primerDiaMesInput = () => {
  const fechaColombia = fechaHoyInput();
  return `${fechaColombia.slice(0, 8)}01`;
};

function tienePermiso(
  user: User,
  modulo: ModuloPermiso,
  accion: AccionPermiso = "ver"
) {
  if (!user) return false;
  if (user.rol === "superadmin") return true;
  return Boolean(user.permisos?.[modulo]?.[accion]);
}

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [user, setUser] = useState<User>(null);
  const [fechaInicioDashboard, setFechaInicioDashboard] = useState(primerDiaMesInput());
  const [fechaFinDashboard, setFechaFinDashboard] = useState(fechaHoyInput());
  const [mensaje, setMensaje] = useState("");

  const cargarDashboard = async (
    inicio = fechaInicioDashboard,
    fin = fechaFinDashboard
  ) => {
    const params = new URLSearchParams();

    if (inicio) params.set("fechaInicio", inicio);
    if (fin) params.set("fechaFin", fin);

    const query = params.toString() ? `?${params.toString()}` : "";
    const resDash = await fetch(`/api/dashboard${query}`, {
      cache: "no-store",
    });
    const dashData = await resDash.json();

    if (!resDash.ok) {
      setMensaje(dashData.error || "Error cargando dashboard");
      setData(null);
      return;
    }

    setMensaje("");
    setData(dashData);
  };

  useEffect(() => {
    const cargar = async () => {
      try {
        const resUser = await fetch("/api/me", { cache: "no-store" });
        const userData = await resUser.json();
        setUser(userData);

        if (
          userData?.rol === "admin" ||
          userData?.rol === "superadmin" ||
          userData?.permisos?.dashboard?.ver
        ) {
          await cargarDashboard();
        }
      } catch {
        setUser(null);
        setMensaje("Error de conexión cargando el sistema");
      }
    };

    void cargar();
  }, []);

  const cerrarSesion = async () => {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  };

  const dinero = (valor: number) =>
    `$${Math.round(valor || 0).toLocaleString("es-CO")}`;

  const cantidad = (valor: number, sufijo = "") => {
    const formateado = Number(valor || 0).toLocaleString("es-CO", {
      maximumFractionDigits: 2,
    });

    return sufijo ? `${formateado} ${sufijo}` : formateado;
  };

  const graficaOrdenada = useMemo(() => {
    const lista = Array.isArray(data?.graficaPorDia) ? [...data.graficaPorDia] : [];

    return lista.sort((a, b) => {
      const parseFecha = (fecha: string) => {
        const [dia, mes, year] = String(fecha || "").split("/");
        return new Date(Number(year), Number(mes) - 1, Number(dia)).getTime();
      };

      return parseFecha(a.fecha) - parseFecha(b.fecha);
    });
  }, [data]);

  if (!user) {
    return <main style={styles.page}>Cargando...</main>;
  }

  const puedeDashboard = tienePermiso(user, "dashboard");

  const menuItemsBase: MenuItem[] = [
    {
      href: "/servicio-rapido",
      label: "Servicio rápido",
      modulo: "servicioRapido",
      icon: "➕",
      desc: "Crear soporte rápido",
      grupo: "operacion",
    },
    {
      href: "/servicios",
      label: "Servicios",
      modulo: "servicios",
      icon: "📋",
      desc: "Consultar soportes",
      grupo: "operacion",
    },
    {
      href: "/caja",
      label: "Caja",
      modulo: "caja",
      icon: "💰",
      desc: "Cuadre y cierre diario",
      grupo: "operacion",
    },
    {
      href: "/clientes",
      label: "Clientes",
      modulo: "clientes",
      icon: "👥",
      desc: "Administrar clientes",
      grupo: "administracion",
    },
    {
      href: "/vehiculos",
      label: "Vehículos",
      modulo: "vehiculos",
      icon: "🚚",
      desc: "Registrar y consultar placas",
      grupo: "administracion",
    },
    {
      href: "/centros",
      label: "Centros",
      modulo: "centros",
      icon: "🏭",
      desc: "Centros de operación",
      grupo: "administracion",
    },
    {
      href: "/tarifas",
      label: "Tarifas",
      modulo: "tarifas",
      icon: "🏷️",
      desc: "Valores de servicios",
      grupo: "administracion",
    },
    {
      href: "/reportes",
      label: "Reportes",
      modulo: "reportes",
      icon: "📊",
      desc: "Informes y exportaciones",
      grupo: "control",
    },
    {
      href: "/usuarios",
      label: "Usuarios",
      modulo: "usuarios",
      icon: "🔐",
      desc: "Accesos y permisos",
      grupo: "control",
    },
    {
      href: "/historial",
      label: "Historial",
      modulo: "historial",
      icon: "🕘",
      desc: "Registro de acciones",
      grupo: "control",
    },
  ];

  const menuItems = menuItemsBase.filter((item) =>
    tienePermiso(user, item.modulo)
  );

  const menuOperacion = menuItems.filter((item) => item.grupo === "operacion");
  const menuAdministracion = menuItems.filter((item) => item.grupo === "administracion");
  const menuControl = menuItems.filter((item) => item.grupo === "control");

  if (!puedeDashboard || !data) {
    return (
      <main style={styles.operatorPage}>
        <div style={styles.operatorTop}>
          <div>
            <h1 style={styles.operatorTitle}>LOSERCOL</h1>
            <p style={styles.operatorSubtitle}>
              Hola, <strong>{user.nombre}</strong>
            </p>
          </div>

          <button onClick={cerrarSesion} style={styles.logoutButton}>
            Salir
          </button>
        </div>

        <section style={styles.quickCard}>
          <h2 style={styles.quickTitle}>Panel de trabajo</h2>
          <p style={styles.quickText}>
            Selecciona el módulo que necesitas para continuar.
          </p>

          <div style={styles.operatorGrid}>
            {menuItems.map((item) => (
              <QuickButton
                key={item.href}
                href={item.href}
                title={item.label}
                desc={item.desc}
                icon={item.icon}
              />
            ))}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <div>
          <div style={styles.brandRow}>
            <span style={styles.brandMark}>L</span>
            <div>
              <h1 style={styles.title}>LOSERCOL</h1>
              <p style={styles.subtitle}>Dashboard operativo y panel principal</p>
            </div>
          </div>

          <div style={styles.userPill}>
            <span>Usuario: <strong>{user.nombre}</strong></span>
            <span>Rol: <strong>{user.rol}</strong></span>
          </div>
        </div>

        <button onClick={cerrarSesion} style={styles.logoutButton}>
          Salir
        </button>
      </section>

      <section style={styles.dashboardFiltersCard}>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Fecha inicio</label>
          <input
            type="date"
            value={fechaInicioDashboard}
            onChange={(e) => setFechaInicioDashboard(e.target.value)}
            style={styles.filterInput}
          />
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Fecha fin</label>
          <input
            type="date"
            value={fechaFinDashboard}
            onChange={(e) => setFechaFinDashboard(e.target.value)}
            style={styles.filterInput}
          />
        </div>

        <button
          onClick={() =>
            void cargarDashboard(fechaInicioDashboard, fechaFinDashboard)
          }
          style={styles.filterButton}
        >
          Aplicar filtro
        </button>

        <button
          onClick={() => {
            const inicio = primerDiaMesInput();
            const fin = fechaHoyInput();
            setFechaInicioDashboard(inicio);
            setFechaFinDashboard(fin);
            void cargarDashboard(inicio, fin);
          }}
          style={styles.filterSecondaryButton}
        >
          Mes actual
        </button>
      </section>

      {mensaje && <p style={styles.errorText}>{mensaje}</p>}

      <section style={styles.summaryGrid}>
        <Card title="Total facturado" value={dinero(data.totalRecaudado)} icon="💵" tone="green" />
        <Card title="Facturado hoy" value={dinero(data.totalRecaudadoHoy)} icon="📆" tone="blue" />
        <Card title="Toneladas" value={cantidad(data.toneladas, "t")} icon="⚖️" tone="yellow" />
        <Card title="Horas hombre" value={cantidad(data.horasHombre, "h/h")} icon="👷" tone="purple" />
        <Card title="Unidades" value={cantidad(data.unidades, "und")} icon="📦" tone="gray" />
        <Card title="Vehículos descargados" value={data.vehiculosDescargados} icon="🚚" tone="blue" />
      </section>

      <section style={styles.chartCard}>
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Facturación por día</h2>
            <p style={styles.sectionText}>Valores diarios del rango seleccionado.</p>
          </div>

          <div style={styles.chartMiniStats}>
            <span>Placas únicas: <strong>{data.placasUnicas}</strong></span>
            <span>Carpas: <strong>{data.carpas?.tractoMula?.cantidad + data.carpas?.dobleTroque?.cantidad + data.carpas?.sencillo?.cantidad || 0}</strong></span>
            <span>Valor carpas: <strong>{dinero(data.valorTotalCarpas)}</strong></span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={graficaOrdenada}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="fecha" />
            <YAxis tickFormatter={(value) => `$${Number(value).toLocaleString("es-CO")}`} />
            <Tooltip content={<CustomTooltip dinero={dinero} cantidad={cantidad} />} />
            <Line
              type="monotone"
              dataKey="total"
              stroke="#f5c400"
              strokeWidth={4}
              dot={{ r: 5, fill: "#fff", stroke: "#f5c400", strokeWidth: 3 }}
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </section>

      <section style={styles.detailGrid}>
        <div style={styles.detailCard}>
          <h2 style={styles.sectionTitle}>Hoy</h2>
          <div style={styles.detailRows}>
            <DetailItem label="Toneladas hoy" value={cantidad(data.toneladasHoy, "t")} />
            <DetailItem label="Horas hombre hoy" value={cantidad(data.horasHombreHoy, "h/h")} />
            <DetailItem label="Unidades hoy" value={cantidad(data.unidadesHoy, "und")} />
            <DetailItem label="Vehículos hoy" value={data.vehiculosDescargadosHoy} />
            <DetailItem label="Placas hoy" value={data.placasUnicasHoy} />
          </div>
        </div>

        <div style={styles.detailCard}>
          <h2 style={styles.sectionTitle}>Carpas</h2>
          <div style={styles.detailRows}>
            <DetailItem
              label="Tracto Mula"
              value={`${data.carpas?.tractoMula?.cantidad || 0} / ${dinero(
                data.carpas?.tractoMula?.valor || 0
              )}`}
            />
            <DetailItem
              label="Doble Troque"
              value={`${data.carpas?.dobleTroque?.cantidad || 0} / ${dinero(
                data.carpas?.dobleTroque?.valor || 0
              )}`}
            />
            <DetailItem
              label="Sencillo"
              value={`${data.carpas?.sencillo?.cantidad || 0} / ${dinero(
                data.carpas?.sencillo?.valor || 0
              )}`}
            />
            <DetailItem label="Valor total carpas" value={dinero(data.valorTotalCarpas)} />
          </div>
        </div>
      </section>

      <section style={styles.menuCard}>
        <h2 style={styles.sectionTitle}>Menú principal</h2>
        <p style={styles.sectionText}>Accesos principales organizados por área.</p>

        <MenuGroup title="Operación" items={menuOperacion} />
        <MenuGroup title="Administración" items={menuAdministracion} />
        <MenuGroup title="Control" items={menuControl} />
      </section>
    </main>
  );
}

function CustomTooltip({
  active,
  payload,
  label,
  dinero,
  cantidad,
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
  dinero: (valor: number) => string;
  cantidad: (valor: number, sufijo?: string) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const item = payload[0]?.payload || {};

  return (
    <div style={styles.tooltip}>
      <strong style={styles.tooltipTitle}>{label}</strong>
      <span>Total: {dinero(Number(item.total || 0))}</span>
      <span>Servicios: {Number(item.servicios || 0).toLocaleString("es-CO")}</span>
      <span>Toneladas: {cantidad(Number(item.toneladas || 0), "t")}</span>
      <span>Horas hombre: {cantidad(Number(item.horasHombre || 0), "h/h")}</span>
      <span>Unidades: {cantidad(Number(item.unidades || 0), "und")}</span>
    </div>
  );
}

function Card({
  title,
  value,
  sub,
  icon,
  tone = "default",
}: {
  title: string;
  value: string | number;
  sub?: string;
  icon?: string;
  tone?: "default" | "green" | "blue" | "yellow" | "purple" | "orange" | "gray";
}) {
  return (
    <div style={{ ...styles.card, ...(toneStyles[tone] || {}) }}>
      <div style={styles.cardTop}>
        {icon && <span style={styles.cardIcon}>{icon}</span>}
        <span style={styles.cardTitle}>{title}</span>
      </div>
      <strong style={styles.cardValue}>{value}</strong>
      {sub && <span style={styles.cardSub}>{sub}</span>}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={styles.detailRow}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MenuGroup({ title, items }: { title: string; items: MenuItem[] }) {
  if (items.length === 0) return null;

  return (
    <div style={styles.menuGroup}>
      <h3 style={styles.menuGroupTitle}>{title}</h3>
      <div style={styles.menuGrid}>
        {items.map((item) => (
          <MenuButton
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            desc={item.desc}
          />
        ))}
      </div>
    </div>
  );
}

function MenuButton({
  href,
  label,
  icon,
  desc,
}: {
  href: string;
  label: string;
  icon: string;
  desc: string;
}) {
  return (
    <Link href={href} style={styles.link}>
      <button style={styles.menuButton}>
        <span style={styles.menuIcon}>{icon}</span>
        <span style={styles.menuLabel}>{label}</span>
        <small style={styles.menuDesc}>{desc}</small>
      </button>
    </Link>
  );
}

function QuickButton({
  href,
  title,
  desc,
  icon,
}: {
  href: string;
  title: string;
  desc: string;
  icon: string;
}) {
  return (
    <Link href={href} style={{ ...styles.link, ...styles.quickButton }}>
      <span style={styles.quickIcon}>{icon}</span>
      <div>
        <strong style={styles.quickButtonTitle}>{title}</strong>
        <span style={styles.quickButtonDesc}>{desc}</span>
      </div>
    </Link>
  );
}

const toneStyles: Record<string, React.CSSProperties> = {
  default: {},
  green: {
    background: "linear-gradient(135deg, #ffffff 0%, #ecfdf5 100%)",
  },
  blue: {
    background: "linear-gradient(135deg, #ffffff 0%, #eff6ff 100%)",
  },
  yellow: {
    background: "linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)",
  },
  purple: {
    background: "linear-gradient(135deg, #ffffff 0%, #f5f3ff 100%)",
  },
  orange: {
    background: "linear-gradient(135deg, #ffffff 0%, #fff7ed 100%)",
  },
  gray: {
    background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
  },
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f2f4f7",
    padding: "22px",
    fontFamily: "Arial, sans-serif",
    color: "#111827",
  },

  operatorPage: {
    minHeight: "100vh",
    background: "#f3f4f6",
    padding: "18px",
    fontFamily: "Arial, sans-serif",
    color: "#111",
  },

  operatorTop: {
    background: "#111827",
    color: "#fff",
    borderRadius: "18px",
    padding: "20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "18px",
  },

  operatorTitle: {
    margin: 0,
    fontSize: "30px",
    fontWeight: 900,
    letterSpacing: "1px",
  },

  operatorSubtitle: {
    margin: "6px 0 0",
    color: "#e5e7eb",
    fontSize: "16px",
  },

  quickCard: {
    background: "#fff",
    borderRadius: "20px",
    padding: "22px",
    boxShadow: "0 8px 25px rgba(0,0,0,0.08)",
  },

  quickTitle: {
    margin: 0,
    fontSize: "28px",
    fontWeight: 900,
  },

  quickText: {
    margin: "8px 0 20px",
    color: "#6b7280",
    fontSize: "16px",
  },

  operatorGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "16px",
  },

  quickButton: {
    minHeight: "120px",
    background: "#f9fafb",
    border: "2px solid #e5e7eb",
    borderRadius: "18px",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    gap: "16px",
    cursor: "pointer",
    boxSizing: "border-box",
  },

  quickIcon: {
    fontSize: "36px",
  },

  quickButtonTitle: {
    display: "block",
    fontSize: "21px",
    fontWeight: 900,
    color: "#111827",
    marginBottom: "6px",
  },

  quickButtonDesc: {
    display: "block",
    color: "#6b7280",
    fontSize: "15px",
    lineHeight: 1.4,
  },

  hero: {
    background: "#111827",
    color: "#fff",
    borderRadius: "20px",
    padding: "22px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
    boxShadow: "0 12px 30px rgba(17, 24, 39, 0.16)",
    gap: "18px",
    flexWrap: "wrap",
  },

  brandRow: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },

  brandMark: {
    width: "50px",
    height: "50px",
    borderRadius: "16px",
    display: "grid",
    placeItems: "center",
    background: "#f5c400",
    color: "#111827",
    fontWeight: 900,
    fontSize: "28px",
  },

  userPill: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginTop: "10px",
    color: "#e5e7eb",
    fontSize: "14px",
  },

  logoutButton: {
    background: "#b91c1c",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    padding: "12px 22px",
    fontWeight: 800,
    cursor: "pointer",
    fontSize: "15px",
  },

  title: {
    fontSize: "40px",
    margin: "0 0 2px",
    color: "#fff",
    letterSpacing: "1px",
    lineHeight: 1,
  },

  subtitle: {
    color: "#d1d5db",
    margin: 0,
    fontSize: "15px",
  },

  dashboardFiltersCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    padding: "16px",
    marginBottom: "16px",
    display: "flex",
    gap: "12px",
    alignItems: "end",
    flexWrap: "wrap",
    boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
  },

  filterGroup: {
    display: "grid",
    gap: "6px",
  },

  filterLabel: {
    display: "block",
    color: "#374151",
    fontWeight: 700,
    fontSize: "13px",
  },

  filterInput: {
    height: "42px",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    padding: "0 12px",
    color: "#111",
    background: "#fff",
    fontSize: "14px",
  },

  filterButton: {
    height: "42px",
    background: "#f5c400",
    color: "#111",
    border: "none",
    borderRadius: "10px",
    padding: "0 18px",
    fontWeight: 900,
    cursor: "pointer",
  },

  filterSecondaryButton: {
    height: "42px",
    background: "#fff",
    color: "#111",
    border: "1px solid #d1d5db",
    borderRadius: "10px",
    padding: "0 18px",
    fontWeight: 900,
    cursor: "pointer",
  },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(215px, 1fr))",
    gap: "14px",
    marginBottom: "16px",
  },

  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "15px",
    padding: "16px",
    boxShadow: "0 3px 10px rgba(0,0,0,0.055)",
    minHeight: "96px",
  },

  cardTop: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    marginBottom: "9px",
  },

  cardIcon: {
    width: "32px",
    height: "32px",
    borderRadius: "10px",
    display: "grid",
    placeItems: "center",
    background: "rgba(17, 24, 39, 0.06)",
    fontSize: "17px",
  },

  cardTitle: {
    display: "block",
    color: "#4b5563",
    fontSize: "13px",
    fontWeight: 800,
  },

  cardValue: {
    display: "block",
    color: "#111827",
    fontSize: "25px",
    fontWeight: 900,
    lineHeight: 1.15,
    overflowWrap: "anywhere",
  },

  cardSub: {
    display: "block",
    marginTop: "8px",
    color: "#0b5cab",
    fontWeight: 800,
  },

  chartCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "18px",
    padding: "20px",
    marginBottom: "16px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    marginBottom: "14px",
    flexWrap: "wrap",
  },

  sectionTitle: {
    margin: "0 0 4px 0",
    color: "#111827",
    fontSize: "22px",
  },

  sectionText: {
    margin: 0,
    color: "#6b7280",
    fontSize: "14px",
  },

  chartMiniStats: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    color: "#374151",
    fontSize: "13px",
  },

  detailGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))",
    gap: "16px",
    marginBottom: "16px",
  },

  detailCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "18px",
    padding: "18px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.055)",
  },

  detailRows: {
    display: "grid",
    gap: "10px",
    marginTop: "12px",
  },

  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    borderBottom: "1px solid #f1f5f9",
    paddingBottom: "9px",
    color: "#4b5563",
    fontSize: "14px",
  },

  tooltip: {
    background: "#111827",
    color: "#fff",
    borderRadius: "12px",
    padding: "12px",
    display: "grid",
    gap: "5px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.22)",
    border: "1px solid rgba(255,255,255,0.12)",
  },

  tooltipTitle: {
    color: "#f5c400",
    marginBottom: "4px",
  },

  menuCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "18px",
    padding: "20px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.055)",
  },

  menuGroup: {
    marginTop: "16px",
  },

  menuGroupTitle: {
    margin: "0 0 10px",
    fontSize: "17px",
    color: "#374151",
  },

  menuGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
    gap: "12px",
  },

  link: {
    textDecoration: "none",
  },

  menuButton: {
    width: "100%",
    minHeight: "96px",
    background: "#fff",
    border: "1px solid #d1d5db",
    borderRadius: "15px",
    color: "#111827",
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    display: "grid",
    alignContent: "center",
    justifyItems: "center",
    gap: "5px",
    padding: "14px",
  },

  menuIcon: {
    fontSize: "27px",
  },

  menuLabel: {
    fontSize: "18px",
    fontWeight: 900,
  },

  menuDesc: {
    color: "#6b7280",
    fontSize: "12px",
  },

  errorText: {
    color: "#b91c1c",
    fontWeight: 800,
  },
};
