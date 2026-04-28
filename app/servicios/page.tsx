"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Cliente = {
  id: number;
  nombre: string;
  ccNit: string;
  telefono?: string;
};

type Vehiculo = {
  id: number;
  placa: string;
  clienteId: number;
};

type Centro = {
  id: number;
  nombre: string;
};

type Tarifa = {
  id: number;
  codigo: string;
  descripcion: string;
  valorUnitario: number;
  unidadMedida: string;
  presentacion: string;
  categoria: string;
};

type Seccion = {
  id: number;
  nombre: string;
};

type Servicio = {
  id: number;
  numeroSoporte?: string | null;
  tipoCarpa?: string | null;
  descripcion: string;
  valorUnitario: number;
  cantidad: number;
  subtotal: number;
  clienteId: number;
  vehiculoId: number;
  centroOperacionId: number;
  tarifaId?: number | null;
  seccionId?: number | null;
  unidadMedida?: string | null;
  presentacion?: string | null;
  categoria?: string | null;
  createdAt: string;
  cliente?: Cliente;
  vehiculo?: Vehiculo;
  centroOperacion?: Centro;
  tarifa?: Tarifa | null;
  seccion?: Seccion | null;
};

type User = {
  id: number;
  nombre: string;
  email: string;
  rol: "admin" | "operador";
} | null;

const initialForm = {
  clienteId: "",
  vehiculoId: "",
  centroOperacionId: "",
  seccionId: "",
  tarifaId: "",
  tipoCarpa: "",
  descripcion: "",
  valorUnitario: "",
  cantidad: "",
};

export default function ServiciosPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [centros, setCentros] = useState<Centro[]>([]);
  const [tarifas, setTarifas] = useState<Tarifa[]>([]);
  const [secciones, setSecciones] = useState<Seccion[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [user, setUser] = useState<User>(null);

  const [form, setForm] = useState(initialForm);
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [placaBusqueda, setPlacaBusqueda] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const numeroSoporte = (s: Servicio) =>
    s.numeroSoporte || `SP-${String(s.id).padStart(6, "0")}`;

  const valorCarpa = (tipo: string) => {
    if (tipo === "Tracto Mula") return 46500;
    if (tipo === "Doble Troque") return 23150;
    if (tipo === "Sencillo") return 16950;
    return 0;
  };

  const cargarUsuario = async () => {
    try {
      const res = await fetch("/api/me", { cache: "no-store" });
      const data = await res.json();
      setUser(data);
    } catch {
      setUser(null);
    }
  };

  const cargarCatalogos = async () => {
    const [c1, c2, c3, c4, c5] = await Promise.all([
      fetch("/api/clientes", { cache: "no-store" }),
      fetch("/api/vehiculos", { cache: "no-store" }),
      fetch("/api/centros", { cache: "no-store" }),
      fetch("/api/tarifas", { cache: "no-store" }),
      fetch("/api/secciones", { cache: "no-store" }),
    ]);

    const dataClientes = await c1.json();
    const dataVehiculos = await c2.json();
    const dataCentros = await c3.json();
    const dataTarifas = await c4.json();
    const dataSecciones = await c5.json();

    setClientes(Array.isArray(dataClientes) ? dataClientes : []);
    setVehiculos(Array.isArray(dataVehiculos) ? dataVehiculos : []);
    setCentros(Array.isArray(dataCentros) ? dataCentros : []);
    setTarifas(Array.isArray(dataTarifas) ? dataTarifas : []);
    setSecciones(Array.isArray(dataSecciones) ? dataSecciones : []);
  };

  const cargarServicios = async () => {
    const params = new URLSearchParams();

    if (placaBusqueda.trim()) params.set("placa", placaBusqueda.trim());
    if (fechaInicio) params.set("fechaInicio", fechaInicio);
    if (fechaFin) params.set("fechaFin", fechaFin);

    const query = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`/api/servicios${query}`, { cache: "no-store" });
    const data = await res.json();

    setServicios(Array.isArray(data) ? data : []);
  };

  const cargarTodo = async () => {
    try {
      await Promise.all([cargarUsuario(), cargarCatalogos(), cargarServicios()]);
    } catch {
      setMensaje("Error cargando datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarTodo();
  }, []);

  const vehiculosFiltrados = useMemo(() => {
    return vehiculos.filter((v) => v.clienteId === Number(form.clienteId));
  }, [vehiculos, form.clienteId]);

  const valorAdicionalCarpa = valorCarpa(form.tipoCarpa);

  const subtotalPreview =
    Number(form.valorUnitario || 0) * Number(form.cantidad || 0) +
    valorAdicionalCarpa;

  const totalServicios = servicios.length;

  const totalFacturado = servicios.reduce(
    (acc, s) => acc + Number(s.subtotal || 0),
    0
  );

  const totalCantidad = servicios.reduce(
    (acc, s) => acc + Number(s.cantidad || 0),
    0
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    if (name === "clienteId") {
      setForm((prev) => ({
        ...prev,
        clienteId: value,
        vehiculoId: "",
      }));
      return;
    }

    if (name === "tarifaId") {
      const tarifa = tarifas.find((t) => t.id === Number(value));

      setForm((prev) => ({
        ...prev,
        tarifaId: value,
        descripcion: tarifa?.descripcion || "",
        valorUnitario: tarifa ? String(tarifa.valorUnitario) : "",
      }));

      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditandoId(null);
  };

  const guardarServicio = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje("");

    if (
      !form.clienteId ||
      !form.vehiculoId ||
      !form.centroOperacionId ||
      !form.seccionId ||
      !form.tarifaId ||
      !form.cantidad
    ) {
      setMensaje("Completa todos los campos");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        clienteId: Number(form.clienteId),
        vehiculoId: Number(form.vehiculoId),
        centroOperacionId: Number(form.centroOperacionId),
        seccionId: Number(form.seccionId),
        tarifaId: Number(form.tarifaId),
        tipoCarpa: form.tipoCarpa,
        cantidad: Number(form.cantidad),
      };

      const res = await fetch(
        editandoId ? `/api/servicios/${editandoId}` : "/api/servicios",
        {
          method: editandoId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setMensaje(data.error || "Error al guardar servicio");
        return;
      }

      setMensaje(editandoId ? "Servicio actualizado" : "Servicio guardado");
      resetForm();
      await cargarServicios();
    } catch {
      setMensaje("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const editarServicio = (s: Servicio) => {
    setEditandoId(s.id);
    setForm({
      clienteId: String(s.clienteId),
      vehiculoId: String(s.vehiculoId),
      centroOperacionId: String(s.centroOperacionId),
      seccionId: s.seccionId ? String(s.seccionId) : "",
      tarifaId: s.tarifaId ? String(s.tarifaId) : "",
      tipoCarpa: s.tipoCarpa || "",
      descripcion: s.descripcion,
      valorUnitario: String(s.valorUnitario),
      cantidad: String(s.cantidad),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const eliminarServicio = async (id: number) => {
    const ok = window.confirm("¿Seguro que quieres eliminar este servicio?");
    if (!ok) return;

    const res = await fetch("/api/servicios", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMensaje(data.error || "Error al eliminar");
      return;
    }

    setMensaje("Servicio eliminado");
    await cargarServicios();
  };

  const buscar = async () => {
    setLoading(true);
    await cargarServicios();
    setLoading(false);
  };

  const limpiarFiltros = async () => {
    setPlacaBusqueda("");
    setFechaInicio("");
    setFechaFin("");
    setLoading(true);

    const res = await fetch("/api/servicios", { cache: "no-store" });
    const data = await res.json();
    setServicios(Array.isArray(data) ? data : []);

    setLoading(false);
  };

  const exportarExcel = () => {
    if (servicios.length === 0) {
      alert("No hay datos para exportar");
      return;
    }

    const data = servicios.map((s) => ({
      Soporte: numeroSoporte(s),
      Fecha: new Date(s.createdAt).toLocaleDateString("es-CO"),
      Cliente: s.cliente?.nombre || "",
      Documento: s.cliente?.ccNit || "",
      Vehiculo: s.vehiculo?.placa || "",
      Centro: s.centroOperacion?.nombre || "",
      Seccion: s.seccion?.nombre || "",
      Tarifa: s.tarifa?.codigo || "",
      "Carpa adicional": s.tipoCarpa || "",
      Descripcion: s.descripcion,
      Unidad: s.unidadMedida || "",
      Cantidad: s.cantidad,
      "Valor Unitario": s.valorUnitario,
      Subtotal: s.subtotal,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Servicios");

    XLSX.writeFile(workbook, "servicios.xlsx");
  };

  const exportarPDF = (s: Servicio) => {
    const doc = new jsPDF();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("LOSERCOL", 14, 18);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Soporte de servicio", 14, 26);
    doc.text(`No. ${numeroSoporte(s)}`, 140, 26);

    doc.line(14, 30, 196, 30);

    doc.setFont("helvetica", "bold");
    doc.text("Fecha:", 14, 40);
    doc.text("Cliente:", 14, 48);
    doc.text("Documento:", 14, 56);
    doc.text("Vehículo:", 110, 48);
    doc.text("Centro:", 110, 56);
    doc.text("Sección:", 110, 64);

    doc.setFont("helvetica", "normal");
    doc.text(new Date(s.createdAt).toLocaleDateString("es-CO"), 35, 40);
    doc.text(s.cliente?.nombre || "", 35, 48);
    doc.text(s.cliente?.ccNit || "", 40, 56);
    doc.text(s.vehiculo?.placa || "", 132, 48);
    doc.text(s.centroOperacion?.nombre || "", 126, 56);
    doc.text(s.seccion?.nombre || "", 128, 64);

    autoTable(doc, {
      startY: 76,
      head: [
        [
          "Tarifa",
          "Carpa adicional",
          "Descripción",
          "Unidad",
          "Cantidad",
          "Valor",
          "Subtotal",
        ],
      ],
      body: [
        [
          s.tarifa?.codigo || "",
          s.tipoCarpa || "",
          s.descripcion,
          s.unidadMedida || "",
          String(s.cantidad),
          `$${Number(s.valorUnitario).toLocaleString("es-CO")}`,
          `$${Number(s.subtotal).toLocaleString("es-CO")}`,
        ],
      ],
      theme: "grid",
      headStyles: {
        fillColor: [245, 196, 0],
        textColor: [17, 17, 17],
      },
    });

    doc.save(`${numeroSoporte(s)}_${s.vehiculo?.placa || "servicio"}.pdf`);
  };

  return (
    <main style={styles.page}>
      <div style={styles.topBar}>
        <div>
          <h1 style={styles.title}>Servicios</h1>
          {user && (
            <p style={styles.roleText}>
              Usuario: <strong>{user.nombre}</strong> | Rol:{" "}
              <strong>{user.rol}</strong>
            </p>
          )}
        </div>

        <Link href="/" style={styles.backLink}>
          ← Volver al menú
        </Link>
      </div>

      <section style={styles.filtersCard}>
        <h2 style={styles.sectionTitle}>Búsqueda y filtros</h2>

        <div style={styles.filtersGrid}>
          <input
            placeholder="Buscar placa"
            value={placaBusqueda}
            onChange={(e) => setPlacaBusqueda(e.target.value.toUpperCase())}
            style={styles.input}
          />

          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            style={styles.input}
          />

          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            style={styles.input}
          />

          <button onClick={buscar} style={styles.secondaryButton}>
            Buscar
          </button>

          <button onClick={limpiarFiltros} style={styles.secondaryButton}>
            Limpiar
          </button>

          <button onClick={exportarExcel} style={styles.excelButton}>
            Exportar Excel
          </button>
        </div>
      </section>

      <section style={styles.dashboard}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total servicios</div>
          <div style={styles.statValue}>{totalServicios}</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total facturado</div>
          <div style={styles.statValue}>
            ${totalFacturado.toLocaleString("es-CO")}
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total cantidad</div>
          <div style={styles.statValue}>
            {totalCantidad.toLocaleString("es-CO")}
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statLabel}>Subtotal actual</div>
          <div style={styles.statValue}>
            ${subtotalPreview.toLocaleString("es-CO")}
          </div>
        </div>
      </section>

      <div style={styles.layout}>
        <section style={styles.tableSection}>
          <div style={styles.tableHeader}>
            <span>Soporte</span>
            <span>Sección</span>
            <span>Cliente</span>
            <span>Vehículo</span>
            <span>Centro</span>
            <span>Descripción</span>
            <span>Subtotal</span>
            <span>Acciones</span>
          </div>

          {loading ? (
            <div style={styles.empty}>Cargando servicios...</div>
          ) : servicios.length === 0 ? (
            <div style={styles.empty}>No hay servicios guardados</div>
          ) : (
            servicios.map((s) => (
              <div key={s.id} style={styles.tableRow}>
                <span>{numeroSoporte(s)}</span>
                <span>{s.seccion?.nombre || "-"}</span>
                <span>{s.cliente?.nombre || "-"}</span>
                <span>{s.vehiculo?.placa || "-"}</span>
                <span>{s.centroOperacion?.nombre || "-"}</span>
                <span>
                  {s.descripcion}
                  {s.tipoCarpa ? ` + Carpa ${s.tipoCarpa}` : ""}
                </span>
                <span>${Number(s.subtotal).toLocaleString("es-CO")}</span>

                <div style={styles.actions}>
                

                  {user?.rol === "admin" && (
                    <>
                      <button
                        onClick={() => editarServicio(s)}
                        style={styles.editButton}
                      >
                        Editar
                      </button>

                      <button
                        onClick={() => eliminarServicio(s.id)}
                        style={styles.deleteButton}
                      >
                        Eliminar
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </section>

        <section style={styles.formCard}>
          <h2 style={styles.sectionTitle}>
            {editandoId ? "Editar servicio" : "Adicionar servicio"}
          </h2>

          <form onSubmit={guardarServicio} style={styles.form}>
            <select
              name="clienteId"
              value={form.clienteId}
              onChange={handleChange}
              style={styles.input}
            >
              <option value="">Selecciona cliente</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} - {c.ccNit}
                </option>
              ))}
            </select>

            <select
              name="vehiculoId"
              value={form.vehiculoId}
              onChange={handleChange}
              style={styles.input}
              disabled={!form.clienteId}
            >
              <option value="">
                {form.clienteId
                  ? "Selecciona vehículo"
                  : "Primero selecciona cliente"}
              </option>
              {vehiculosFiltrados.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.placa}
                </option>
              ))}
            </select>

            <select
              name="centroOperacionId"
              value={form.centroOperacionId}
              onChange={handleChange}
              style={styles.input}
            >
              <option value="">Selecciona centro</option>
              {centros.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>

            <select
              name="seccionId"
              value={form.seccionId}
              onChange={handleChange}
              style={styles.input}
            >
              <option value="">Selecciona sección</option>
              {secciones.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>

            <select
              name="tarifaId"
              value={form.tarifaId}
              onChange={handleChange}
              style={styles.input}
            >
              <option value="">Selecciona tarifa</option>
              {tarifas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.codigo} - {t.descripcion} - $
                  {Number(t.valorUnitario).toLocaleString("es-CO")}
                </option>
              ))}
            </select>

            <select
              name="tipoCarpa"
              value={form.tipoCarpa}
              onChange={handleChange}
              style={styles.input}
            >
              <option value="">Sin carpa adicional</option>
              <option value="Tracto Mula">Carpa Tracto Mula - $46.500</option>
              <option value="Doble Troque">Carpa Doble Troque - $23.150</option>
              <option value="Sencillo">Carpa Sencillo - $16.950</option>
            </select>

            <input
              value={form.descripcion}
              placeholder="Descripción"
              readOnly
              style={styles.input}
            />

            <input
              value={form.valorUnitario}
              placeholder="Valor unitario"
              readOnly
              style={styles.input}
            />

            <input
              name="cantidad"
              type="number"
              placeholder="Cantidad"
              value={form.cantidad}
              onChange={handleChange}
              style={styles.input}
            />

            {form.tipoCarpa && (
              <div style={styles.preview}>
                Carpa adicional:{" "}
                <strong>
                  ${valorAdicionalCarpa.toLocaleString("es-CO")}
                </strong>
              </div>
            )}

            <div style={styles.preview}>
              Subtotal total:{" "}
              <strong>${subtotalPreview.toLocaleString("es-CO")}</strong>
            </div>

            <button type="submit" style={styles.saveButton} disabled={saving}>
              {saving
                ? "Guardando..."
                : editandoId
                ? "Actualizar servicio"
                : "Guardar servicio"}
            </button>

            {editandoId && (
              <button
                type="button"
                onClick={resetForm}
                style={styles.secondaryButton}
              >
                Cancelar edición
              </button>
            )}

            {mensaje && <p style={styles.message}>{mensaje}</p>}
          </form>
        </section>
      </div>
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
    fontSize: "34px",
    color: "#111",
  },
  roleText: {
    margin: "8px 0 0 0",
    color: "#374151",
    fontSize: "14px",
  },
  backLink: {
    textDecoration: "none",
    color: "#0b5cab",
    fontWeight: 700,
  },
  filtersCard: {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "12px",
    padding: "18px",
    marginBottom: "18px",
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: "14px",
    color: "#111",
  },
  filtersGrid: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1.2fr",
    gap: "12px",
  },
  dashboard: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "14px",
    marginBottom: "18px",
  },
  statCard: {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "12px",
    padding: "18px",
  },
  statLabel: {
    color: "#555",
    fontSize: "14px",
    marginBottom: "8px",
  },
  statValue: {
    color: "#111",
    fontSize: "24px",
    fontWeight: 700,
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: "24px",
    alignItems: "start",
  },
  tableSection: {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "12px",
    overflow: "hidden",
  },
  tableHeader: {
    display: "grid",
    gridTemplateColumns: "0.9fr 1fr 1.1fr 0.8fr 0.9fr 1.8fr 0.9fr 1.7fr",
    gap: "10px",
    background: "#f5c400",
    padding: "14px",
    fontWeight: 700,
    color: "#111",
  },
  tableRow: {
    display: "grid",
    gridTemplateColumns: "0.9fr 1fr 1.1fr 0.8fr 0.9fr 1.8fr 0.9fr 1.7fr",
    gap: "10px",
    padding: "12px 14px",
    borderTop: "1px solid #eee",
    alignItems: "center",
    background: "#fff",
    color: "#111",
  },
  formCard: {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "12px",
    padding: "20px",
  },
  form: {
    display: "grid",
    gap: "12px",
  },
  input: {
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    fontSize: "14px",
    width: "100%",
    background: "#fff",
    color: "#111",
  },
  preview: {
    background: "#f7f7f7",
    border: "1px solid #ddd",
    borderRadius: "8px",
    padding: "12px",
    color: "#111",
  },
  actions: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
  },
  saveButton: {
    background: "#f5c400",
    color: "#111",
    border: "none",
    borderRadius: "8px",
    padding: "12px",
    fontWeight: 700,
    cursor: "pointer",
  },
  secondaryButton: {
    background: "#fff",
    color: "#111",
    border: "1px solid #ccc",
    borderRadius: "8px",
    padding: "12px",
    fontWeight: 700,
    cursor: "pointer",
  },
  excelButton: {
    background: "#1d6f42",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "12px",
    fontWeight: 700,
    cursor: "pointer",
  },
  pdfButton: {
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "8px 10px",
    cursor: "pointer",
  },
  editButton: {
    background: "#fff",
    color: "#111",
    border: "1px solid #bbb",
    borderRadius: "6px",
    padding: "8px 10px",
    cursor: "pointer",
  },
  deleteButton: {
    background: "#b91c1c",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "8px 10px",
    cursor: "pointer",
  },
  message: {
    margin: 0,
    fontWeight: 700,
    color: "#111",
  },
  empty: {
    padding: "18px",
    color: "#111",
  },
};