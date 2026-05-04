import { NextRequest, NextResponse } from "next/server";

type Rol = "superadmin" | "admin" | "operador";

type TokenPayload = {
  id?: number;
  nombre?: string;
  email?: string;
  rol?: Rol;
  exp?: number;
  iat?: number;
};

const rutasPublicas = ["/login", "/api/login", "/api/logout"];

const paginasOperador = [
  "/",
  "/servicio-rapido",
  "/servicios",
  "/soportes",
  "/caja",
];

const apisLecturaOperador = [
  "/api/me",
  "/api/clientes",
  "/api/vehiculos",
  "/api/servicios",
  "/api/centros",
  "/api/secciones",
  "/api/tarifas",
  "/api/caja",
];

const apisPostOperador = [
  "/api/clientes",
  "/api/vehiculos",
  "/api/servicios",
  "/api/caja/cerrar",
];

function agregarHeadersSeguridad(response: NextResponse) {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  return response;
}

function coincide(pathname: string, rutas: string[]) {
  return rutas.some(
    (ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`)
  );
}

function esArchivoPublico(pathname: string) {
  return (
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".webp") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".pdf")
  );
}

function base64UrlAUint8Array(valor: string) {
  const base64 = valor.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binario = atob(padded);
  const bytes = new Uint8Array(binario.length);

  for (let i = 0; i < binario.length; i += 1) {
    bytes[i] = binario.charCodeAt(i);
  }

  return bytes;
}

function leerJsonBase64Url(valor: string) {
  const bytes = base64UrlAUint8Array(valor);
  const texto = new TextDecoder().decode(bytes);
  return JSON.parse(texto);
}

function rolValido(rol: unknown): rol is Rol {
  return rol === "superadmin" || rol === "admin" || rol === "operador";
}

async function verificarToken(token: string): Promise<TokenPayload | null> {
  try {
    const secret = process.env.JWT_SECRET;

    if (!secret) return null;

    const partes = token.split(".");

    if (partes.length !== 3) return null;

    const [headerBase64, payloadBase64, firmaBase64] = partes;
    const header = leerJsonBase64Url(headerBase64);

    if (!header || header.alg !== "HS256") return null;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const firmaValida = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlAUint8Array(firmaBase64),
      encoder.encode(`${headerBase64}.${payloadBase64}`)
    );

    if (!firmaValida) return null;

    const payload = leerJsonBase64Url(payloadBase64) as TokenPayload;

    if (!payload || !rolValido(payload.rol)) return null;

    if (payload.exp && Date.now() >= payload.exp * 1000) return null;

    return payload;
  } catch {
    return null;
  }
}

function respuestaNoAutorizado(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const response = NextResponse.redirect(new URL("/login", req.url));
  response.cookies.delete("token");
  return response;
}

function operadorPuedeUsarApi(pathname: string, method: string) {
  if (method === "GET") {
    return coincide(pathname, apisLecturaOperador);
  }

  if (method === "POST") {
    return coincide(pathname, apisPostOperador);
  }

  return false;
}

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const { pathname } = req.nextUrl;

  if (
    rutasPublicas.includes(pathname) ||
    esArchivoPublico(pathname) ||
    pathname.startsWith("/_next")
  ) {
    if (pathname === "/login" && token) {
      const user = await verificarToken(token);
      if (user) {
        return agregarHeadersSeguridad(
          NextResponse.redirect(new URL("/", req.url))
        );
      }
    }

    return agregarHeadersSeguridad(NextResponse.next());
  }

  if (!token) {
    return agregarHeadersSeguridad(respuestaNoAutorizado(req));
  }

  const user = await verificarToken(token);

  if (!user) {
    return agregarHeadersSeguridad(respuestaNoAutorizado(req));
  }

  if (user.rol === "operador") {
    if (pathname.startsWith("/api")) {
      if (!operadorPuedeUsarApi(pathname, req.method)) {
        return agregarHeadersSeguridad(
          NextResponse.json(
            { error: "No tienes permiso para esta API" },
            { status: 403 }
          )
        );
      }
    } else if (!coincide(pathname, paginasOperador)) {
      return agregarHeadersSeguridad(NextResponse.redirect(new URL("/", req.url)));
    }
  }

  return agregarHeadersSeguridad(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
