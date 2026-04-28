"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMensaje(data.error || "Error al iniciar sesión");
        setLoading(false);
        return;
      }

      window.location.href = "/";
    } catch (error) {
      console.error(error);
      setMensaje("Error de conexión");
      setLoading(false);
    }
  };

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoWrap}>
          <Image
            src="/logo-losercol.png"
            alt="Logo Losercol"
            width={320}
            height={120}
            style={styles.logo}
            priority
          />
        </div>

        <h1 style={styles.title}>Iniciar sesión</h1>
        <p style={styles.subtitle}>Ingresa con tu usuario autorizado</p>

        <form onSubmit={iniciarSesion} style={styles.form}>
          <input
            type="email"
            placeholder="Correo"
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

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>

          {mensaje && <p style={styles.message}>{mensaje}</p>}
        </form>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #f2f2f2 0%, #e8edf3 100%)",
    fontFamily: "Arial, sans-serif",
    padding: "20px",
  },
  card: {
    width: "100%",
    maxWidth: "460px",
    background: "#ffffff",
    border: "1px solid #d9d9d9",
    borderRadius: "16px",
    padding: "30px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.10)",
  },
  logoWrap: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "18px",
  },
  logo: {
    width: "100%",
    maxWidth: "300px",
    height: "auto",
    objectFit: "contain",
  },
  title: {
    marginTop: 0,
    marginBottom: "8px",
    textAlign: "center",
    color: "#111827",
    fontSize: "30px",
    fontWeight: 700,
  },
  subtitle: {
    marginTop: 0,
    marginBottom: "22px",
    textAlign: "center",
    color: "#4b5563",
    fontSize: "14px",
  },
  form: {
    display: "grid",
    gap: "14px",
  },
  input: {
    padding: "14px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    fontSize: "15px",
    color: "#111827",
    background: "#ffffff",
    outline: "none",
  },
  button: {
    padding: "14px",
    borderRadius: "10px",
    border: "none",
    background: "#f5c400",
    color: "#111827",
    fontWeight: 700,
    fontSize: "18px",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(245,196,0,0.35)",
  },
  message: {
    margin: 0,
    fontWeight: 700,
    color: "#b91c1c",
    textAlign: "center",
  },
};