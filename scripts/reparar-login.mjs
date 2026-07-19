import { existsSync, readFileSync } from "node:fs";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

function cargarEnvLocal() {
  if (!existsSync(".env")) return;

  const contenido = readFileSync(".env", "utf8");

  for (const linea of contenido.split(/\r?\n/)) {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith("#") || !limpia.includes("=")) continue;

    const index = limpia.indexOf("=");
    const key = limpia.slice(0, index).trim();
    let value = limpia.slice(index + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) process.env[key] = value;
  }
}

cargarEnvLocal();

if (!process.env.DATABASE_URL) {
  console.error("Falta DATABASE_URL. Crea o revisa el archivo .env antes de ejecutar este script.");
  process.exit(1);
}

const prisma = new PrismaClient();

const email = (process.env.LOGIN_EMAIL || process.env.ADMIN_SETUP_EMAIL || "soporte@losercol.com")
  .trim()
  .toLowerCase();
const nombre = (process.env.LOGIN_NOMBRE || process.env.ADMIN_SETUP_NOMBRE || "Soporte LOSERCOL").trim();
const passwordPlano =
  (process.env.LOGIN_PASSWORD || process.env.ADMIN_SETUP_PASSWORD || "").trim() ||
  `Losercol-${crypto.randomBytes(4).toString("hex")}`;

function permisosAdmin() {
  const permisos = {
    dashboard: { ver: true },
    clientes: { ver: true, crear: true, editar: true, eliminar: true },
    vehiculos: { ver: true, crear: true, editar: true, eliminar: true },
    centros: { ver: true, crear: true, editar: true, eliminar: true },
    tarifas: { ver: true, crear: true, editar: true, eliminar: true },
    servicioRapido: { ver: true, crear: true },
    servicios: { ver: true, crear: true, editar: true, eliminar: true, pdf: true, whatsapp: true },
    caja: { ver: true, cerrar: true, reabrir: true },
    reportes: { ver: true, exportar: true },
    historial: { ver: true },
    usuarios: { ver: true, crear: true, editar: true, eliminar: true, cambiarPassword: true, cambiarRol: true },
    backup: { ver: true, exportar: true },
  };

  return JSON.stringify(permisos);
}

async function asegurarColumnasCriticas() {
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "permisos" TEXT NOT NULL DEFAULT '{}'`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Tarifa" ADD COLUMN IF NOT EXISTS "cuentaTonelajeOperativo" BOOLEAN NOT NULL DEFAULT true`
  );
}

async function main() {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(`Email inválido: ${email}`);
  }

  if (passwordPlano.length < 8) {
    throw new Error("La contraseña debe tener mínimo 8 caracteres");
  }

  await asegurarColumnasCriticas();

  const password = await bcrypt.hash(passwordPlano, 10);

  const usuario = await prisma.usuario.upsert({
    where: { email },
    update: {
      nombre,
      password,
      rol: "admin",
      permisos: permisosAdmin(),
    },
    create: {
      nombre,
      email,
      password,
      rol: "admin",
      permisos: permisosAdmin(),
    },
    select: {
      id: true,
      nombre: true,
      email: true,
      rol: true,
    },
  });

  console.log("Acceso reparado correctamente:");
  console.log("Usuario:", usuario.email);
  console.log("Rol:", usuario.rol);
  console.log("Contraseña temporal:", passwordPlano);
  console.log("\nEntra a /login con ese usuario y cambia la contraseña después.");
}

main()
  .catch((error) => {
    console.error("No se pudo reparar el login:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
