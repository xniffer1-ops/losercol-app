import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const EMAIL = "soporte@losercol.com";

async function main() {
  const eliminados = await prisma.historialAccion.deleteMany({
    where: {
      usuario: EMAIL,
    },
  });

  console.log(`Registros eliminados del historial para ${EMAIL}: ${eliminados.count}`);
}

main()
  .catch((error) => {
    console.error("No se pudo limpiar el historial:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
