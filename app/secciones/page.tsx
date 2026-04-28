"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Seccion = {
  id: number;
  nombre: string;
};

export default function SeccionesPage() {
  const [secciones, setSecciones] = useState<Seccion[]>([]);
  const [nombre, setNombre] = useState("");
  const [mensaje, setMensaje] = useState("");

  const cargar = async () => {
    const res = await fetch("/api/secciones");
    const data = await res.json();
    setSecciones(data);
  };

  useEffect(() => {
    cargar();
  }, []);

  const guardar = async (e: any) => {
    e.preventDefault();

    const res = await fetch("/api/secciones", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ nombre }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMensaje(data.error);
      return;
    }

    setNombre("");
    setMensaje("Guardado");
    cargar();
  };

  return (
    <main style={{ padding: 30 }}>
      <h1>Secciones</h1>

      <Link href="/">← Volver</Link>

      <form onSubmit={guardar} style={{ marginTop: 20 }}>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre sección"
        />
        <button>Guardar</button>
      </form>

      {mensaje && <p>{mensaje}</p>}

      <ul>
        {secciones.map((s) => (
          <li key={s.id}>{s.nombre}</li>
        ))}
      </ul>
    </main>
  );
}