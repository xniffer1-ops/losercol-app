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
      <section style={styles.shell}>
        <aside style={styles.brandPanel}>
          <div style={styles.logoBlock}>
            <img src="/logo-losercol.png" alt="Losercol" style={styles.logo} />
          </div>

          <div style={styles.brandText}>
            <h2 style={styles.brandTitle}>Sistema Operativo</h2>
            <p style={styles.brandSubtitle}>
              Control interno de servicios, soportes, caja y reportes.
            </p>
          </div>

          <div style={styles.securityNote}>
            <span style={styles.securityDot} />
            Acceso restringido
          </div>
        </aside>

        <section style={styles.loginPanel}>
          <div style={styles.loginHeader}>
            <span style={styles.badge}>LOSERCOL</span>
            <h1 style={styles.title}>Acceso</h1>
            <p style={styles.subtitle}>Ingresa tus credenciales autorizadas.</p>
          </div>

          <form onSubmit={iniciarSesion} style={styles.form} autoComplete="off">
            <div style={styles.field}>
              <label htmlFor="usuario" style={styles.label}>
                Usuario
              </label>
              <input
                id="usuario"
                type="text"
                name="losercol_user"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <div style={styles.field}>
              <label htmlFor="clave" style={styles.label}>
                Clave
              </label>
              <input
                id="clave"
                type="password"
                name="losercol_key"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={
                loading
                  ? { ...styles.button, ...styles.buttonDisabled }
                  : styles.button
              }
            >
              {loading ? "Validando..." : "Entrar"}
            </button>

            {mensaje && <div style={styles.error}>{mensaje}</div>}
          </form>
        </section>
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
    padding: "26px",
    background:
      "linear-gradient(135deg, #eef3f8 0%, #e7edf5 48%, #dfe8f2 100%)",
    fontFamily: "Arial, Helvetica, sans-serif",
    boxSizing: "border-box",
  },

  shell: {
    width: "100%",
    maxWidth: "900px",
    minHeight: "520px",
    display: "grid",
    gridTemplateColumns: "1.05fr 0.95fr",
    background: "#ffffff",
    borderRadius: "30px",
    overflow: "hidden",
    border: "1px solid rgba(203, 213, 225, 0.9)",
    boxShadow: "0 34px 80px rgba(15, 23, 42, 0.18)",
  },

  brandPanel: {
    position: "relative",
    background:
      "linear-gradient(145deg, #0f172a 0%, #111827 48%, #0b3b44 100%)",
    padding: "46px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    color: "#ffffff",
    overflow: "hidden",
  },

  logoBlock: {
    width: "100%",
    maxWidth: "360px",
    background: "#ffffff",
    borderRadius: "22px",
    padding: "18px 20px",
    boxShadow: "0 22px 45px rgba(0, 0, 0, 0.22)",
    boxSizing: "border-box",
  },

  logo: {
    width: "100%",
    height: "auto",
    display: "block",
    objectFit: "contain",
  },

  brandText: {
    marginTop: "40px",
  },

  brandTitle: {
    margin: "0 0 12px",
    fontSize: "34px",
    fontWeight: 900,
    lineHeight: 1.05,
    letterSpacing: "-0.5px",
  },

  brandSubtitle: {
    margin: 0,
    maxWidth: "360px",
    color: "#cbd5e1",
    fontSize: "16px",
    lineHeight: 1.55,
  },

  securityNote: {
    display: "inline-flex",
    alignItems: "center",
    gap: "9px",
    width: "fit-content",
    color: "#e5e7eb",
    background: "rgba(255, 255, 255, 0.08)",
    border: "1px solid rgba(255, 255, 255, 0.14)",
    padding: "10px 14px",
    borderRadius: "999px",
    fontSize: "14px",
    fontWeight: 700,
  },

  securityDot: {
    width: "9px",
    height: "9px",
    borderRadius: "999px",
    background: "#f5c400",
    boxShadow: "0 0 0 4px rgba(245, 196, 0, 0.18)",
  },

  loginPanel: {
    padding: "54px 46px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    background:
      "linear-gradient(180deg, #ffffff 0%, #ffffff 62%, #f8fafc 100%)",
  },

  loginHeader: {
    marginBottom: "30px",
  },

  badge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "7px 11px",
    borderRadius: "999px",
    background: "#fff7d6",
    color: "#7a5600",
    fontSize: "12px",
    fontWeight: 900,
    letterSpacing: "0.7px",
    marginBottom: "16px",
  },

  title: {
    margin: "0 0 8px",
    color: "#0f172a",
    fontSize: "40px",
    fontWeight: 900,
    letterSpacing: "-0.9px",
    lineHeight: 1.05,
  },

  subtitle: {
    margin: 0,
    color: "#64748b",
    fontSize: "15px",
    lineHeight: 1.45,
  },

  form: {
    display: "grid",
    gap: "16px",
  },

  field: {
    display: "grid",
    gap: "8px",
  },

  label: {
    color: "#334155",
    fontSize: "13px",
    fontWeight: 900,
    letterSpacing: "0.2px",
  },

  input: {
    width: "100%",
    height: "58px",
    padding: "0 16px",
    borderRadius: "15px",
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#0f172a",
    fontSize: "17px",
    outline: "none",
    boxSizing: "border-box",
    boxShadow: "0 1px 0 rgba(15, 23, 42, 0.03)",
  },

  button: {
    marginTop: "8px",
    height: "60px",
    border: "none",
    borderRadius: "15px",
    background:
      "linear-gradient(135deg, #f8d000 0%, #f5c400 50%, #eab308 100%)",
    color: "#111827",
    fontWeight: 900,
    fontSize: "19px",
    cursor: "pointer",
    boxShadow: "0 16px 28px rgba(245, 196, 0, 0.28)",
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
    fontWeight: 800,
    fontSize: "14px",
  },
};
