"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Servicio = {
  id: number;
  numeroSoporte?: string | null;
  tipoCarpa?: string | null;
  descripcion: string;
  valorUnitario: number;
  cantidad: number;
  subtotal: number;
  unidadMedida?: string | null;
  createdAt: string;
  cliente?: {
    nombre: string;
    ccNit: string;
    telefono?: string;
  };
  vehiculo?: {
    placa: string;
  };
  centroOperacion?: {
    nombre: string;
  };
  tarifa?: {
    codigo: string;
  };
  seccion?: {
    nombre: string;
  };
};

const valorCarpa = (tipo?: string | null) => {
  if (tipo === "Tracto Mula") return 46500;
  if (tipo === "Doble Troque") return 23150;
  if (tipo === "Sencillo") return 16950;
  return 0;
};

export default function FacturaMultiplePage() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [seleccionados, setSeleccionados] = useState<number[]>([]);
  const [generando, setGenerando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    cargarServicios();
  }, []);

  const cargarServicios = async () => {
    const res = await fetch("/api/servicios", { cache: "no-store" });
    const data = await res.json();
    setServicios(Array.isArray(data) ? data : []);
  };

  const dinero = (valor: number) =>
    `$${Math.round(valor).toLocaleString("es-CO")}`;

  const numeroSoporte = (s: Servicio) =>
    s.numeroSoporte || `SP-${String(s.id).padStart(6, "0")}`;

  const toggleServicio = (id: number) => {
    setSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const cargarLogo = async (): Promise<string | null> => {
    try {
      const img = new Image();
      img.src = "/logo-losercol.png";
      img.crossOrigin = "anonymous";

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      ctx.drawImage(img, 0, 0);
      return canvas.toDataURL("image/png");
    } catch {
      return null;
    }
  };

  const generarPDF = async () => {
    setMensaje("");

    const lista = servicios.filter((s) => seleccionados.includes(s.id));

    if (lista.length === 0) {
      alert("Selecciona al menos un servicio");
      return;
    }

    try {
      setGenerando(true);

      // ✅ Guarda la factura en el historial y recibe número real FM-000001
      const resFactura = await fetch("/api/facturas-multiples", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: seleccionados }),
      });

      const facturaGuardada = await resFactura.json();

      if (!resFactura.ok) {
        alert(facturaGuardada.error || "Error guardando factura múltiple");
        return;
      }

      const numeroFactura = facturaGuardada.numero;
      const logoBase64 = await cargarLogo();
      const fecha = new Date().toLocaleDateString("es-CO");
      const primero = lista[0];

      const filas: {
        codigo: string;
        descripcion: string;
        cantidad: number;
        unidad: string;
        valorSinIva: number;
        subtotalSinIva: number;
        iva: number;
        total: number;
      }[] = [];

      lista.forEach((s) => {
        const totalServicio =
          Number(s.valorUnitario || 0) * Number(s.cantidad || 0);
        const valorSinIva = Number(s.valorUnitario || 0) / 1.19;
        const subtotalSinIva = totalServicio / 1.19;
        const iva = totalServicio - subtotalSinIva;

        filas.push({
          codigo: s.tarifa?.codigo || numeroSoporte(s),
          descripcion: s.descripcion,
          cantidad: Number(s.cantidad || 0),
          unidad: s.unidadMedida || "",
          valorSinIva,
          subtotalSinIva,
          iva,
          total: totalServicio,
        });

        if (s.tipoCarpa) {
          const totalCarpa = valorCarpa(s.tipoCarpa);
          const baseCarpa = totalCarpa / 1.19;
          const ivaCarpa = totalCarpa - baseCarpa;

          filas.push({
            codigo: "CARPA",
            descripcion: `Carpa ${s.tipoCarpa}`,
            cantidad: 1,
            unidad: "Unidad",
            valorSinIva: baseCarpa,
            subtotalSinIva: baseCarpa,
            iva: ivaCarpa,
            total: totalCarpa,
          });
        }
      });

      const subtotalSinIva = filas.reduce(
        (acc, f) => acc + f.subtotalSinIva,
        0
      );
      const ivaTotal = filas.reduce((acc, f) => acc + f.iva, 0);
      const total = filas.reduce((acc, f) => acc + f.total, 0);

      const doc = new jsPDF("p", "mm", "a4");

      if (logoBase64) {
        doc.addImage(logoBase64, "PNG", 14, 10, 42, 24);
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      

      doc.setFont("helvetica", "normal");
      doc.setFontSize(15);
      doc.text("Factura de servicios logísticos", 62, 25);
    

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(numeroFactura, 196, 18, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Fecha: ${fecha}`, 196, 25, { align: "right" });

      doc.setDrawColor(245, 196, 0);
      doc.setLineWidth(1.2);
      doc.line(14, 40, 196, 40);

      doc.setFillColor(248, 248, 248);
      doc.roundedRect(14, 48, 182, 38, 3, 3, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("DATOS DEL CLIENTE Y OPERACIÓN", 18, 56);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Cliente: ${primero.cliente?.nombre || "-"}`, 18, 65);
      doc.text(`NIT / CC: ${primero.cliente?.ccNit || "-"}`, 18, 72);
      doc.text(`Contacto: ${primero.cliente?.telefono || "-"}`, 18, 79);

      doc.text(`Centro: ${primero.centroOperacion?.nombre || "-"}`, 112, 65);
      doc.text(`Sección: ${primero.seccion?.nombre || "-"}`, 112, 72);
      doc.text(
        `Placas: ${lista
          .map((s) => s.vehiculo?.placa)
          .filter(Boolean)
          .join(", ")}`,
        112,
        79
      );

      autoTable(doc, {
        startY: 100,
        head: [
          [
            "Código",
            "Descripción",
            "Cant.",
            "Unidad",
            "Vr sin IVA",
            "Subtotal",
            "IVA",
            "Total",
          ],
        ],
        body: filas.map((f) => [
          f.codigo,
          f.descripcion,
          String(f.cantidad),
          f.unidad,
          dinero(f.valorSinIva),
          dinero(f.subtotalSinIva),
          dinero(f.iva),
          dinero(f.total),
        ]),
        theme: "grid",
        margin: { left: 14, right: 14 },
        styles: {
          fontSize: 7,
          cellPadding: 2,
          overflow: "linebreak",
          textColor: [17, 17, 17],
        },
        headStyles: {
          fillColor: [245, 196, 0],
          textColor: [0, 0, 0],
          fontStyle: "bold",
        },
        columnStyles: {
          0: { cellWidth: 17 },
          1: { cellWidth: 44 },
          2: { cellWidth: 12, halign: "center" },
          3: { cellWidth: 18 },
          4: { cellWidth: 24, halign: "right" },
          5: { cellWidth: 24, halign: "right" },
          6: { cellWidth: 20, halign: "right" },
          7: { cellWidth: 23, halign: "right" },
        },
      });

      let y = (doc as any).lastAutoTable.finalY + 12;

      if (y > 245) {
        doc.addPage();
        y = 30;
      }

      doc.setFillColor(248, 248, 248);
      doc.roundedRect(112, y, 84, 34, 3, 3, "F");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Subtotal sin IVA:", 118, y + 9);
      doc.text(dinero(subtotalSinIva), 192, y + 9, { align: "right" });

      doc.text("IVA 19%:", 118, y + 18);
      doc.text(dinero(ivaTotal), 192, y + 18, { align: "right" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("TOTAL:", 118, y + 29);
      doc.text(dinero(total), 192, y + 29, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(90);
      doc.text(
        "Documento generado por sistema LOSERCOL. Valores discriminados antes de IVA, IVA 19% y total con IVA incluido.",
        105,
        287,
        { align: "center" }
      );

      doc.save(`${numeroFactura}.pdf`);

      setMensaje(`Factura ${numeroFactura} guardada en historial`);
      setSeleccionados([]);
    } catch (error) {
      console.error(error);
      setMensaje("Error generando factura múltiple");
    } finally {
      setGenerando(false);
    }
  };

  return (
    <main style={styles.page}>
      <div style={styles.topBar}>
        <div>
          <h1 style={styles.title}>Factura múltiple</h1>
          <p style={styles.subtitle}>
            Selecciona servicios y genera una factura profesional con IVA
            discriminado.
          </p>
        </div>

        <Link href="/" style={styles.backLink}>
          ← Volver al menú
        </Link>
      </div>

      <div style={styles.buttons}>
        <button onClick={generarPDF} style={styles.pdfButton} disabled={generando}>
          {generando ? "Generando..." : "Generar factura profesional PDF"}
        </button>

        <Link href="/facturas-multiples" style={styles.historyLink}>
          Ver historial
        </Link>
      </div>

      {mensaje && <p style={styles.message}>{mensaje}</p>}

      <section style={styles.table}>
        <div style={styles.header}>
          <span></span>
          <span>Soporte</span>
          <span>Cliente</span>
          <span>Placa</span>
          <span>Sección</span>
          <span>Descripción</span>
          <span>Total</span>
        </div>

        {servicios.length === 0 ? (
          <div style={styles.empty}>No hay servicios para facturar</div>
        ) : (
          servicios.map((s) => (
            <div key={s.id} style={styles.row}>
              <input
                type="checkbox"
                checked={seleccionados.includes(s.id)}
                onChange={() => toggleServicio(s.id)}
              />

              <span>{numeroSoporte(s)}</span>
              <span>{s.cliente?.nombre || "-"}</span>
              <span>{s.vehiculo?.placa || "-"}</span>
              <span>{s.seccion?.nombre || "-"}</span>
              <span>
                {s.descripcion}
                {s.tipoCarpa ? ` + Carpa ${s.tipoCarpa}` : ""}
              </span>
              <span>{dinero(Number(s.subtotal || 0))}</span>
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
  backLink: {
    textDecoration: "none",
    color: "#0b5cab",
    fontWeight: 700,
  },
  buttons: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
    marginBottom: "16px",
  },
  pdfButton: {
    background: "#f5c400",
    color: "#111",
    border: "none",
    borderRadius: "8px",
    padding: "14px 18px",
    fontWeight: 700,
    cursor: "pointer",
  },
  historyLink: {
    background: "#fff",
    color: "#0b5cab",
    border: "1px solid #ccc",
    borderRadius: "8px",
    padding: "13px 18px",
    fontWeight: 700,
    textDecoration: "none",
  },
  message: {
    fontWeight: 700,
    marginBottom: "16px",
  },
  table: {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "12px",
    overflow: "hidden",
  },
  header: {
    display: "grid",
    gridTemplateColumns: "50px 1fr 1.4fr 1fr 1.2fr 2.2fr 1fr",
    gap: "10px",
    background: "#f5c400",
    padding: "14px",
    fontWeight: 700,
  },
  row: {
    display: "grid",
    gridTemplateColumns: "50px 1fr 1.4fr 1fr 1.2fr 2.2fr 1fr",
    gap: "10px",
    padding: "12px 14px",
    borderTop: "1px solid #eee",
    alignItems: "center",
  },
  empty: {
    padding: "18px",
  },
};