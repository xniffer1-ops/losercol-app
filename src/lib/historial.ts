import { prisma } from "@/src/lib/prisma";
import { getUser } from "@/src/lib/auth";

export async function registrarAccion(
  accion: string,
  modulo: string,
  detalle: string
) {
  try {
    const user = await getUser();

    await prisma.historialAccion.create({
      data: {
        usuario: user?.email || "sin usuario",
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