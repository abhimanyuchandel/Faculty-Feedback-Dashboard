import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2]?.toLowerCase() ?? process.env.ADMIN_EMAIL?.toLowerCase();
  const password = process.argv[3] ?? process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("Usage: tsx scripts/create-admin.ts <email> <password> or set ADMIN_EMAIL and ADMIN_PASSWORD");
  }

  const hash = await bcrypt.hash(password, 12);

  const adminRole = await prisma.adminRole.upsert({
    where: { name: "admin" },
    update: {},
    create: {
      name: "admin",
      description: "Administrator access"
    }
  });

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash: hash,
      activeStatus: true
    },
    create: {
      email,
      passwordHash: hash,
      activeStatus: true
    }
  });

  await prisma.adminUserRole.upsert({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId: adminRole.id
      }
    },
    update: {},
    create: {
      userId: user.id,
      roleId: adminRole.id
    }
  });

  console.log(`Admin user ready: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
