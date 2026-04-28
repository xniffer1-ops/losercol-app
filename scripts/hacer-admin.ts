import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const usuario = await prisma.usuario.update({
    where: {
      email: "admin@losercol.com",
    },
    data: {
      rol: "admin",
    },
  });

  console.log("Usuario actualizado a admin:");
  console.log(usuario.email, usuario.rol);
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });