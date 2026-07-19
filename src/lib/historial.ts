import { prisma } from "@/src/lib/prisma";
import { getUser } from "@/src/lib/auth";

const EMAIL_SIN_HISTORIAL = "soporte@losercol.com";

export async function registrarAccion(
  accion: string,
  modulo: string,
  detalle: string
) {
  try {
    const user = await getUser();
    const email = String(user?.email || "sin usuario").trim().toLowerCase();

    if (email === EMAIL_SIN_HISTORIAL) {
      return;
    }

    await prisma.historialAccion.create({
      data: {
        usuario: email,
        rol: user?.rol || "sin rol",
        accion,
        modulo,
        detalle,
      },
    });
  } catch (error) {
    console.error("Error registrando historial:", error);
  }
}
