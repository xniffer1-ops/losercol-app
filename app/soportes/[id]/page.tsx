import Link from "next/link";
import { prisma } from "@/src/lib/prisma";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function SoportePage({ params }: Props) {
  const { id } = await params;

  const servicio = await prisma.servicio.findUnique({
    where: { id: Number(id) },
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
        <h1>Soporte no encontrado</h1>
        <Link href="/servicios">← Volver</Link>
      </main>
    );
  }

  const numero =
    servicio.numeroSoporte || `SP-${String(servicio.id).padStart(6, "0")}`;

  return (
    <main style={styles.page}>
      <div style={styles.top}>
        <Link href="/servicios" style={styles.back}>
          ← Volver a servicios
        </Link>
        <button onClick={() => window.print()} style={styles.print}>
          Imprimir / PDF
        </button>
      </div>

      <section style={styles.factura}>
        <h2 style={styles.title}>Soporte De Servicio {numero}</h2>
        <p style={styles.date}>
          {new Date(servicio.createdAt).toLocaleDateString("es-CO")}
        </p>

        <div style={styles.rows}>
          <div style={styles.label}>Centro Operativo</div>
          <div style={styles.value}>{servicio.centroOperacion?.nombre}</div>

          <div style={styles.label}>Sección</div>
          <div style={styles.value}>{servicio.seccion?.nombre}</div>

          <div style={styles.label}>Placas</div>
          <div style={styles.blue}>{servicio.vehiculo?.placa}</div>

          <div style={styles.label}>ID Cliente</div>
          <div style={styles.blue}>{servicio.cliente?.ccNit}</div>

          <div style={styles.label}>Nombre Cliente</div>
          <div style={styles.value}>{servicio.cliente?.nombre}</div>

          <div style={styles.label}>Contacto</div>
          <div style={styles.value}>{servicio.cliente?.telefono}</div>

          <div style={styles.label}>Hora Inicio</div>
          <div style={styles.blueSmall}>Espacio Digitar</div>

          <div style={styles.label}>Hora Final</div>
          <div style={styles.blueSmall}>Espacio Digitar</div>

          <div style={styles.label}>ID Servicio</div>
          <div style={styles.blue}>{servicio.tarifa?.codigo}</div>

          <div style={styles.label}>Descripción Servicio</div>
          <div style={styles.value}>{servicio.descripcion}</div>

          <div style={styles.label}>Valor Unitario</div>
          <div style={styles.money}>
            <span>$</span>
            <span>{servicio.valorUnitario.toLocaleString("es-CO")}</span>
          </div>

          <div style={styles.label}>Cantidad</div>
          <div style={styles.blue}>{servicio.cantidad}</div>

          <div style={styles.label}>Unidad Medida</div>
          <div style={styles.value}>{servicio.unidadMedida}</div>

          <div style={styles.label}>Subtotal</div>
          <div style={styles.money}>
            <span>$</span>
            <span>{servicio.subtotal.toLocaleString("es-CO")}</span>
          </div>
        </div>

        <div style={styles.footer}>Adicional Servicio</div>
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
  top: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "20px",
  },
  back: {
    color: "#0b5cab",
    fontWeight: 700,
    textDecoration: "none",
  },
  print: {
    background: "#f5c400",
    border: "none",
    borderRadius: "8px",
    padding: "10px 16px",
    fontWeight: 700,
    cursor: "pointer",
  },
  factura: {
    width: "420px",
    minHeight: "620px",
    margin: "0 auto",
    background: "#fff",
    border: "2px solid #111",
    padding: "26px 18px",
  },
  title: {
    textAlign: "center",
    fontSize: "16px",
    margin: 0,
    fontWeight: 400,
  },
  date: {
    textAlign: "center",
    marginTop: "6px",
    marginBottom: "28px",
    fontSize: "16px",
  },
  rows: {
    display: "grid",
    gridTemplateColumns: "1fr 1.4fr",
    rowGap: "6px",
    columnGap: "16px",
    alignItems: "center",
    fontSize: "16px",
  },
  label: {
    textAlign: "right",
  },
  value: {
    textAlign: "center",
  },
  blue: {
    background: "#9bdcf0",
    padding: "4px",
    textAlign: "center",
    fontWeight: 700,
  },
  blueSmall: {
    background: "#9bdcf0",
    padding: "4px",
    textAlign: "center",
    fontSize: "11px",
    fontWeight: 700,
  },
  money: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
  },
  footer: {
    marginTop: "60px",
    marginLeft: "90px",
    background: "#f5c400",
    padding: "6px",
    textAlign: "center",
  },
};