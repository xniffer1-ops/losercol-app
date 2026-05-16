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
      setMensaje("Datos requeridos");
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
      <div style={styles.backShapeOne} />
      <div style={styles.backShapeTwo} />

      <section style={styles.card}>
        <div style={styles.brandHeader}>
          <img
            src="/logo-losercol-transparente.png"
            alt="Losercol"
            style={styles.logo}
          />
        </div>

        <div style={styles.content}>
          <h1 style={styles.title}>Iniciar sesión</h1>
          <p style={styles.subtitle}>Acceso autorizado</p>

          <form onSubmit={iniciarSesion} style={styles.form} autoComplete="off">
            <input
              type="text"
              name="losercol_user"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              autoComplete="off"
              spellCheck={false}
            />

            <input
              type="password"
              name="losercol_key"
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
        </div>
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
      "linear-gradient(135deg, #edf4f8 0%, #e8eef5 42%, #dde8ef 100%)",
    fontFamily: "Arial, Helvetica, sans-serif",
    boxSizing: "border-box",
    position: "relative",
    overflow: "hidden",
  },

  backShapeOne: {
    position: "absolute",
    width: "420px",
    height: "420px",
    borderRadius: "999px",
    background:
      "radial-gradient(circle, rgba(245, 196, 0, 0.20) 0%, rgba(245, 196, 0, 0) 68%)",
    top: "-120px",
    left: "-90px",
    pointerEvents: "none",
  },

  backShapeTwo: {
    position: "absolute",
    width: "460px",
    height: "460px",
    borderRadius: "999px",
    background:
      "radial-gradient(circle, rgba(0, 132, 140, 0.18) 0%, rgba(0, 132, 140, 0) 70%)",
    right: "-130px",
    bottom: "-150px",
    pointerEvents: "none",
  },

  card: {
    width: "100%",
    maxWidth: "500px",
    background: "#ffffff",
    borderRadius: "30px",
    border: "1px solid rgba(203, 213, 225, 0.9)",
    boxShadow: "0 34px 80px rgba(15, 23, 42, 0.17)",
    overflow: "hidden",
    position: "relative",
    zIndex: 1,
  },

  brandHeader: {
    minHeight: "168px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "30px 38px 22px",
    background:
      "linear-gradient(135deg, #ffffff 0%, #f8fafc 58%, #eef6f6 100%)",
    borderBottom: "1px solid #edf2f7",
    boxSizing: "border-box",
  },

  logo: {
    width: "330px",
    maxWidth: "100%",
    height: "auto",
    objectFit: "contain",
    display: "block",
    filter: "drop-shadow(0 12px 18px rgba(15, 23, 42, 0.12))",
  },

  content: {
    padding: "30px 38px 38px",
  },

  title: {
    margin: "0 0 7px",
    textAlign: "center",
    color: "#0f172a",
    fontSize: "34px",
    fontWeight: 900,
    letterSpacing: "-0.5px",
  },

  subtitle: {
    margin: "0 0 28px",
    textAlign: "center",
    color: "#64748b",
    fontSize: "15px",
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
    fontSize: "17px",
    outline: "none",
    boxSizing: "border-box",
    boxShadow: "0 1px 0 rgba(15, 23, 42, 0.03)",
  },

  button: {
    marginTop: "6px",
    height: "60px",
    border: "none",
    borderRadius: "16px",
    background:
      "linear-gradient(135deg, #f8d000 0%, #f5c400 52%, #eab308 100%)",
    color: "#111827",
    fontWeight: 900,
    fontSize: "20px",
    cursor: "pointer",
    boxShadow: "0 16px 30px rgba(245, 196, 0, 0.30)",
  },

  buttonDisabled: {
    opacity: 0.72,
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

