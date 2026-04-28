import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const existe = await prisma.usuario.findUnique({
    where: { email: "admin@admin.com" },
  });

  if (!existe) {
    const hash = await bcrypt.hash("123456", 10);

    await prisma.usuario.create({
      data: {
        nombre: "Admin",
        email: "admin@admin.com",
        password: hash,
        rol: "admin",
      },
    });

    console.log("✅ Admin creado");
  } else {
    console.log("⚠️ Admin ya existe");
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());