import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("admin123", 10);
  let admin = await prisma.user.findUnique({ where: { email: "admin@example.com" } });
  
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        email: "admin@example.com",
        password: hash,
        name: "Admin",
        role: "admin",
      },
    });
    console.log("Admin user created: admin@example.com / admin123");
  } else {
    console.log("Admin user already exists");
  }

  // Assign orphaned data to admin
  const updateCards = await prisma.creditCard.updateMany({
    where: { userId: null },
    data: { userId: admin.id },
  });
  console.log(`Updated ${updateCards.count} credit cards to belong to admin`);

  const updateTx = await prisma.transaction.updateMany({
    where: { userId: null },
    data: { userId: admin.id },
  });
  console.log(`Updated ${updateTx.count} transactions to belong to admin`);

  const updateCat = await prisma.category.updateMany({
    where: { userId: null },
    data: { userId: admin.id },
  });
  console.log(`Updated ${updateCat.count} categories to belong to admin`);

  const updateSub = await prisma.subscription.updateMany({
    where: { userId: null },
    data: { userId: admin.id },
  });
  console.log(`Updated ${updateSub.count} subscriptions to belong to admin`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
