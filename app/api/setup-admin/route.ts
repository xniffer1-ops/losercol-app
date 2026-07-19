import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/src/lib/prisma";
import { serializarPermisos } from "@/src/lib/permisos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const crearRespuestaSinCache = (body: unknown, init?: ResponseInit) => {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
};

function tokenRecibido(req: NextRequest) {
  return (
    req.headers.get("x-setup-token") ||
    req.nextUrl.searchParams.get("token") ||
    ""
  ).trim();
}

function emailValido(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function asegurarColumnasCriticas() {
  // Repara bases de datos que fueron creadas con migraciones antiguas.
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "permisos" TEXT NOT NULL DEFAULT '{}'`
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "Tarifa" ADD COLUMN IF NOT EXISTS "cuentaTonelajeOperativo" BOOLEAN NOT NULL DEFAULT true'
  );
}

async function repararAcceso(req: NextRequest) {
  try {
    const setupToken = (process.env.ADMIN_SETUP_TOKEN || "").trim();

    if (!setupToken || setupToken.length < 16) {
      return crearRespuestaSinCache(
        {
          error:
            "Ruta de recuperación desactivada. Configura ADMIN_SETUP_TOKEN en Vercel para usarla.",
        },
        { status: 404 }
      );
    }

    if (tokenRecibido(req) !== setupToken) {
      return crearRespuestaSinCache(
        { error: "Token de recuperación inválido" },
        { status: 401 }
      );
    }

    const email = (process.env.ADMIN_SETUP_EMAIL || "soporte@losercol.com")
      .trim()
      .toLowerCase();
    const nombre = (process.env.ADMIN_SETUP_NOMBRE || "Soporte LOSERCOL").trim();
    const passwordPlano = (process.env.ADMIN_SETUP_PASSWORD || "").trim();

    if (!emailValido(email)) {
      return crearRespuestaSinCache(
        { error: "ADMIN_SETUP_EMAIL no es válido" },
        { status: 500 }
      );
    }

    if (!passwordPlano || passwordPlano.length < 8) {
      return crearRespuestaSinCache(
        {
          error:
            "ADMIN_SETUP_PASSWORD es obligatorio y debe tener mínimo 8 caracteres",
        },
        { status: 500 }
      );
    }

    await asegurarColumnasCriticas();

    const password = await bcrypt.hash(passwordPlano, 10);
    const permisos = serializarPermisos(undefined, "admin");

    const usuario = await prisma.usuario.upsert({
      where: { email },
      update: {
        nombre,
        password,
        rol: "admin",
        permisos,
      },
      create: {
        nombre,
        email,
        password,
        rol: "admin",
        permisos,
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
      },
    });

    return crearRespuestaSinCache({
      ok: true,
      mensaje: "Acceso admin reparado correctamente. Ahora puedes iniciar sesión.",
      usuario,
    });
  } catch (error) {
    console.error("Error reparando acceso admin:", error);
    return crearRespuestaSinCache(
      {
        error:
          "No se pudo reparar el acceso. Revisa DATABASE_URL y las migraciones de Prisma.",
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return repararAcceso(req);
}

export async function POST(req: NextRequest) {
  return repararAcceso(req);
}
