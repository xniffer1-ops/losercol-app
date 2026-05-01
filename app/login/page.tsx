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
        headers: { "Content-Type": "application/json" },
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
      setMensaje("Error de conexión");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-200">

        {/* LOGO */}
        <div className="flex justify-center mb-6">
          <Image
            src="/logo-losercol.png"
            alt="Losercol"
            width={220}
            height={80}
            className="object-contain"
          />
        </div>

        {/* TITULO */}
        <h1 className="text-3xl font-bold text-center text-gray-900">
          Iniciar sesión
        </h1>

        <p className="text-center text-gray-500 mt-2 mb-6">
          Ingresa con tu usuario autorizado
        </p>

        {/* FORM */}
        <form onSubmit={iniciarSesion} className="space-y-4">

          <input
            type="email"
            placeholder="Correo"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none"
          />

          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full p-3 rounded-lg bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold text-lg shadow-md transition"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          {mensaje && (
            <p className="text-red-600 font-semibold text-center">
              {mensaje}
            </p>
          )}

        </form>
      </div>
    </main>
  );
}