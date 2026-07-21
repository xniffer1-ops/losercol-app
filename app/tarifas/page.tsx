"use client";

import { useEffect, useMemo, useState } from "react";

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
  cuentaTonelajeOperativo?: boolean;
  tipoUso?: "terceros" | "interno" | "ambos" | string | null;
  centroOperacionId?: number | null;
  centroOperacion?: Centro | null;
  createdAt?: string;
};

const initialForm = {
  codigo: "",
  descripcion: "",
  valorUnitario: "",
  unidadMedida: "",
  presentacion: "",
  categoria: "",
  centroOperacionId: "",
  tipoUso: "terceros",
  cuentaTonelajeOperativo: "si",
};

const normalizarCodigo = (valor: string) => valor.trim().toUpperCase();

export default function TarifasPage() {
  const [tarifas, setTarifas] = useState<Tarifa[]>([]);
  const [centros, setCentros] = useState<Centro[]>([]);
  const [centroFiltro, setCentroFiltro] = useState("");
  const [form, setForm] = useState(initialForm);
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [eliminandoId, setEliminandoId] = useState<number | null>(null);

  const tituloFormulario = editandoId ? "Editar Tarifa" : "Adicionar Tarifa";
  const textoBotonGuardar = editandoId ? "Actualizar tarifa" : "Guardar tarifa";

  const tarifasOrdenadas = useMemo(() => {
    const centroId = Number(centroFiltro);
    return [...tarifas]
      .filter((tarifa) => !centroId || tarifa.centroOperacionId === centroId)
      .sort((a, b) => b.id - a.id);
  }, [tarifas, centroFiltro]);

  const cargarTarifas = async () => {
    try {
      const [resTarifas, resCentros] = await Promise.all([
        fetch("/api/tarifas", { cache: "no-store" }),
        fetch("/api/centros", { cache: "no-store" }),
      ]);

      const dataTarifas = await resTarifas.json();
      const dataCentros = await resCentros.json();

      if (!resTarifas.ok) {
        setMensaje(dataTarifas.error || "Error al cargar tarifas");
        setTarifas([]);
        return;
      }

      setTarifas(Array.isArray(dataTarifas) ? dataTarifas : []);
      setCentros(Array.isArray(dataCentros) ? dataCentros : []);
    } catch {
      setMensaje("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarTarifas();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]:
        name === "codigo" || name === "descripcion"
          ? value.toUpperCase()
          : value,
    }));
  };

  const limpiarFormulario = () => {
    setForm(initialForm);
    setEditandoId(null);
    setMensaje("");
  };

  const seleccionarEditar = (tarifa: Tarifa) => {
    setEditandoId(tarifa.id);
    setMensaje("");

    setForm({
      codigo: tarifa.codigo || "",
      descripcion: tarifa.descripcion || "",
      valorUnitario: String(tarifa.valorUnitario || ""),
      unidadMedida: tarifa.unidadMedida || "",
      presentacion: tarifa.presentacion || "",
      categoria: tarifa.categoria || "",
      centroOperacionId: tarifa.centroOperacionId ? String(tarifa.centroOperacionId) : "",
      tipoUso: String(tarifa.tipoUso || "terceros"),
      cuentaTonelajeOperativo: tarifa.cuentaTonelajeOperativo === false ? "no" : "si",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const guardarTarifa = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje("");

    const codigo = normalizarCodigo(form.codigo);

    if (
      !codigo ||
      !form.descripcion.trim() ||
      !form.valorUnitario ||
      !form.unidadMedida.trim() ||
      !form.presentacion.trim() ||
      !form.categoria.trim() ||
      !form.centroOperacionId
    ) {
      setMensaje("Completa todos los campos");
      return;
    }

    const valorUnitario = Number(form.valorUnitario);

    if (!Number.isFinite(valorUnitario) || valorUnitario <= 0) {
      setMensaje("El valor unitario debe ser mayor que cero");
      return;
    }

    const duplicada = tarifas.find(
      (tarifa) =>
        tarifa.codigo.trim().toUpperCase() === codigo &&
        tarifa.id !== editandoId
    );

    if (duplicada) {
      setMensaje(`Ya existe una tarifa con el ID ${codigo}`);
      return;
    }

    try {
      setSaving(true);

      const url = editandoId ? `/api/tarifas/${editandoId}` : "/api/tarifas";
      const method = editandoId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          codigo,
          descripcion: form.descripcion.trim().toUpperCase(),
          valorUnitario,
          centroOperacionId: Number(form.centroOperacionId),
          tipoUso: form.tipoUso,
          cuentaTonelajeOperativo: form.cuentaTonelajeOperativo !== "no",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMensaje(data.error || "Error al guardar tarifa");
        return;
      }

      setMensaje(
        editandoId
          ? "Tarifa actualizada correctamente"
          : "Tarifa creada correctamente"
      );
      setForm(initialForm);
      setEditandoId(null);
      await cargarTarifas();
    } catch {
      setMensaje("Error de conexión al guardar");
    } finally {
      setSaving(false);
    }
  };


  const cambiarTonelajeRapido = async (tarifa: Tarifa) => {
    const nuevoValor = tarifa.cuentaTonelajeOperativo === false;

    setMensaje("");

    try {
      setSaving(true);

      const res = await fetch(`/api/tarifas/${tarifa.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          codigo: tarifa.codigo,
          descripcion: tarifa.descripcion,
          valorUnitario: tarifa.valorUnitario,
          unidadMedida: tarifa.unidadMedida,
          presentacion: tarifa.presentacion,
          categoria: tarifa.categoria,
          centroOperacionId: tarifa.centroOperacionId,
          tipoUso: tarifa.tipoUso || "terceros",
          cuentaTonelajeOperativo: nuevoValor,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMensaje(data.error || "No fue posible cambiar el tonelaje real");
        return;
      }

      setMensaje(
        `Tarifa ${tarifa.codigo} actualizada: Tonelaje real ${
          nuevoValor ? "Sí" : "No"
        }`
      );

      setTarifas((prev) =>
        prev.map((item) =>
          item.id === tarifa.id
            ? { ...item, cuentaTonelajeOperativo: nuevoValor }
            : item
        )
      );

      if (editandoId === tarifa.id) {
        setForm((prev) => ({
          ...prev,
          cuentaTonelajeOperativo: nuevoValor ? "si" : "no",
        }));
      }
    } catch {
      setMensaje("Error de conexión al cambiar tonelaje real");
    } finally {
      setSaving(false);
    }
  };

  const eliminarTarifa = async (tarifa: Tarifa) => {
    const confirmar = window.confirm(
      `¿Seguro que deseas eliminar la tarifa ${tarifa.codigo} - ${tarifa.descripcion}?`
    );

    if (!confirmar) return;

    setMensaje("");
    setEliminandoId(tarifa.id);

    try {
      const res = await fetch(`/api/tarifas/${tarifa.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        setMensaje(data.error || "No fue posible eliminar la tarifa");
        return;
      }

      if (editandoId === tarifa.id) {
        limpiarFormulario();
      }

      setMensaje("Tarifa eliminada correctamente");
      await cargarTarifas();
    } catch {
      setMensaje("Error de conexión al eliminar");
    } finally {
      setEliminandoId(null);
    }
  };

  return (
    <main style={styles.page}>
      <div style={styles.topBar}>
        <div>
          <h1 style={styles.title}>Tarifas</h1>
          <p style={styles.subtitle}>Gestión de valores de servicios</p>
        </div>
      </div>

      <section style={styles.filterCard}>
        <label style={styles.filterLabel}>
          Ver tarifas por centro
          <select
            value={centroFiltro}
            onChange={(event) => setCentroFiltro(event.target.value)}
            style={styles.input}
          >
            <option value="">Todos los centros</option>
            {centros.map((centro) => (
              <option key={centro.id} value={centro.id}>
                {centro.nombre}
              </option>
            ))}
          </select>
        </label>
      </section>

      <div style={styles.layout}>
        <section style={styles.tableSection}>
          <div style={styles.tableHeader}>
            <span>ID</span>
            <span>Descripción</span>
            <span>Valor Unitario</span>
            <span>Centro</span>
            <span>Uso</span>
            <span>Unidad</span>
            <span>Tonelaje</span>
            <span>Presentación</span>
            <span>Categoría</span>
            <span>Acciones</span>
          </div>

          {loading ? (
            <div style={styles.empty}>Cargando tarifas...</div>
          ) : tarifasOrdenadas.length === 0 ? (
            <div style={styles.empty}>No hay tarifas registradas</div>
          ) : (
            tarifasOrdenadas.map((t) => (
              <div
                key={t.id}
                style={
                  editandoId === t.id
                    ? { ...styles.tableRow, ...styles.tableRowEditing }
                    : styles.tableRow
                }
              >
                <span>{t.codigo}</span>
                <span>{t.descripcion}</span>
                <span>${t.valorUnitario.toLocaleString("es-CO")}</span>
                <span>{t.centroOperacion?.nombre || "Sin centro"}</span>
                <span>{t.tipoUso === "interno" ? "Interno" : t.tipoUso === "ambos" ? "Ambos" : "Terceros"}</span>
                <span>{t.unidadMedida}</span>
                <span>
                  <button
                    type="button"
                    onClick={() => cambiarTonelajeRapido(t)}
                    disabled={saving}
                    title="Cambiar si esta tarifa cuenta o no en toneladas reales"
                    style={
                      t.cuentaTonelajeOperativo === false
                        ? styles.tonelajeNoButton
                        : styles.tonelajeSiButton
                    }
                  >
                    {t.cuentaTonelajeOperativo === false ? "No" : "Sí"}
                  </button>
                </span>
                <span>{t.presentacion}</span>
                <span>{t.categoria}</span>
                <span style={styles.actionsCell}>
                  <button
                    type="button"
                    onClick={() => seleccionarEditar(t)}
                    style={styles.editButton}
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => eliminarTarifa(t)}
                    disabled={eliminandoId === t.id}
                    style={
                      eliminandoId === t.id
                        ? { ...styles.deleteButton, opacity: 0.6 }
                        : styles.deleteButton
                    }
                  >
                    {eliminandoId === t.id ? "..." : "Eliminar"}
                  </button>
                </span>
              </div>
            ))
          )}
        </section>

        <section style={styles.formCard}>
          <h2 style={styles.formTitle}>{tituloFormulario}</h2>

          <form onSubmit={guardarTarifa} style={styles.form}>
            <input
              name="codigo"
              placeholder="ID Ej: LS001"
              value={form.codigo}
              onChange={handleChange}
              style={styles.input}
            />

            <input
              name="descripcion"
              placeholder="Descripción"
              value={form.descripcion}
              onChange={handleChange}
              style={styles.input}
            />

            <input
              name="valorUnitario"
              type="number"
              placeholder="Valor unitario"
              value={form.valorUnitario}
              onChange={handleChange}
              style={styles.input}
            />

            <select
              name="centroOperacionId"
              value={form.centroOperacionId}
              onChange={handleChange}
              style={styles.input}
            >
              <option value="">Centro de operación</option>
              {centros.map((centro) => (
                <option key={centro.id} value={centro.id}>
                  {centro.nombre}
                </option>
              ))}
            </select>

            <select
              name="tipoUso"
              value={form.tipoUso}
              onChange={handleChange}
              style={styles.input}
            >
              <option value="terceros">Cobro a terceros</option>
              <option value="interno">Movimiento interno</option>
              <option value="ambos">Ambos / general</option>
            </select>

            <select
              name="unidadMedida"
              value={form.unidadMedida}
              onChange={handleChange}
              style={styles.input}
            >
              <option value="">Unidad Medida</option>
              <option value="Tonelada">Tonelada</option>
              <option value="Hora Hombre">Hora Hombre</option>
              <option value="Unidad">Unidad</option>
              <option value="Vehículo">Vehículo</option>
            </select>

            <select
              name="cuentaTonelajeOperativo"
              value={form.cuentaTonelajeOperativo}
              onChange={handleChange}
              style={styles.input}
            >
              <option value="si">Cuenta en toneladas reales: Sí</option>
              <option value="no">Cuenta en toneladas reales: No</option>
            </select>

            

            <select
              name="presentacion"
              value={form.presentacion}
              onChange={handleChange}
              style={styles.input}
            >
              <option value="">Presentación</option>
              <option value="Bulto">Bulto</option>
              <option value="Granel">Granel</option>
              <option value="Hombre">Hombre</option>
              <option value="Pacas - Rollos">Pacas - Rollos</option>
              <option value="Tracto Mula">Tracto Mula</option>
              <option value="Doble Troque">Doble Troque</option>
              <option value="Sencillo">Sencillo</option>
              <option value="Carpa">Carpa</option>
              <option value="Estiba">Estiba</option>
              <option value="Vehículo">Vehículo</option>
            </select>

            <select
              name="categoria"
              value={form.categoria}
              onChange={handleChange}
              style={styles.input}
            >
              <option value="">Categoría</option>
              <option value="Descargue">Descargue</option>
              <option value="Cargue">Cargue</option>
              <option value="Servicio">Servicio</option>
              <option value="Movimientos">Movimientos</option>
            </select>

            <button type="submit" style={styles.saveButton} disabled={saving}>
              {saving ? "Guardando..." : textoBotonGuardar}
            </button>

            {editandoId && (
              <button
                type="button"
                onClick={limpiarFormulario}
                style={styles.cancelButton}
                disabled={saving}
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
    gap: "12px",
    flexWrap: "wrap",
  },
  title: {
    margin: 0,
    fontSize: "32px",
  },
  subtitle: {
    margin: "6px 0 0 0",
    color: "#555",
  },
  backLink: {
    textDecoration: "none",
    color: "#0b5cab",
    fontWeight: 700,
  },
  filterCard: {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "14px",
    padding: "16px",
    marginBottom: "18px",
  },
  filterLabel: {
    display: "grid",
    gap: "8px",
    color: "#374151",
    fontWeight: 800,
    maxWidth: "420px",
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
  },
  tableHeader: {
    display: "grid",
    gridTemplateColumns: "0.6fr 1.35fr 0.85fr 0.85fr 0.75fr 0.75fr 0.75fr 0.85fr 0.8fr 1.1fr",
    gap: "10px",
    background: "#f5c400",
    padding: "14px",
    fontWeight: 700,
  },
  tableRow: {
    display: "grid",
    gridTemplateColumns: "0.6fr 1.35fr 0.85fr 0.85fr 0.75fr 0.75fr 0.75fr 0.85fr 0.8fr 1.1fr",
    gap: "10px",
    padding: "12px 14px",
    borderTop: "1px solid #eee",
    alignItems: "center",
    background: "#fff",
  },
  tableRowEditing: {
    background: "#fffbe6",
  },
  actionsCell: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  editButton: {
    background: "#fff",
    color: "#111",
    border: "1px solid #cbd5e1",
    borderRadius: "6px",
    padding: "7px 10px",
    fontWeight: 700,
    cursor: "pointer",
  },
  deleteButton: {
    background: "#c81e1e",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "7px 10px",
    fontWeight: 700,
    cursor: "pointer",
  },
  tonelajeSiButton: {
    background: "#dcfce7",
    color: "#166534",
    border: "1px solid #bbf7d0",
    borderRadius: "999px",
    padding: "7px 14px",
    fontWeight: 800,
    cursor: "pointer",
    minWidth: "54px",
  },
  tonelajeNoButton: {
    background: "#fee2e2",
    color: "#991b1b",
    border: "1px solid #fecaca",
    borderRadius: "999px",
    padding: "7px 14px",
    fontWeight: 800,
    cursor: "pointer",
    minWidth: "54px",
  },
  formCard: {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "10px",
    padding: "20px",
    position: "sticky",
    top: "18px",
  },
  formTitle: {
    marginTop: 0,
    marginBottom: "16px",
  },
  form: {
    display: "grid",
    gap: "12px",
  },
  helpText: {
    marginTop: "-6px",
    color: "#555",
    fontSize: "12px",
    lineHeight: 1.4,
  },
  input: {
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    fontSize: "14px",
    width: "100%",
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
  message: {
    margin: 0,
    fontWeight: 700,
  },
  empty: {
    padding: "18px",
  },
};
