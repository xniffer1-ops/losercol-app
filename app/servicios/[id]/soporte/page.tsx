"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import jsPDF from "jspdf";

type Servicio = {
  id: number;
  numeroSoporte?: string | null;
  descripcion: string;
  valorUnitario: number;
  cantidad: number;
  subtotal: number;
  unidadMedida?: string | null;
  tipoCarpa?: string | null;
  formaPago?: string | null;
  createdAt: string;
  cliente?: { nombre: string; ccNit: string; telefono?: string | null };
  vehiculo?: { placa: string };
  centroOperacion?: { nombre: string };
  seccion?: { nombre: string };
  tarifa?: { codigo: string };
};

export default function SoporteServicioPage() {
  const params = useParams();
  const id = params.id as string;

  const [servicio, setServicio] = useState<Servicio | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;

    fetch(`/api/servicios/${id}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setServicio(data);
      });
  }, [id]);

  const dinero = (valor: number) =>
    `$${Math.round(valor || 0).toLocaleString("es-CO")}`;

  const numeroSoporte =
    servicio?.numeroSoporte || `SP-${String(servicio?.id || 0).padStart(6, "0")}`;

  const descargarPDF = () => {
    if (!servicio) return;

    const doc = new jsPDF();
    let y = 15;

    const add = (label: string, value: string) => {
      doc.text(`${label}: ${value}`, 15, y);
      y += 8;
    };

    doc.setFontSize(18);
    doc.text("LOSERCOL", 105, y, { align: "center" });
    y += 10;

    doc.setFontSize(13);
    doc.text("Soporte de servicio", 105, y, { align: "center" });
    y += 12;

    add("Soporte", numeroSoporte);
    add("Fecha", new Date(servicio.createdAt).toLocaleString("es-CO"));
    add("Centro", servicio.centroOperacion?.nombre || "-");
    add("Sección", servicio.seccion?.nombre || "-");
    add("Placa", servicio.vehiculo?.placa || "-");
    add("Cliente", servicio.cliente?.nombre || "-");
    add("Documento", servicio.cliente?.ccNit || "-");
    add("Servicio", servicio.descripcion);
    add("Cantidad", String(servicio.cantidad));
    add("Valor unitario", dinero(servicio.valorUnitario));
    add("Carpa", servicio.tipoCarpa || "-");
    add("Forma de pago", servicio.formaPago || "-");

    y += 5;
    doc.setFontSize(16);
    doc.text(`TOTAL: ${dinero(servicio.subtotal)}`, 15, y);

    doc.save(`${numeroSoporte}.pdf`);
  };

  const enviarWhatsApp = () => {
    if (!servicio) return;

    const telefono = servicio.cliente?.telefono?.replace(/\D/g, "");

    if (!telefono) {
      alert("El cliente no tiene teléfono registrado");
      return;
    }

    const numero = telefono.startsWith("57") ? telefono : `57${telefono}`;

    const mensaje = encodeURIComponent(
      `LOSERCOL\n\n` +
        `Soporte: ${numeroSoporte}\n` +
        `Cliente: ${servicio.cliente?.nombre || "-"}\n` +
        `Placa: ${servicio.vehiculo?.placa || "-"}\n` +
        `Servicio: ${servicio.descripcion}\n` +
        `Cantidad: ${servicio.cantidad}\n` +
        `Total: ${dinero(servicio.subtotal)}`
    );

    window.open(`https://wa.me/${numero}?text=${mensaje}`, "_blank");
  };

  if (error) {
    return (
      <main style={styles.page}>
        <p style={styles.error}>{error}</p>
        <Link href="/servicio-rapido" style={styles.back}>
          ← Volver
        </Link>
      </main>
    );
  }

  if (!servicio) {
    return <main style={styles.page}>Cargando soporte...</main>;
  }

  return (
    <main style={styles.page}>
      <div style={styles.actions} className="no-print">
        <Link href="/servicio-rapido" style={styles.back}>
          ← Volver
        </Link>

        <button onClick={() => window.print()} style={styles.printButton}>
          Imprimir
        </button>

        <button onClick={descargarPDF} style={styles.pdfButton}>
          Descargar PDF
        </button>

        <button onClick={enviarWhatsApp} style={styles.whatsappButton}>
          WhatsApp
        </button>
      </div>

      <section style={styles.ticket}>
        <h1 style={styles.company}>LOSERCOL</h1>
        <p style={styles.companySub}>Logística y Servicios de Colombia</p>

        <h2 style={styles.title}>Soporte de servicio</h2>

        <div style={styles.number}>{numeroSoporte}</div>

        <p style={styles.date}>
          {new Date(servicio.createdAt).toLocaleString("es-CO")}
        </p>

        <div style={styles.separator} />

        <Row label="Centro" value={servicio.centroOperacion?.nombre || "-"} />
        <Row label="Sección" value={servicio.seccion?.nombre || "-"} />
        <Row label="Placa" value={servicio.vehiculo?.placa || "-"} />
        <Row label="Cliente" value={servicio.cliente?.nombre || "-"} />
        <Row label="Documento" value={servicio.cliente?.ccNit || "-"} />
        <Row label="Contacto" value={servicio.cliente?.telefono || "-"} />

        <div style={styles.separator} />

        <Row label="Código" value={servicio.tarifa?.codigo || "-"} />
        <Row label="Servicio" value={servicio.descripcion} />
        <Row label="Cantidad" value={String(servicio.cantidad)} />
        <Row label="Unidad" value={servicio.unidadMedida || "-"} />
        <Row label="Valor unitario" value={dinero(servicio.valorUnitario)} />
        <Row label="Carpa" value={servicio.tipoCarpa || "-"} />
        <Row label="Forma de pago" value={servicio.formaPago || "-"} />

        <div style={styles.totalBox}>
          <span>Total</span>
          <strong>{dinero(servicio.subtotal)}</strong>
        </div>

        <p style={styles.footer}>Documento generado por sistema LOSERCOL</p>
      </section>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }

          body {
            background: white !important;
          }

          @page {
            margin: 10mm;
          }
        }
      `}</style>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.row}>
      <span>{label}</span>
      <strong>{value}</strong>
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
  actions: {
    maxWidth: "620px",
    margin: "0 auto 18px",
    display: "flex",
    justifyContent: "center",
    gap: "10px",
    flexWrap: "wrap",
  },
  back: {
    background: "#fff",
    border: "1px solid #ccc",
    borderRadius: "10px",
    padding: "12px 16px",
    color: "#0b5cab",
    textDecoration: "none",
    fontWeight: 800,
  },
  printButton: {
    background: "#f5c400",
    color: "#111",
    border: "none",
    borderRadius: "10px",
    padding: "12px 16px",
    fontWeight: 900,
    cursor: "pointer",
  },
  pdfButton: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "12px 16px",
    fontWeight: 900,
    cursor: "pointer",
  },
  whatsappButton: {
    background: "#25D366",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "12px 16px",
    fontWeight: 900,
    cursor: "pointer",
  },
  ticket: {
    width: "430px",
    margin: "0 auto",
    background: "#fff",
    border: "1px solid #ccc",
    borderRadius: "14px",
    padding: "24px",
    boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
  },
  company: {
    textAlign: "center",
    margin: 0,
    fontSize: "32px",
    fontWeight: 900,
  },
  companySub: {
    textAlign: "center",
    margin: "4px 0 12px",
    fontSize: "12px",
    color: "#555",
  },
  title: {
    textAlign: "center",
    fontSize: "18px",
    margin: "8px 0",
  },
  number: {
    textAlign: "center",
    background: "#f5c400",
    borderRadius: "8px",
    padding: "10px",
    fontWeight: 900,
    marginBottom: "8px",
  },
  date: {
    textAlign: "center",
    color: "#555",
    marginBottom: "14px",
  },
  separator: {
    borderTop: "1px dashed #ccc",
    margin: "14px 0",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    gap: "14px",
    padding: "8px 0",
    borderBottom: "1px solid #eee",
    fontSize: "14px",
  },
  totalBox: {
    marginTop: "18px",
    background: "#111",
    color: "#fff",
    borderRadius: "10px",
    padding: "14px",
    display: "flex",
    justifyContent: "space-between",
    fontSize: "20px",
  },
  footer: {
    textAlign: "center",
    color: "#555",
    fontSize: "12px",
    marginTop: "18px",
  },
  error: {
    color: "#b91c1c",
    fontWeight: 900,
  },
};