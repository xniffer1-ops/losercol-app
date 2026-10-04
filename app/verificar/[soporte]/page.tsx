import { prisma } from "@/src/lib/prisma";

export const dynamic = "force-dynamic";

const IVA_PORCENTAJE = 0.19;
const RETEFUENTE_PORCENTAJE = 0.04;

function normalizarNumeroSoporte(soporte: string) {
  const texto = String(soporte || "").trim().toUpperCase().replace(/\s+/g, "");
  const match = texto.match(/^SP-?(\d+)$/);
  if (!match) return texto;
  return `SP-${String(Number(match[1])).padStart(6, "0")}`;
}

function extraerIdDesdeSoporte(soporte: string) {
  const limpio = soporte.toUpperCase().replace("SP-", "");
  const id = Number(limpio);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function redondearPesos(valor: number) {
  return Math.round(valor);
}

function valorSinIva(valorConIva: number) {
  return redondearPesos(Number(valorConIva || 0) / (1 + IVA_PORCENTAJE));
}

function valorCarpaLegacy(tipoCarpa: string) {
  if (tipoCarpa === "Tracto Mula") return 46500;
  if (tipoCarpa === "Media Tracto Mula") return 23250;
  if (tipoCarpa === "Doble Troque") return 23150;
  if (tipoCarpa === "Media Doble Troque") return 11575;
  if (tipoCarpa === "Sencillo") return 16950;
  if (tipoCarpa === "Media Sencillo") return 8475;
  return 0;
}

function calcularValores(servicio: {
  valorUnitario: number;
  cantidad: number;
  subtotal?: number | null;
  tipoCarpa?: string | null;
  reteIva?: boolean | null;
  totalNeto?: number | null;
  tarifa?: { valorUnitario?: number | null } | null;
}) {
  const cantidad = Number(servicio.cantidad || 0);
  const valorGuardado = Number(servicio.valorUnitario || 0);
  const valorTarifaConIva = Number(servicio.tarifa?.valorUnitario || 0);
  const valorUnitarioSinIva =
    valorTarifaConIva > 0 && Math.abs(valorGuardado - valorTarifaConIva) <= 1
      ? valorSinIva(valorTarifaConIva)
      : valorGuardado;
  const valorServicio = redondearPesos(valorUnitarioSinIva * cantidad);

  const valorAdicionalCarpa = valorSinIva(valorCarpaLegacy(String(servicio.tipoCarpa || "")));
  const subtotalSinIva = redondearPesos(valorServicio + valorAdicionalCarpa);
  const ivaIncluido = redondearPesos(subtotalSinIva * IVA_PORCENTAJE);
  const totalConIva = redondearPesos(subtotalSinIva + ivaIncluido);
  const valorReteIva = servicio.reteIva
    ? redondearPesos(subtotalSinIva * RETEFUENTE_PORCENTAJE)
    : 0;
  const totalNeto = redondearPesos(totalConIva - valorReteIva);

  return {
    valorUnitarioSinIva,
    valorServicio,
    valorAdicionalCarpa,
    totalConIva,
    baseAntesIva: subtotalSinIva,
    ivaIncluido,
    valorReteIva,
    totalNeto,
  };
}

function formatoPesos(valor: number) {
  return `$${Number(valor || 0).toLocaleString("es-CO")}`;
}

function textoMayuscula(valor: unknown, respaldo = "-") {
  const texto = String(valor || "").trim();
  return texto ? texto.toLocaleUpperCase("es-CO") : respaldo;
}

function textoTarifa(
  servicio: {
    categoria?: string | null;
    presentacion?: string | null;
    tarifa?: { codigo?: string | null } | null;
  },
  valorUnitarioSinIva: number,
  valorAdicionalCarpa = 0
) {
  const codigo = String(servicio.tarifa?.codigo || "").trim();

  if (codigo) {
    return `${textoMayuscula(codigo)} · ${formatoPesos(valorUnitarioSinIva)}`;
  }

  const esCarpa = String(`${servicio.categoria || ""} ${servicio.presentacion || ""}`)
    .toLowerCase()
    .includes("carpa");

  if (esCarpa || valorAdicionalCarpa > 0) {
    return `CARPA · ${formatoPesos(valorAdicionalCarpa)}`;
  }

  return "N/A";
}

function textoCarpa(servicio: { tipoCarpa?: string | null }, valorAdicionalCarpa: number) {
  const tipoCarpa = String(servicio.tipoCarpa || "").trim();

  if (!tipoCarpa || valorAdicionalCarpa <= 0) {
    return "SIN CARPA";
  }

  return `${textoMayuscula(tipoCarpa)} · ${formatoPesos(valorAdicionalCarpa)}`;
}

function formatoFecha(fecha: Date) {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(fecha);
}

type Params = {
  params: Promise<{
    soporte: string;
  }>;
};

export default async function VerificarSoportePage({ params }: Params) {
  const { soporte: soporteParam } = await params;
  const soporte = normalizarNumeroSoporte(
    decodeURIComponent(soporteParam || "").trim()
  );
  const idDesdeSoporte = extraerIdDesdeSoporte(soporte);

  const servicio = await prisma.servicio.findFirst({
    where: {
      OR: [
        { numeroSoporte: soporte },
        ...(idDesdeSoporte ? [{ id: idDesdeSoporte }] : []),
      ],
    },
    include: {
      cliente: true,
      vehiculo: true,
      centroOperacion: true,
      tarifa: true,
      seccion: true,
    },
  });

  if (!servicio) {
    return (
      <main style={styles.page}>
        <section style={styles.card}>
          <div style={styles.logo}>LOSERCOL</div>
          <div style={styles.badgeError}>NO ENCONTRADO</div>
          <h1 style={styles.title}>Soporte no válido</h1>
          <p style={styles.text}>
            El soporte <strong>{soporte || "consultado"}</strong> no aparece registrado
            en la base de datos.
          </p>
          <p style={styles.warning}>
            Verifica que el número esté bien escrito o comunícate con LOSERCOL.
          </p>
        </section>
      </main>
    );
  }

  const valores = calcularValores(servicio);
  const numero = servicio.numeroSoporte || `SP-${String(servicio.id).padStart(6, "0")}`;

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.header}>
          <div>
            <div style={styles.logo}>LOSERCOL</div>
            <p style={styles.subtitle}>Verificación de soporte</p>
          </div>

          <div style={styles.badgeOk}>VÁLIDO</div>
        </div>

        <h1 style={styles.title}>{numero}</h1>

        <div style={styles.notice}>
          Este soporte fue encontrado en la base de datos de LOSERCOL. Compara
          estos datos con el PDF o imagen que recibiste.
        </div>

        <div style={styles.grid}>
          <Item label="Fecha" value={formatoFecha(servicio.createdAt)} />
          <Item label="Cliente" value={textoMayuscula(servicio.cliente?.nombre)} />
          <Item label="Documento / NIT" value={textoMayuscula(servicio.cliente?.ccNit)} />
          <Item label="Vehículo / referencia" value={textoMayuscula(servicio.vehiculo?.placa)} />
          <Item label="Centro" value={textoMayuscula(servicio.centroOperacion?.nombre)} />
          <Item label="Sección" value={textoMayuscula(servicio.seccion?.nombre)} />
          <Item label="Descripción" value={textoMayuscula(servicio.descripcion)} />
          <Item label="Tarifa / valor unitario sin IVA" value={textoTarifa(servicio, valores.valorUnitarioSinIva, valores.valorAdicionalCarpa)} />
          <Item label="Carpa sin IVA" value={textoCarpa(servicio, valores.valorAdicionalCarpa)} />
          <Item label="Cantidad" value={Number(servicio.cantidad || 0).toLocaleString("es-CO")} />
          <Item label="Forma de pago" value={textoMayuscula(servicio.formaPago)} />
        </div>

        <div style={styles.totalBox}>
          <div>
            <span style={styles.totalLabel}>Subtotal sin IVA</span>
            <strong style={styles.totalValue}>{formatoPesos(valores.baseAntesIva)}</strong>
          </div>

          <div>
            <span style={styles.totalLabel}>Retefuente 4%</span>
            <strong style={styles.totalValue}>
              {valores.valorReteIva > 0
                ? `-${formatoPesos(valores.valorReteIva)}`
                : "$0"}
            </strong>
          </div>

          <div>
            <span style={styles.totalLabel}>IVA 19%</span>
            <strong style={styles.totalValue}>{formatoPesos(valores.ivaIncluido)}</strong>
          </div>

          <div>
            <span style={styles.totalLabel}>Total neto</span>
            <strong style={styles.totalValue}>{formatoPesos(valores.totalNeto)}</strong>
          </div>
        </div>

        <p style={styles.footer}>
          Si algún dato no coincide con el documento recibido, solicita una
          validación directa a LOSERCOL antes de aceptarlo.
        </p>

        
      </section>
    </main>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.item}>
      <span style={styles.itemLabel}>{label}</span>
      <strong style={styles.itemValue}>{value}</strong>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f1f5f9",
    padding: "24px",
    fontFamily: "Arial, sans-serif",
    color: "#0f172a",
  },
  card: {
    maxWidth: "760px",
    margin: "0 auto",
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "20px",
    padding: "26px",
    boxShadow: "0 18px 45px rgba(15, 23, 42, 0.12)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    alignItems: "flex-start",
    marginBottom: "18px",
  },
  logo: {
    fontSize: "30px",
    fontWeight: 900,
    letterSpacing: "1px",
    color: "#0f172a",
  },
  subtitle: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: "14px",
  },
  badgeOk: {
    background: "#dcfce7",
    color: "#166534",
    border: "1px solid #86efac",
    borderRadius: "999px",
    padding: "8px 14px",
    fontWeight: 900,
    fontSize: "13px",
  },
  badgeError: {
    display: "inline-block",
    background: "#fee2e2",
    color: "#991b1b",
    border: "1px solid #fecaca",
    borderRadius: "999px",
    padding: "8px 14px",
    fontWeight: 900,
    fontSize: "13px",
    marginTop: "14px",
  },
  title: {
    margin: "0 0 16px",
    fontSize: "34px",
  },
  text: {
    fontSize: "16px",
    lineHeight: 1.5,
  },
  warning: {
    background: "#fff7ed",
    border: "1px solid #fed7aa",
    color: "#9a3412",
    borderRadius: "12px",
    padding: "14px",
    fontWeight: 700,
  },
  notice: {
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    color: "#1d4ed8",
    borderRadius: "14px",
    padding: "14px",
    marginBottom: "18px",
    fontWeight: 700,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "12px",
  },
  item: {
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "12px",
    background: "#f8fafc",
  },
  itemLabel: {
    display: "block",
    color: "#64748b",
    fontSize: "12px",
    marginBottom: "5px",
  },
  itemValue: {
    fontSize: "15px",
    color: "#0f172a",
    lineHeight: 1.25,
    wordBreak: "break-word",
  },
  totalBox: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "12px",
    marginTop: "18px",
    background: "#0f172a",
    borderRadius: "16px",
    padding: "16px",
    color: "#ffffff",
  },
  totalLabel: {
    display: "block",
    color: "#cbd5e1",
    fontSize: "12px",
    marginBottom: "5px",
  },
  totalValue: {
    fontSize: "20px",
  },
  footer: {
    color: "#475569",
    marginTop: "18px",
    lineHeight: 1.5,
  },
  link: {
    display: "inline-flex",
    marginTop: "12px",
    color: "#0b5cab",
    fontWeight: 800,
    textDecoration: "none",
  },
};
