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
      <section style={styles.card}>
        <div style={styles.logoPanel}>
          <img
            src="/logo-losercol.png"
            alt="Logo Losercol"
            style={styles.logo}
          />
        </div>

        <div style={styles.headerText}>
          <h1 style={styles.title}>Iniciar sesión</h1>
          <p style={styles.subtitle}>Ingresa con tu usuario autorizado</p>
        </div>

        <form onSubmit={iniciarSesion} style={styles.form} autoComplete="off">
          <input
            type="email"
            name="losercol_email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            autoComplete="off"
          />

          <input
            type="password"
            name="losercol_password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            autoComplete="new-password"
          />

          <button
            type="submit"
            disabled={loading}
            style={
              loading
                ? { ...styles.button, ...styles.buttonDisabled }
                : styles.button
            }
          >
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
      "radial-gradient(circle at top, #ffffff 0%, #eef3f8 48%, #e5e7eb 100%)",
    fontFamily: "Arial, Helvetica, sans-serif",
    boxSizing: "border-box",
  },

  card: {
    width: "100%",
    maxWidth: "520px",
    background: "rgba(255, 255, 255, 0.96)",
    borderRadius: "26px",
    padding: "34px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 26px 70px rgba(15, 23, 42, 0.18)",
  },

  logoPanel: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    margin: "0 auto 24px",
    padding: "18px 20px",
    width: "100%",
    maxWidth: "390px",
    minHeight: "132px",
    borderRadius: "22px",
    background:
      "linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(248,250,252,1) 100%)",
    border: "1px solid #eef2f7",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
    boxSizing: "border-box",
  },

  logo: {
    width: "340px",
    maxWidth: "100%",
    height: "auto",
    objectFit: "contain",
    display: "block",
    filter: "drop-shadow(0 10px 18px rgba(15, 23, 42, 0.12))",
  },

  headerText: {
    textAlign: "center",
    marginBottom: "28px",
  },

  title: {
    margin: "0 0 8px",
    fontSize: "34px",
    fontWeight: 900,
    color: "#0f172a",
    letterSpacing: "-0.5px",
  },

  subtitle: {
    margin: 0,
    fontSize: "15px",
    color: "#64748b",
  },

  form: {
    display: "grid",
    gap: "14px",
  },

  input: {
    width: "100%",
    height: "58px",
    padding: "0 17px",
    borderRadius: "16px",
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#0f172a",
    fontSize: "16px",
    outline: "none",
    boxSizing: "border-box",
    boxShadow: "0 1px 0 rgba(15, 23, 42, 0.02)",
  },

  button: {
    height: "60px",
    border: "none",
    borderRadius: "16px",
    background: "linear-gradient(135deg, #f8d000 0%, #f5c400 100%)",
    color: "#111827",
    fontWeight: 900,
    fontSize: "19px",
    cursor: "pointer",
    boxShadow: "0 14px 28px rgba(245, 196, 0, 0.32)",
  },

  buttonDisabled: {
    opacity: 0.75,
    cursor: "not-allowed",
  },

  error: {
    marginTop: "4px",
    padding: "12px",
    borderRadius: "14px",
    background: "#fef2f2",
    color: "#b91c1c",
    fontWeight: 800,
    textAlign: "center",
    border: "1px solid #fee2e2",
  },
};
