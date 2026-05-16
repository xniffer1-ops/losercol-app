"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);

  const iniciarSesion = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje("");

    if (!email.trim() || !password.trim()) {
      setMensaje("Ingresa correo y contraseña");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMensaje(data.error || "Credenciales incorrectas");
        setLoading(false);
        return;
      }

      window.location.replace("/");
    } catch {
      setMensaje("Error de conexión");
      setLoading(false);
    }
  };

  return (
    <main style={styles.page}>
      <div style={styles.bgGlowOne} />
      <div style={styles.bgGlowTwo} />

      <section style={styles.card}>
        <div style={styles.topBar} />

        <div style={styles.logoWrap}>
          <img
            src="/logo-losercol.png"
            alt="Losercol"
            style={styles.logo}
          />
        </div>

        <div style={styles.header}>
          <h1 style={styles.title}>Iniciar sesión</h1>
          <p style={styles.subtitle}>Accede al sistema operativo de Losercol</p>
        </div>

        <form onSubmit={iniciarSesion} style={styles.form} autoComplete="off">
          <div style={styles.inputGroup}>
            <label style={styles.label}>Correo electrónico</label>
            <input
              type="email"
              name="losercol_email"
              placeholder="Ej: soporte@losercol.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              autoComplete="off"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Contraseña</label>
            <input
              type="password"
              name="losercol_password"
              placeholder="Ingresa tu contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={loading ? { ...styles.button, ...styles.buttonDisabled } : styles.button}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          {mensaje ? <div style={styles.error}>{mensaje}</div> : null}
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
    background: "linear-gradient(135deg, #eef3f8 0%, #e7edf5 45%, #dde6f1 100%)",
    position: "relative",
    overflow: "hidden",
    fontFamily: 'Arial, Helvetica, sans-serif',
    boxSizing: "border-box",
  },

  bgGlowOne: {
    position: "absolute",
    width: "420px",
    height: "420px",
    borderRadius: "999px",
    background: "radial-gradient(circle, rgba(245,196,0,0.22) 0%, rgba(245,196,0,0) 70%)",
    top: "-80px",
    left: "-80px",
    pointerEvents: "none",
  },

  bgGlowTwo: {
    position: "absolute",
    width: "420px",
    height: "420px",
    borderRadius: "999px",
    background: "radial-gradient(circle, rgba(13,148,136,0.16) 0%, rgba(13,148,136,0) 70%)",
    bottom: "-120px",
    right: "-90px",
    pointerEvents: "none",
  },

  card: {
    position: "relative",
    width: "100%",
    maxWidth: "520px",
    background: "rgba(255,255,255,0.94)",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    border: "1px solid rgba(255,255,255,0.75)",
    borderRadius: "28px",
    padding: "34px 34px 30px",
    boxShadow: "0 30px 60px rgba(15,23,42,0.16)",
    boxSizing: "border-box",
  },

  topBar: {
    width: "72px",
    height: "6px",
    borderRadius: "999px",
    margin: "0 auto 24px",
    background: "linear-gradient(90deg, #f5c400 0%, #0f766e 100%)",
  },

  logoWrap: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: "18px",
  },

  logo: {
    width: "300px",
    maxWidth: "100%",
    height: "auto",
    objectFit: "contain",
    display: "block",
    filter: "drop-shadow(0 8px 18px rgba(15,23,42,0.08))",
  },

  header: {
    textAlign: "center",
    marginBottom: "28px",
  },

  title: {
    margin: "0 0 8px",
    fontSize: "32px",
    fontWeight: 900,
    color: "#0f172a",
    letterSpacing: "-0.4px",
  },

  subtitle: {
    margin: 0,
    color: "#64748b",
    fontSize: "15px",
  },

  form: {
    display: "grid",
    gap: "16px",
  },

  inputGroup: {
    display: "grid",
    gap: "8px",
  },

  label: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#334155",
    paddingLeft: "4px",
  },

  input: {
    width: "100%",
    height: "58px",
    borderRadius: "16px",
    border: "1px solid #cbd5e1",
    background: "#f8fafc",
    padding: "0 16px",
    fontSize: "16px",
    color: "#0f172a",
    outline: "none",
    boxSizing: "border-box",
    transition: "all 0.2s ease",
  },

  button: {
    marginTop: "6px",
    height: "60px",
    borderRadius: "16px",
    border: "none",
    background: "linear-gradient(135deg, #f8d000 0%, #f3c300 100%)",
    color: "#0f172a",
    fontSize: "20px",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 16px 28px rgba(245,196,0,0.28)",
  },

  buttonDisabled: {
    opacity: 0.72,
    cursor: "not-allowed",
  },

  error: {
    marginTop: "4px",
    padding: "12px 14px",
    borderRadius: "14px",
    background: "#fef2f2",
    border: "1px solid #fee2e2",
    color: "#b91c1c",
    textAlign: "center",
    fontWeight: 700,
    fontSize: "14px",
  },
};
