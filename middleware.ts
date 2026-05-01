import { NextRequest, NextResponse } from "next/server";

function leerPayload(token: string) {
  try {
    const payload = token.split(".")[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(base64);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function coincide(pathname: string, rutas: string[]) {
  return rutas.some(
    (ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`)
  );
}

export function middleware(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const { pathname } = req.nextUrl;

  const rutasPublicas = [
    "/login",
    "/api/login",
    "/api/logout",

  
  ];

  if (
    rutasPublicas.includes(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico")
  ) {
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const user = leerPayload(token);

  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (user.exp && Date.now() >= user.exp * 1000) {
    const response = NextResponse.redirect(new URL("/login", req.url));
    response.cookies.delete("token");
    return response;
  }

  const paginasOperador = [
    "/",
    "/servicio-rapido",
    "/operacion",
    "/servicios",
    "/soportes",
  ];

  const apisOperador = [
    "/api/me",
    "/api/logout",
    "/api/clientes",
    "/api/vehiculos",
    "/api/servicios",
    "/api/centros",
    "/api/secciones",
    "/api/tarifas",
  ];

  if (user.rol === "operador") {
    if (pathname.startsWith("/api")) {
      if (!coincide(pathname, apisOperador)) {
        return NextResponse.json(
          { error: "No tienes permiso para esta API" },
          { status: 403 }
        );
      }
    } else {
      if (!coincide(pathname, paginasOperador)) {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};