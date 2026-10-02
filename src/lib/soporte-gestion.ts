import { prisma } from "@/src/lib/prisma";
import type { Prisma } from "@prisma/client";

export const EMAIL_GESTION_SOPORTES = "soporte@losercol.com";

export function esUsuarioGestionSoportes(email: string | null | undefined) {
  return String(email || "").trim().toLowerCase() === EMAIL_GESTION_SOPORTES;
}

export function normalizarNumeroSoporte(valor: unknown) {
  const texto = String(valor || "").trim().toUpperCase();

  if (!texto) return "";

  const sinEspacios = texto.replace(/\s+/g, "");
  const coincidencia = sinEspacios.match(/^SP-?(\d+)$/);

  if (!coincidencia) return "";

  const numero = Number(coincidencia[1]);
  if (!Number.isSafeInteger(numero) || numero <= 0) return "";

  return `SP-${String(numero).padStart(6, "0")}`;
}

export function numeroDesdeSoporte(valor: string | null | undefined) {
  const normalizado = normalizarNumeroSoporte(valor);
  if (!normalizado) return null;

  const numero = Number(normalizado.replace("SP-", ""));
  return Number.isSafeInteger(numero) && numero > 0 ? numero : null;
}

export async function obtenerSiguienteNumeroSoporte(tx: Prisma.TransactionClient | typeof prisma = prisma) {
  const configuracion = await tx.configuracionSoporte.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      siguienteNumero: 1,
      prefijo: "SP-",
    },
  });

  let siguiente = Math.max(Number(configuracion.siguienteNumero || 1), 1);

  // Si el consecutivo configurado ya está ocupado, avanza hasta encontrar uno libre.
  // Esto permite corregir la secuencia manualmente sin romper números existentes.
  while (true) {
    const numeroSoporte = `SP-${String(siguiente).padStart(6, "0")}`;

    const [servicioOcupado, soporteOcupado, recuperacionPendiente] =
      await Promise.all([
        tx.servicio.findFirst({
          where: { numeroSoporte },
          select: { id: true },
        }),
        tx.soporte.findFirst({
          where: { numero: numeroSoporte },
          select: { id: true },
        }),
        tx.soporteEliminado.findFirst({
          where: { numeroSoporte, restaurado: false },
          select: { id: true },
        }),
      ]);

    if (!servicioOcupado && !soporteOcupado && !recuperacionPendiente) {
      await tx.configuracionSoporte.update({
        where: { id: 1 },
        data: { siguienteNumero: siguiente + 1 },
      });

      return numeroSoporte;
    }

    siguiente += 1;
  }
}
