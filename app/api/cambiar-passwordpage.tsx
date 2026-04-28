"use client";

import { useState } from "react";
import Link from "next/link";

export default function CambiarPassword() {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [mensaje, setMensaje] = useState("");

  const cambiar = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje("");

    const res = await fetch("/api/cambiar-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ actual, nueva }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMensaje(data.error);
      return;
    }

    setMensaje("Contraseña actualizada correctamente");
    setActual("");
    setNueva("");
  };

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <h2>Cambiar contraseña</h2>

        <form onSubmit={cambiar} style={styles.form}>
          <input
            type="password"
            placeholder="Contraseña actual"
            value={actual}
            onChange={(e) => setActual(e.target.value)}
            style={styles.input}
          />

          <input
            type="password"
            placeholder="Nueva contraseña"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            style={styles.input}
          />

          <button style={styles.btn}>Actualizar</button>
        </form>

        {mensaje && <p>{mensaje}</p>}

        <Link href="/">← Volver</Link>
      </div>
    </main>
  );
}

const styles: any = {
  page: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    background: "#f2f2f2",
  },
  card: {
    background: "#fff",
    padding: "30px",
    borderRadius: "10px",
    width: "320px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  input: {
    padding: "10px",
  },
  btn: {
    background: "#f5c400",
    padding: "10px",
    border: "none",
    fontWeight: "bold",
  },
};