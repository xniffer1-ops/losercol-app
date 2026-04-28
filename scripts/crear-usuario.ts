import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@losercol.com";
  const passwordPlano = "123456";
  const passwordHash = await bcrypt.hash(passwordPlano, 10);

  const existe = await prisma.usuario.findUnique({
    where: { email },
  });

  if (existe) {
    console.log("El usuario ya existe");
    return;
  }

 await prisma.usuario.create({
  data: {
    nombre: "Admin",
    email: "admin@losercol.com",
    password: passwordHash,
    rol: "admin", // 👈 IMPORTANTE
  },
});

  console.log("Usuario creado correctamente");
  console.log("Email:", email);
  console.log("Password:", passwordPlano);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });