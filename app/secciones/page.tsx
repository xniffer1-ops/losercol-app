"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

type Seccion = {
  id: number;
  nombre: string;
};

export default function SeccionesPage() {
  const [secciones, setSecciones] = useState<Seccion[]>([]);
  const [nombre, setNombre] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState<"ok" | "error">("ok");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const totalSecciones = useMemo(() => secciones.length, [secciones]);

  const cargar = async () => {
    try {
      setCargando(true);
      const res = await fetch("/api/secciones", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        setTipoMensaje("error");
        setMensaje(data.error || "No se pudieron cargar las secciones.");
        setSecciones([]);
        return;
      }

      setSecciones(Array.isArray(data) ? data : []);
    } catch {
      setTipoMensaje("error");
      setMensaje("No se pudieron cargar las secciones.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    void cargar();
  }, []);

  const guardar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) {
      setTipoMensaje("error");
      setMensaje("Escribe el nombre de la sección.");
      return;
    }

    try {
      setGuardando(true);
      setMensaje("");

      const res = await fetch("/api/secciones", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nombre: nombreLimpio }),
      });

      const data = await res.json();

      if (!res.ok) {
        setTipoMensaje("error");
        setMensaje(data.error || "No se pudo guardar la sección.");
        return;
      }

      setNombre("");
      setTipoMensaje("ok");
      setMensaje("Sección guardada correctamente.");
      await cargar();
    } catch {
      setTipoMensaje("error");
      setMensaje("Error de conexión guardando la sección.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <main className="losercol-page secciones-page">
      <header className="losercol-page-header secciones-header">
        <div>
          <h1 className="losercol-title">Secciones</h1>
        </div>
        <div className="secciones-counter" aria-label="Total secciones">
          <span>Total</span>
          <strong>{totalSecciones}</strong>
        </div>
      </header>

      <section className="secciones-layout">
        <form onSubmit={guardar} className="losercol-card secciones-form-card">
          <div className="secciones-card-head">
            <span className="secciones-icon">+</span>
            <h2>Nueva sección</h2>
          </div>

          <label className="secciones-label">
            <span>Nombre</span>
            <input
              className="losercol-input"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Materia prima"
              maxLength={80}
              autoComplete="off"
            />
          </label>

          <button className="losercol-button-primary" type="submit" disabled={guardando}>
            {guardando ? "Guardando..." : "Guardar sección"}
          </button>

          {mensaje && (
            <p className={tipoMensaje === "ok" ? "secciones-message-ok" : "secciones-message-error"}>
              {mensaje}
            </p>
          )}
        </form>

        <section className="losercol-card secciones-list-card">
          <div className="secciones-card-head secciones-list-head">
            <span className="secciones-icon">□</span>
            <h2>Registradas</h2>
          </div>

          {cargando ? (
            <div className="losercol-empty">Cargando...</div>
          ) : secciones.length === 0 ? (
            <div className="losercol-empty">No hay secciones creadas.</div>
          ) : (
            <div className="secciones-items">
              {secciones.map((seccion) => (
                <article key={seccion.id} className="secciones-item">
                  <span className="secciones-item-icon">{seccion.nombre.slice(0, 1).toUpperCase()}</span>
                  <strong>{seccion.nombre}</strong>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
