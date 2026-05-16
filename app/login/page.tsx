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
    <main className="login-page">
      <section className="login-shell">
        <aside className="brand-side">
          <div className="brand-content">
            <img
              src="/logo-losercol-transparente.png"
              alt="LOSERCOL"
              className="brand-logo"
            />

            <div className="brand-copy">
              <p className="brand-kicker">Logística y Servicios de Colombia</p>
              <h1 className="brand-title">
                Gestión operativa LOSERCOL
              </h1>
              <p className="brand-text">
                Plataforma interna para apoyar el control y seguimiento de las operaciones.
              </p>
            </div>

            <div className="brand-features">
              <div className="feature-item">
                <span className="feature-icon">01</span>
                <span>Control operativo</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">02</span>
                <span>Seguimiento interno</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">03</span>
                <span>Información organizada</span>
              </div>
            </div>
          </div>
        </aside>

        <section className="form-side">
          <div className="form-card">
            <div className="mobile-logo-wrap">
              <img
                src="/logo-losercol-transparente.png"
                alt="LOSERCOL"
                className="mobile-logo"
              />
            </div>

            <div className="form-header">
              <span className="secure-badge">Acceso restringido</span>
              <h2>Iniciar sesión</h2>
              <p>Ingresa con tu usuario autorizado.</p>
            </div>

            <form onSubmit={iniciarSesion} className="form" autoComplete="off">
              <div className="field">
                <label htmlFor="losercol_user">Usuario autorizado</label>
                <input
                  id="losercol_user"
                  type="text"
                  name="losercol_user"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>

              <div className="field">
                <label htmlFor="losercol_key">Clave de acceso</label>
                <input
                  id="losercol_key"
                  type="password"
                  name="losercol_key"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>

              <button type="submit" disabled={loading}>
                {loading ? "Validando..." : "Entrar"}
              </button>

              {mensaje && <div className="error">{mensaje}</div>}
            </form>
          </div>
        </section>
      </section>

      <style jsx>{`
        .login-page {
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 28px;
          box-sizing: border-box;
          font-family: Arial, Helvetica, sans-serif;
          background:
            radial-gradient(circle at 15% 10%, rgba(245, 196, 0, 0.18), transparent 28%),
            radial-gradient(circle at 85% 90%, rgba(0, 129, 138, 0.18), transparent 30%),
            linear-gradient(135deg, #edf4f8 0%, #e7eef5 50%, #dfe8f1 100%);
        }

        .login-shell {
          width: 100%;
          max-width: 1060px;
          min-height: 620px;
          display: grid;
          grid-template-columns: 1fr 0.95fr;
          border-radius: 34px;
          overflow: hidden;
          background: #ffffff;
          box-shadow: 0 34px 90px rgba(15, 23, 42, 0.18);
          border: 1px solid rgba(203, 213, 225, 0.85);
        }

        .brand-side {
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(circle at 18% 16%, rgba(255, 255, 255, 0.08), transparent 28%),
            radial-gradient(circle at 88% 82%, rgba(245, 196, 0, 0.14), transparent 32%),
            linear-gradient(145deg, #0f2744 0%, #0f5d78 55%, #0f8894 100%);
          color: #ffffff;
        }

        .brand-side::before,
        .brand-side::after {
          content: "";
          position: absolute;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .brand-side::before {
          width: 360px;
          height: 360px;
          left: -110px;
          top: 70px;
        }

        .brand-side::after {
          width: 420px;
          height: 420px;
          right: -170px;
          bottom: -120px;
        }

        .brand-content {
          position: relative;
          z-index: 1;
          min-height: 100%;
          padding: 50px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 34px;
        }

        .brand-logo {
          width: 360px;
          max-width: 100%;
          height: auto;
          display: block;
          filter: brightness(0) invert(1) drop-shadow(0 18px 32px rgba(0, 0, 0, 0.12));
        }

        .brand-kicker {
          margin: 0 0 14px;
          color: rgba(255, 255, 255, 0.82);
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .brand-title {
          margin: 0;
          max-width: 520px;
          color: #ffffff;
          font-size: 42px;
          line-height: 1.1;
          font-weight: 900;
          letter-spacing: -1px;
        }

        .brand-text {
          margin: 20px 0 0;
          max-width: 490px;
          color: rgba(255, 255, 255, 0.86);
          font-size: 18px;
          line-height: 1.55;
        }

        .brand-features {
          display: grid;
          gap: 14px;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 14px;
          color: rgba(255, 255, 255, 0.92);
          font-size: 16px;
          font-weight: 700;
        }

        .feature-icon {
          width: 42px;
          height: 42px;
          min-width: 42px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.13);
          border: 1px solid rgba(255, 255, 255, 0.16);
          color: #f5c400;
          font-size: 13px;
          font-weight: 900;
        }

        .form-side {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px;
          background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
        }

        .form-card {
          width: 100%;
          max-width: 420px;
        }

        .mobile-logo-wrap {
          display: none;
          justify-content: center;
          margin-bottom: 22px;
        }

        .mobile-logo {
          width: 260px;
          max-width: 100%;
          height: auto;
        }

        .form-header {
          margin-bottom: 30px;
        }

        .secure-badge {
          display: inline-flex;
          align-items: center;
          padding: 8px 12px;
          border-radius: 999px;
          background: #fff7d6;
          color: #715200;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.04em;
          margin-bottom: 18px;
        }

        .form-header h2 {
          margin: 0 0 8px;
          color: #0f172a;
          font-size: 38px;
          line-height: 1.05;
          font-weight: 900;
          letter-spacing: -0.9px;
        }

        .form-header p {
          margin: 0;
          color: #64748b;
          font-size: 16px;
        }

        .form {
          display: grid;
          gap: 16px;
        }

        .field {
          display: grid;
          gap: 8px;
        }

        .field label {
          color: #334155;
          font-size: 13px;
          font-weight: 900;
        }

        .field input {
          width: 100%;
          height: 58px;
          border-radius: 16px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          padding: 0 16px;
          color: #0f172a;
          font-size: 17px;
          outline: none;
          box-sizing: border-box;
          box-shadow: 0 1px 0 rgba(15, 23, 42, 0.03);
        }

        .field input:focus {
          border-color: #0f8793;
          box-shadow: 0 0 0 4px rgba(15, 135, 147, 0.12);
        }

        button {
          height: 60px;
          border: none;
          border-radius: 16px;
          background: linear-gradient(135deg, #f8d000 0%, #f5c400 55%, #eab308 100%);
          color: #111827;
          font-size: 20px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 18px 32px rgba(245, 196, 0, 0.3);
          margin-top: 8px;
        }

        button:disabled {
          opacity: 0.72;
          cursor: not-allowed;
        }

        .error {
          margin-top: 4px;
          padding: 12px 14px;
          border-radius: 14px;
          background: #fef2f2;
          border: 1px solid #fee2e2;
          color: #b91c1c;
          font-size: 14px;
          font-weight: 800;
          text-align: center;
        }

        @media (max-width: 900px) {
          .login-shell {
            grid-template-columns: 1fr;
            max-width: 520px;
            min-height: auto;
          }

          .brand-side {
            display: none;
          }

          .form-side {
            padding: 38px;
          }

          .mobile-logo-wrap {
            display: flex;
          }

          .form-header {
            text-align: center;
          }
        }

        @media (max-width: 520px) {
          .login-page {
            padding: 16px;
          }

          .form-side {
            padding: 30px 22px;
          }

          .form-header h2 {
            font-size: 32px;
          }
        }
      `}</style>
    </main>
  );
}
