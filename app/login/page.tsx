"use client";

import { useState } from "react";


export default function LoginPage() {
  const [email, setEmail] = useState("admin@losercol.com");
  const [password, setPassword] = useState("123456");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);

  const iniciarSesion = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje("");

    try {
      setLoading(true);

      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMensaje(data.error || "Credenciales incorrectas");
        setLoading(false);
        return;
      }

      window.location.href = "/";
    } catch {
      setMensaje("Error de conexión");
      setLoading(false);
    }
  };

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.logoBox}>
          <Image
            src="https://via.placeholder.com/260x100?text=LOSERCOL"
            alt="Logo Losercol"
            style={styles.logo}
          />
        </div>

        <h1 style={styles.title}>Iniciar sesión</h1>
        <p style={styles.subtitle}>Ingresa con tu usuario autorizado</p>

        <form onSubmit={iniciarSesion} style={styles.form}>
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
          />

          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
          />

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? "Entrando..." : "Entrar"}
          </button>

          {mensaje && <div style={styles.error}>{mensaje}</div>}
        </form>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    background:
      "radial-gradient(circle at top, #ffffff 0%, #eef2f7 45%, #e5e7eb 100%)",
    fontFamily: "Arial, Helvetica, sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: "460px",
    background: "#ffffff",
    borderRadius: "22px",
    padding: "34px",
    border: "1px solid #e5e7eb",
    boxShadow: "0 24px 60px rgba(15, 23, 42, 0.16)",
  },
  logoBox: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "26px",
  },
  logo: {
    width: "260px",
    maxWidth: "100%",
    height: "auto",
    objectFit: "contain",
  },
  title: {
    margin: "0 0 8px",
    textAlign: "center",
    fontSize: "32px",
    fontWeight: 800,
    color: "#0f172a",
  },
  subtitle: {
    margin: "0 0 28px",
    textAlign: "center",
    fontSize: "15px",
    color: "#64748b",
  },
  form: {
    display: "grid",
    gap: "14px",
  },
  input: {
    width: "100%",
    height: "56px",
    padding: "0 16px",
    borderRadius: "14px",
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#0f172a",
    fontSize: "16px",
    outline: "none",
    boxSizing: "border-box",
  },
  button: {
    height: "58px",
    border: "none",
    borderRadius: "14px",
    background: "#f6c400",
    color: "#111827",
    fontWeight: 800,
    fontSize: "19px",
    cursor: "pointer",
    boxShadow: "0 10px 22px rgba(246, 196, 0, 0.35)",
  },
  error: {
    marginTop: "4px",
    padding: "12px",
    borderRadius: "12px",
    background: "#fef2f2",
    color: "#b91c1c",
    fontWeight: 700,
    textAlign: "center",
  },
};