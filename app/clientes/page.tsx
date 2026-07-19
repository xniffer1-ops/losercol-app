"use client";

import { useEffect, useState } from "react";

type Cliente = {
  id: number;
  ccNit: string;
  nombre: string;
  correo: string;
  telefono: string;
  formaPago: string;
};

type AccionClientes = "ver" | "crear" | "editar" | "eliminar";

type UsuarioActual = {
  id: number;
  nombre: string;
  email: string;
  rol: "superadmin" | "admin" | "auxiliar" | "operador";
  permisos?: {
    clientes?: Partial<Record<AccionClientes, boolean>>;
  };
} | null;

function tienePermisoClientes(
  usuario: UsuarioActual,
  accion: AccionClientes
) {
  if (!usuario) return false;
  if (usuario.rol === "superadmin") return true;
  return Boolean(usuario.permisos?.clientes?.[accion]);
}

const initialForm = {
  ccNit: "",
  nombre: "",
  correo: "",
  telefono: "",
  formaPago: "no_aplica",
};

function normalizarPagoVisual(valor: string) {
  const pago = String(valor || "").toLowerCase();

  if (pago === "credito" || pago === "crédito") return "Crédito";
  if (pago === "efectivo") return "Efectivo";
  if (pago === "transferencia") return "Transferencia";
  if (pago === "no_aplica" || pago === "no aplica" || pago === "n/a") return "No aplica";

  return valor || "No aplica";
}

function normalizarPagoValor(valor: string) {
  const pago = String(valor || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (pago === "credito") return "credito";
  if (pago === "efectivo") return "efectivo";
  if (pago === "transferencia") return "transferencia";
  if (pago === "no_aplica" || pago === "no aplica" || pago === "n/a") return "no_aplica";

  return "no_aplica";
}

export default function ClientesPage() {
  const [form, setForm] = useState(initialForm);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [usuarioActual, setUsuarioActual] = useState<UsuarioActual>(null);

  const cargarClientes = async () => {
    try {
      const [resMe, res] = await Promise.all([
        fetch("/api/me", { cache: "no-store" }),
        fetch("/api/clientes", { cache: "no-store" }),
      ]);

      const dataMe = await resMe.json();
      const data = await res.json();

      setUsuarioActual(resMe.ok ? dataMe : null);
      setClientes(Array.isArray(data) ? data : []);
    } catch {
      setMensaje("No se pudieron cargar los clientes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void cargarClientes();
  }, []);

  const puedeCrear = tienePermisoClientes(usuarioActual, "crear");
  const puedeEditar = tienePermisoClientes(usuarioActual, "editar");
  const puedeEliminar = tienePermisoClientes(usuarioActual, "eliminar");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditandoId(null);
    setMensaje("");
  };

  const editarCliente = (cliente: Cliente) => {
    if (!puedeEditar) {
      setMensaje("No tienes permiso para editar clientes");
      return;
    }

    setEditandoId(cliente.id);
    setForm({
      ccNit: cliente.ccNit || "",
      nombre: cliente.nombre || "",
      correo: cliente.correo || "",
      telefono: cliente.telefono || "",
      formaPago: normalizarPagoValor(cliente.formaPago) || "no_aplica",
    });
    setMensaje("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const eliminarCliente = async (cliente: Cliente) => {
    if (!puedeEliminar) {
      setMensaje("No tienes permiso para eliminar clientes");
      return;
    }

    const ok = window.confirm(
      `¿Seguro deseas eliminar el cliente ${cliente.nombre}?\n\nSi tiene vehículos o servicios asociados, el sistema no lo eliminará para proteger el historial.`
    );

    if (!ok) return;

    setMensaje("");

    try {
      const res = await fetch(`/api/clientes/${cliente.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        setMensaje(data.error || "Error al eliminar cliente");
        return;
      }

      setMensaje("Cliente eliminado correctamente");
      await cargarClientes();
    } catch {
      setMensaje("Error de conexión al eliminar");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje("");

    if (editandoId && !puedeEditar) {
      setMensaje("No tienes permiso para editar clientes");
      return;
    }

    if (!editandoId && !puedeCrear) {
      setMensaje("No tienes permiso para crear clientes");
      return;
    }

    if (
      !form.ccNit.trim() ||
      !form.nombre.trim() ||
      !form.correo.trim() ||
      !form.telefono.trim()
    ) {
      setMensaje("Completa CC/NIT, nombre, correo y teléfono");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch(
        editandoId ? `/api/clientes/${editandoId}` : "/api/clientes",
        {
          method: editandoId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setMensaje(data.error || "Error al guardar cliente");
        return;
      }

      setMensaje(
        editandoId
          ? "Cliente actualizado correctamente"
          : "Cliente guardado correctamente"
      );

      setForm(initialForm);
      setEditandoId(null);

      await cargarClientes();
    } catch {
      setMensaje("Error de conexión al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main style={styles.page}>
      <div style={styles.topBar}>
        <h1 style={styles.title}>Clientes</h1>
      </div>

      <div style={styles.layout}>
        <section style={styles.tableSection}>
          <div style={styles.tableHeader}>
            <span>CC/NIT</span>
            <span>Nombre Cliente</span>
            <span>Correo</span>
            <span>Teléfono</span>
            <span>Forma de Pago</span>
            <span>Acciones</span>
          </div>

          <div style={styles.tableBody}>
            {loading ? (
              <div style={styles.empty}>Cargando clientes...</div>
            ) : clientes.length === 0 ? (
              <div style={styles.empty}>No hay clientes guardados</div>
            ) : (
              clientes.map((cliente) => (
                <div key={cliente.id} style={styles.tableRow}>
                  <span>{cliente.ccNit}</span>
                  <span>{cliente.nombre}</span>
                  <span>{cliente.correo}</span>
                  <span>{cliente.telefono}</span>
                  <span>{normalizarPagoVisual(cliente.formaPago)}</span>

                  <span style={styles.actions}>
                    {puedeEditar && (
                      <button
                        type="button"
                        onClick={() => editarCliente(cliente)}
                        style={styles.editButton}
                      >
                        Editar
                      </button>
                    )}

                    {puedeEliminar && (
                      <button
                        type="button"
                        onClick={() => void eliminarCliente(cliente)}
                        style={styles.deleteButton}
                      >
                        Eliminar
                      </button>
                    )}

                    {!puedeEditar && !puedeEliminar && (
                      <span style={styles.noActions}>Solo consulta</span>
                    )}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <section style={styles.formCard}>
          <h2 style={styles.formTitle}>
            {editandoId ? "Editar Cliente" : "Adicionar Cliente"}
          </h2>

          {!editandoId && !puedeCrear && (
            <div style={styles.infoBox}>
              Este usuario solo puede consultar clientes. No tiene permiso para crear nuevos registros.
            </div>
          )}

          <form onSubmit={handleSubmit} style={styles.form}>
            <input
              name="ccNit"
              placeholder="CC/NIT"
              value={form.ccNit}
              onChange={handleChange}
              style={styles.input}
            />

            <input
              name="nombre"
              placeholder="Nombre Cliente"
              value={form.nombre}
              onChange={handleChange}
              style={styles.input}
            />

            <input
              name="correo"
              type="email"
              placeholder="Correo"
              value={form.correo}
              onChange={handleChange}
              style={styles.input}
            />

            <input
              name="telefono"
              placeholder="Teléfono"
              value={form.telefono}
              onChange={handleChange}
              style={styles.input}
            />

            <select
              name="formaPago"
              value={form.formaPago}
              onChange={handleChange}
              style={styles.input}
            >
              <option value="no_aplica">No aplica / se define en el servicio</option>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="credito">Crédito</option>
            </select>

            <button
              type="submit"
              style={styles.saveButton}
              disabled={saving || (editandoId ? !puedeEditar : !puedeCrear)}
            >
              {saving
                ? "Guardando..."
                : editandoId
                ? "Actualizar cliente"
                : "Guardar cliente"}
            </button>

            {editandoId && (
              <button
                type="button"
                onClick={resetForm}
                style={styles.cancelButton}
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
    alignItems: "center",
    marginBottom: "24px",
    flexWrap: "wrap",
    gap: "12px",
  },
  title: {
    margin: 0,
    fontSize: "32px",
  },
  backLink: {
    textDecoration: "none",
    color: "#0b5cab",
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
    borderRadius: "10px",
    overflow: "hidden",
    maxHeight: "calc(100vh - 150px)",
    display: "flex",
    flexDirection: "column",
  },
  tableHeader: {
    display: "grid",
    gridTemplateColumns: "1fr 1.3fr 1.4fr 1fr 1fr 1fr",
    gap: "10px",
    background: "#f5c400",
    padding: "14px",
    fontWeight: 700,
    position: "sticky",
    top: 0,
    zIndex: 2,
  },
  tableBody: {
    overflowY: "auto",
    flex: 1,
  },
  tableRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1.3fr 1.4fr 1fr 1fr 1fr",
    gap: "10px",
    padding: "12px 14px",
    borderTop: "1px solid #eee",
    background: "#fff",
    alignItems: "center",
  },
  formCard: {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "10px",
    padding: "20px",
    position: "sticky",
    top: "20px",
    alignSelf: "start",
    maxHeight: "calc(100vh - 40px)",
    overflowY: "auto",
  },
  formTitle: {
    marginTop: 0,
    marginBottom: "16px",
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
    color: "#111",
    background: "#fff",
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
  cancelButton: {
    background: "#fff",
    color: "#111",
    border: "1px solid #ccc",
    borderRadius: "8px",
    padding: "12px",
    fontWeight: 700,
    cursor: "pointer",
  },
  editButton: {
    background: "#fff",
    color: "#111",
    border: "1px solid #bbb",
    borderRadius: "6px",
    padding: "8px 10px",
    cursor: "pointer",
    fontWeight: 700,
  },
  deleteButton: {
    background: "#b91c1c",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "8px 10px",
    cursor: "pointer",
    fontWeight: 700,
  },
  actions: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  noActions: {
    color: "#64748b",
    fontWeight: 700,
    fontSize: "13px",
  },
  infoBox: {
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    color: "#1d4ed8",
    borderRadius: "8px",
    padding: "12px",
    fontWeight: 700,
    marginBottom: "12px",
  },
  message: {
    margin: 0,
    fontWeight: 700,
  },
  empty: {
    padding: "18px",
  },
};
