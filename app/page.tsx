"use client";

import { useEffect, useState } from "react";
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

  const cantidad = (valor: number) =>
    Number(valor || 0).toLocaleString("es-CO", {
      maximumFractionDigits: 2,
    });

  if (!user) {
    return <main style={styles.page}>Cargando...</main>;
  }

  const puedeDashboard = tienePermiso(user, "dashboard");
  const menuItems = [
    {
      href: "/clientes",
      label: "Clientes",
      modulo: "clientes" as ModuloPermiso,
      icon: "👥",
      desc: "Administrar clientes",
    },
    {
      href: "/vehiculos",
      label: "Vehículos",
      modulo: "vehiculos" as ModuloPermiso,
      icon: "🚚",
      desc: "Registrar y consultar placas",
    },
    {
      href: "/centros",
      label: "Centros",
      modulo: "centros" as ModuloPermiso,
      icon: "🏭",
      desc: "Centros de operación",
    },
    {
      href: "/usuarios",
      label: "Usuarios",
      modulo: "usuarios" as ModuloPermiso,
      icon: "🔐",
      desc: "Accesos y permisos",
    },
    {
      href: "/tarifas",
      label: "Tarifas",
      modulo: "tarifas" as ModuloPermiso,
      icon: "🏷️",
      desc: "Valores de servicios",
    },
    {
      href: "/historial",
      label: "Historial",
      modulo: "historial" as ModuloPermiso,
      icon: "🕘",
      desc: "Registro de acciones",
    },
    {
      href: "/reportes",
      label: "Reportes",
      modulo: "reportes" as ModuloPermiso,
      icon: "📊",
      desc: "Informes y exportaciones",
    },
    {
      href: "/servicio-rapido",
      label: "Servicio rápido",
      modulo: "servicioRapido" as ModuloPermiso,
      icon: "➕",
      desc: "Crear soporte rápido",
    },
    {
      href: "/servicios",
      label: "Servicios",
      modulo: "servicios" as ModuloPermiso,
      icon: "📋",
      desc: "Consultar soportes",
    },
    {
      href: "/caja",
      label: "Caja",
      modulo: "caja" as ModuloPermiso,
      icon: "💰",
      desc: "Cuadre y cierre diario",
    },
  ].filter((item) => tienePermiso(user, item.modulo));

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
      <div style={styles.topBar}>
        <div>
          <p style={styles.userText}>
            Usuario: <strong>{user.nombre}</strong>
          </p>
          <p style={styles.userText}>
            Rol: <strong>{user.rol}</strong>
          </p>
        </div>

        <button onClick={cerrarSesion} style={styles.logoutButton}>
          Salir
        </button>
      </div>

      <h1 style={styles.title}>LOSERCOL</h1>
      <p style={styles.subtitle}>Dashboard operativo y panel principal</p>

      <section style={styles.dashboardFiltersCard}>
        <div>
          <label style={styles.filterLabel}>Fecha inicio</label>
          <input
            type="date"
            value={fechaInicioDashboard}
            onChange={(e) => setFechaInicioDashboard(e.target.value)}
            style={styles.filterInput}
          />
        </div>

        <div>
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

      <section style={styles.kpiGrid}>
        <Card title="Total facturado" value={dinero(data.totalRecaudado)} />
        <Card title="Facturado hoy" value={dinero(data.totalRecaudadoHoy)} />
        <Card title="Toneladas" value={cantidad(data.toneladas)} />
        <Card title="Toneladas hoy" value={cantidad(data.toneladasHoy)} />
        <Card title="Horas hombre" value={cantidad(data.horasHombre)} />
        <Card title="Horas hombre hoy" value={cantidad(data.horasHombreHoy)} />
        <Card title="Unidades" value={cantidad(data.unidades)} />
        <Card title="Unidades hoy" value={cantidad(data.unidadesHoy)} />
        <Card title="Vehículos descargados" value={data.vehiculosDescargados} />
        <Card title="Vehículos hoy" value={data.vehiculosDescargadosHoy} />
        <Card title="Placas únicas" value={data.placasUnicas} />
        <Card title="Placas hoy" value={data.placasUnicasHoy} />
      </section>

      <section style={styles.carpaGrid}>
        <Card
          title="Carpa Tracto Mula"
          value={data.carpas?.tractoMula?.cantidad || 0}
          sub={dinero(data.carpas?.tractoMula?.valor || 0)}
        />
        <Card
          title="Carpa Doble Troque"
          value={data.carpas?.dobleTroque?.cantidad || 0}
          sub={dinero(data.carpas?.dobleTroque?.valor || 0)}
        />
        <Card
          title="Carpa Sencillo"
          value={data.carpas?.sencillo?.cantidad || 0}
          sub={dinero(data.carpas?.sencillo?.valor || 0)}
        />
        <Card title="Valor total carpas" value={dinero(data.valorTotalCarpas)} />
      </section>

      <section style={styles.chartCard}>
        <h2 style={styles.sectionTitle}>Facturación por día</h2>

        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data.graficaPorDia || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="fecha" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="total"
              stroke="#f5c400"
              strokeWidth={4}
              dot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </section>

      <section style={styles.menuCard}>
        <h2 style={styles.sectionTitle}>Menú principal</h2>

        <div style={styles.menuGrid}>
          {menuItems.map((item) => (
            <MenuButton
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

function Card({
  title,
  value,
  sub,
}: {
  title: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div style={styles.card}>
      <span style={styles.cardTitle}>{title}</span>
      <strong style={styles.cardValue}>{value}</strong>
      {sub && <span style={styles.cardSub}>{sub}</span>}
    </div>
  );
}

function MenuButton({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: string;
}) {
  return (
    <Link href={href} style={styles.link}>
      <button style={styles.menuButton}>
        <span style={styles.menuIcon}>{icon}</span>
        <span>{label}</span>
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

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f2f2f2",
    padding: "30px",
    fontFamily: "Arial, sans-serif",
    color: "#111",
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

  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "18px",
  },

  userText: {
    margin: "0 0 5px 0",
    color: "#374151",
    fontSize: "15px",
  },

  logoutButton: {
    background: "#b91c1c",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    padding: "13px 22px",
    fontWeight: 800,
    cursor: "pointer",
    fontSize: "16px",
  },

  title: {
    textAlign: "center",
    fontSize: "44px",
    margin: "10px 0 4px",
    color: "#111",
    letterSpacing: "1px",
  },

  subtitle: {
    textAlign: "center",
    color: "#555",
    marginBottom: "26px",
    fontSize: "18px",
  },

  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "16px",
    marginBottom: "18px",
  },

  carpaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "16px",
    marginBottom: "22px",
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
    marginBottom: "10px",
    fontWeight: 700,
  },

  cardValue: {
    display: "block",
    color: "#111",
    fontSize: "28px",
    fontWeight: 800,
  },

  cardSub: {
    display: "block",
    marginTop: "8px",
    color: "#0b5cab",
    fontWeight: 700,
  },

  chartCard: {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "14px",
    padding: "22px",
    marginBottom: "24px",
    boxShadow: "0 3px 10px rgba(0,0,0,0.06)",
  },

  sectionTitle: {
    margin: "0 0 16px 0",
    color: "#111",
    fontSize: "24px",
  },

  menuCard: {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "14px",
    padding: "22px",
  },

  menuGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "18px",
  },

  link: {
    textDecoration: "none",
  },

  menuButton: {
    width: "100%",
    height: "105px",
    background: "#fff",
    border: "1px solid #ccc",
    borderRadius: "14px",
    fontSize: "20px",
    fontWeight: 800,
    color: "#111",
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
  },

  menuIcon: {
    fontSize: "30px",
  },

  dashboardFiltersCard: {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "14px",
    padding: "18px",
    marginBottom: "18px",
    display: "flex",
    gap: "12px",
    alignItems: "end",
    flexWrap: "wrap",
    boxShadow: "0 3px 10px rgba(0,0,0,0.06)",
  },

  filterLabel: {
    display: "block",
    marginBottom: "6px",
    color: "#374151",
    fontWeight: 700,
    fontSize: "14px",
  },

  filterInput: {
    height: "44px",
    borderRadius: "10px",
    border: "1px solid #ccc",
    padding: "0 12px",
    color: "#111",
    background: "#fff",
    fontSize: "14px",
  },

  filterButton: {
    height: "44px",
    background: "#f5c400",
    color: "#111",
    border: "none",
    borderRadius: "10px",
    padding: "0 18px",
    fontWeight: 900,
    cursor: "pointer",
  },

  filterSecondaryButton: {
    height: "44px",
    background: "#fff",
    color: "#111",
    border: "1px solid #ccc",
    borderRadius: "10px",
    padding: "0 18px",
    fontWeight: 900,
    cursor: "pointer",
  },

  errorText: {
    color: "#b91c1c",
    fontWeight: 800,
  },
};
