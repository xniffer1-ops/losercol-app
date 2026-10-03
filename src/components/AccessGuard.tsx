"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

type Permisos = Record<string, Record<string, boolean>>;
type Usuario = { rol: string; permisos?: Permisos };

const RUTAS: Array<[string, string]> = [
  ["/", "dashboard"],
  ["/clientes", "clientes"],
  ["/vehiculos", "vehiculos"],
  ["/centros", "centros"],
  ["/secciones", "secciones"],
  ["/tarifas", "tarifas"],
  ["/servicio-rapido", "servicioRapido"],
  ["/servicios", "servicios"],
  ["/soportes", "servicios"],
  ["/operacion", "servicios"],
  ["/caja", "caja"],
  ["/reportes", "reportes"],
  ["/historial", "historial"],
  ["/usuarios", "usuarios"],
  ["/factura-multiple", "servicios"],
  ["/facturas-multiples", "servicios"],
];

function moduloParaRuta(pathname: string) {
  const encontrada = RUTAS.find(([ruta]) => ruta === "/" ? pathname === "/" : pathname === ruta || pathname.startsWith(`${ruta}/`));
  return encontrada?.[1] || null;
}

export default function AccessGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const [estado, setEstado] = useState<"cargando" | "permitido" | "denegado">("cargando");

  useEffect(() => {
    let activo = true;

    const revisarPublica = async () => {
      if (pathname === "/verificar" || pathname.startsWith("/verificar/")) {
        if (activo) setEstado("permitido");
        return;
      }

      if (pathname === "/login" || pathname.startsWith("/login/")) {
        try {
          const res = await fetch("/api/me", { cache: "no-store" });
          if (res.ok) {
            const user = (await res.json()) as Usuario;
            const destino = RUTAS.slice(1).find(([, modulo]) => user.rol === "superadmin" || Boolean(user.permisos?.[modulo]?.ver))?.[0] || "/login";
            if (destino !== "/login") {
              router.replace(destino);
              return;
            }
          }
        } catch {
          // Sin sesión: se mantiene la pantalla de login.
        }
        if (activo) setEstado("permitido");
        return;
      }

      const revisar = async () => {
      setEstado("cargando");
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        if (!res.ok) {
          if (activo) router.replace("/login");
          return;
        }
        const user = (await res.json()) as Usuario;
        const modulo = moduloParaRuta(pathname);
        const permitido = !modulo || user.rol === "superadmin" || Boolean(user.permisos?.[modulo]?.ver);
        if (activo) setEstado(permitido ? "permitido" : "denegado");
      } catch {
        if (activo) setEstado("denegado");
      }
      };

      void revisar();
    };

    void revisarPublica();
    return () => { activo = false; };
  }, [pathname, router]);

  if (estado === "cargando") return <main style={{ padding: 32 }}>Verificando permisos...</main>;
  if (estado === "denegado") return (
    <main style={{ minHeight: "70vh", display: "grid", placeItems: "center", padding: 32 }}>
      <section style={{ maxWidth: 520, textAlign: "center", padding: 32, border: "1px solid #ddd", borderRadius: 16, background: "white" }}>
        <h1 style={{ marginTop: 0 }}>Acceso no autorizado</h1>
        <p>No tienes permiso para ver esta sección.</p>
        <button type="button" onClick={() => router.push("/")} style={{ padding: "10px 16px", cursor: "pointer" }}>Volver al inicio</button>
      </section>
    </main>
  );
  return <>{children}</>;
}
