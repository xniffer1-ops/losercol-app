"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Cliente = {
  id: number;
  nombre: string;
  ccNit: string;
};

type Vehiculo = {
  id: number;
  placa: string;
  tipoVehiculo: string;
  clienteId: number;
  cliente: Cliente;
};

type AccionPermiso = "ver" | "crear" | "editar" | "eliminar";

type PermisosVehiculos = Partial<Record<AccionPermiso, boolean>>;

type UsuarioActual = {
  id: number;
  nombre: string;
  email: string;
  rol: "superadmin" | "admin" | "auxiliar" | "operador";
  permisos?: {
    vehiculos?: PermisosVehiculos;
  };
} | null;

function tienePermisoVehiculos(
  usuario: UsuarioActual,
  accion: AccionPermiso
) {
  if (!usuario) return false;
  if (usuario.rol === "superadmin") return true;
  return Boolean(usuario.permisos?.vehiculos?.[accion]);
}

const initialForm = {
  id: "",
  placa: "",
  tipoVehiculo: "",
  clienteId: "",
};

function limpiarInterno(valor: string) {
  return String(valor || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export default function VehiculosPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [usuarioActual, setUsuarioActual] = useState<UsuarioActual>(null);

  const [form, setForm] = useState(initialForm);

  const clienteSeleccionado = useMemo(
    () => clientes.find((cliente) => cliente.id === Number(form.clienteId)),
    [clientes, form.clienteId]
  );

  const puedeCrear = tienePermisoVehiculos(usuarioActual, "crear");
  const puedeEditar = tienePermisoVehiculos(usuarioActual, "editar");
  const puedeEliminar = tienePermisoVehiculos(usuarioActual, "eliminar");

  const cargarTodo = async () => {
    try {
      const [resMe, resClientes, resVehiculos] = await Promise.all([
        fetch("/api/me", { cache: "no-store" }),
        fetch("/api/clientes", { cache: "no-store" }),
        fetch("/api/vehiculos", { cache: "no-store" }),
      ]);

      const dataMe = await resMe.json();
      const dataClientes = await resClientes.json();
      const dataVehiculos = await resVehiculos.json();

      setUsuarioActual(resMe.ok ? dataMe : null);
      setClientes(Array.isArray(dataClientes) ? dataClientes : []);
      setVehiculos(Array.isArray(dataVehiculos) ? dataVehiculos : []);
    } catch {
      setMensaje("No se pudieron cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void cargarTodo();
  }, []);

  const generarPlacaInterna = (cliente?: Cliente) => {
    const referencia = limpiarInterno(cliente?.ccNit || cliente?.nombre || "");
    return referencia ? `INTERNO-${referencia}` : "INTERNO";
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setForm((prev) => {
      const nuevo = {
        ...prev,
        [name]: value,
      };

      if (name === "tipoVehiculo" && value === "Movimiento interno") {
        const cliente = clientes.find((c) => c.id === Number(nuevo.clienteId));
        nuevo.placa = generarPlacaInterna(cliente);
      }

      if (
        name === "clienteId" &&
        nuevo.tipoVehiculo === "Movimiento interno" &&
        !editandoId
      ) {
        const cliente = clientes.find((c) => c.id === Number(value));
        nuevo.placa = generarPlacaInterna(cliente);
      }

      return nuevo;
    });
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditandoId(null);
    setMensaje("");
  };

  const editarVehiculo = (vehiculo: Vehiculo) => {
    if (!puedeEditar) {
      setMensaje("No tienes permiso para editar vehículos");
      return;
    }

    setEditandoId(vehiculo.id);
    setForm({
      id: String(vehiculo.id),
      placa: vehiculo.placa,
      tipoVehiculo: vehiculo.tipoVehiculo,
      clienteId: String(vehiculo.clienteId),
    });
    setMensaje("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const eliminarVehiculo = async (vehiculo: Vehiculo) => {
    if (!puedeEliminar) {
      setMensaje("No tienes permiso para eliminar vehículos");
      return;
    }

    const ok = window.confirm(
      `¿Seguro deseas eliminar el vehículo ${vehiculo.placa}?\n\nSi ya tiene servicios asociados, el sistema no lo eliminará para proteger el historial.`
    );

    if (!ok) return;

    setMensaje("");

    try {
      const res = await fetch(`/api/vehiculos/${vehiculo.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        setMensaje(data.error || "Error al eliminar vehículo");
        return;
      }

      setMensaje("Vehículo eliminado correctamente");
      await cargarTodo();
    } catch {
      setMensaje("Error de conexión");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje("");

    if (editandoId && !puedeEditar) {
      setMensaje("No tienes permiso para editar vehículos");
      return;
    }

    if (!editandoId && !puedeCrear) {
      setMensaje("No tienes permiso para crear vehículos");
      return;
    }

    if (!form.placa.trim() || !form.tipoVehiculo.trim() || !form.clienteId) {
      setMensaje("Completa todos los campos");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        placa: form.placa,
        tipoVehiculo: form.tipoVehiculo,
        clienteId: Number(form.clienteId),
      };

      const res = await fetch(
        editandoId ? `/api/vehiculos/${editandoId}` : "/api/vehiculos",
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
        setMensaje(data.error || "Error al guardar vehículo");
        return;
      }

      setMensaje(
        editandoId
          ? "Vehículo actualizado correctamente"
          : "Vehículo guardado correctamente"
      );

      setForm(initialForm);
      setEditandoId(null);

      await cargarTodo();
    } catch {
      setMensaje("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main style={styles.page}>
      <div style={styles.topBar}>
        <h1 style={styles.title}>Vehículos</h1>
        <Link href="/" style={styles.backLink}>
          ← Volver al menú
        </Link>
      </div>

      <div style={styles.layout}>
        <section style={styles.tableSection}>
          <div style={styles.tableHeader}>
            <span>Placa</span>
            <span>Tipo de Vehículo</span>
            <span>Cliente</span>
            <span>CC/NIT</span>
            <span>Acciones</span>
          </div>

          <div style={styles.tableBody}>
            {loading ? (
              <div style={styles.empty}>Cargando vehículos...</div>
            ) : vehiculos.length === 0 ? (
              <div style={styles.empty}>No hay vehículos guardados</div>
            ) : (
              vehiculos.map((vehiculo) => (
                <div key={vehiculo.id} style={styles.tableRow}>
                  <span>{vehiculo.placa}</span>
                  <span>{vehiculo.tipoVehiculo}</span>
                  <span>{vehiculo.cliente?.nombre}</span>
                  <span>{vehiculo.cliente?.ccNit}</span>
                  <span style={styles.actions}>
                    {puedeEditar && (
                      <button
                        type="button"
                        onClick={() => editarVehiculo(vehiculo)}
                        style={styles.editButton}
                      >
                        Editar
                      </button>
                    )}

                    {puedeEliminar && (
                      <button
                        type="button"
                        onClick={() => void eliminarVehiculo(vehiculo)}
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
            {editandoId ? "Editar Vehículo" : "Adicionar Vehículo"}
          </h2>

          {!editandoId && !puedeCrear && (
            <div style={styles.infoBox}>
              Este usuario solo puede consultar vehículos. No tiene permiso para crear nuevos registros.
            </div>
          )}

          <form onSubmit={handleSubmit} style={styles.form}>
            <input
              name="placa"
              placeholder="Placa"
              value={form.placa}
              onChange={handleChange}
              style={styles.input}
            />

            <select
              name="tipoVehiculo"
              value={form.tipoVehiculo}
              onChange={handleChange}
              style={styles.input}
            >
              <option value="">Tipo de vehículo</option>
              <option value="Tracto Mula">Tracto Mula</option>
              <option value="Sencillo">Sencillo</option>
              <option value="Doble Troque">Doble Troque</option>
              <option value="Turbo">Turbo</option>
              <option value="Movimiento interno">Movimiento interno</option>
              <option value="TM">TM</option>
              <option value="SC">SC</option>
              <option value="DT">DT</option>
              <option value="TB">TB</option>
            </select>

            <select
              name="clienteId"
              value={form.clienteId}
              onChange={handleChange}
              style={styles.input}
            >
              <option value="">Selecciona cliente</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nombre} - {cliente.ccNit}
                </option>
              ))}
            </select>

            {form.tipoVehiculo === "Movimiento interno" && (
              <div style={styles.infoBox}>
                Este vehículo queda como referencia interna del cliente{" "}
                <strong>{clienteSeleccionado?.nombre || "seleccionado"}</strong>.
                Úsalo cuando el servicio sea un movimiento interno sin placa real.
              </div>
            )}

            <button
              type="submit"
              style={styles.saveButton}
              disabled={saving || (editandoId ? !puedeEditar : !puedeCrear)}
            >
              {saving
                ? "Guardando..."
                : editandoId
                ? "Actualizar vehículo"
                : "Guardar vehículo"}
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
    maxHeight: "calc(100vh - 135px)",
    display: "flex",
    flexDirection: "column",
  },
  tableHeader: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1.4fr 1fr 1fr",
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
    gridTemplateColumns: "1fr 1fr 1.4fr 1fr 1fr",
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
    background: "#eef6ff",
    border: "1px solid #bfdbfe",
    borderRadius: "8px",
    padding: "12px",
    color: "#1e3a8a",
    fontSize: "14px",
    lineHeight: 1.4,
  },
  message: {
    margin: 0,
    fontWeight: 700,
  },
  empty: {
    padding: "18px",
  },
};
