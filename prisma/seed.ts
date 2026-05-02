import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Seed categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { id: "cat-salary" },
      update: {},
      create: { id: "cat-salary", name: "Salary", type: "income" },
    }),
    prisma.category.upsert({
      where: { id: "cat-freelance" },
      update: {},
      create: { id: "cat-freelance", name: "Freelance", type: "income" },
    }),
    prisma.category.upsert({
      where: { id: "cat-food" },
      update: {},
      create: { id: "cat-food", name: "Food", type: "expense" },
    }),
    prisma.category.upsert({
      where: { id: "cat-rent" },
      update: {},
      create: { id: "cat-rent", name: "Rent", type: "expense" },
    }),
    prisma.category.upsert({
      where: { id: "cat-entertainment" },
      update: {},
      create: { id: "cat-entertainment", name: "Entertainment", type: "expense" },
    }),
    prisma.category.upsert({
      where: { id: "cat-transport" },
      update: {},
      create: { id: "cat-transport", name: "Transport", type: "expense" },
    }),
    prisma.category.upsert({
      where: { id: "cat-utilities" },
      update: {},
      create: { id: "cat-utilities", name: "Utilities", type: "expense" },
    }),
    prisma.category.upsert({
      where: { id: "cat-shopping" },
      update: {},
      create: { id: "cat-shopping", name: "Shopping", type: "expense" },
    }),
  ]);

  console.log(`✅ Seeded ${categories.length} categories`);

  // Seed some sample transactions
  const now = new Date();
  const sampleTransactions = [
    {
      amount: 25000000,
      type: "income",
      categoryId: "cat-salary",
      note: "Monthly salary - April 2026",
      date: new Date(now.getFullYear(), now.getMonth(), 1),
      source: "manual",
    },
    {
      amount: 5000000,
      type: "expense",
      categoryId: "cat-rent",
      note: "Monthly rent",
      date: new Date(now.getFullYear(), now.getMonth(), 5),
      source: "manual",
    },
    {
      amount: 1200000,
      type: "expense",
      categoryId: "cat-food",
      note: "Groceries",
      date: new Date(now.getFullYear(), now.getMonth(), 8),
      source: "manual",
    },
    {
      amount: 500000,
      type: "expense",
      categoryId: "cat-entertainment",
      note: "Movie tickets + dinner",
      date: new Date(now.getFullYear(), now.getMonth(), 10),
      source: "manual",
    },
    {
      amount: 350000,
      type: "expense",
      categoryId: "cat-transport",
      note: "Grab rides",
      date: new Date(now.getFullYear(), now.getMonth(), 12),
      source: "manual",
    },
    {
      amount: 8000000,
      type: "income",
      categoryId: "cat-freelance",
      note: "Freelance project payment",
      date: new Date(now.getFullYear(), now.getMonth(), 15),
      source: "manual",
    },
    {
      amount: 800000,
      type: "expense",
      categoryId: "cat-food",
      note: "Restaurant dinner",
      date: new Date(now.getFullYear(), now.getMonth(), 16),
      source: "manual",
    },
    // Last month data
    {
      amount: 25000000,
      type: "income",
      categoryId: "cat-salary",
      note: "Monthly salary - March 2026",
      date: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      source: "manual",
    },
    {
      amount: 5000000,
      type: "expense",
      categoryId: "cat-rent",
      note: "Monthly rent",
      date: new Date(now.getFullYear(), now.getMonth() - 1, 5),
      source: "manual",
    },
    {
      amount: 2000000,
      type: "expense",
      categoryId: "cat-shopping",
      note: "New clothes",
      date: new Date(now.getFullYear(), now.getMonth() - 1, 20),
      source: "manual",
    },
    {
      amount: 1500000,
      type: "expense",
      categoryId: "cat-utilities",
      note: "Electricity + Internet",
      date: new Date(now.getFullYear(), now.getMonth() - 1, 25),
      source: "manual",
    },
  ];

  for (const tx of sampleTransactions) {
    await prisma.transaction.create({ data: tx });
  }

  console.log(`✅ Seeded ${sampleTransactions.length} transactions`);

  // Seed sample subscriptions
  const subscriptions = [
    {
      name: "Netflix",
      amount: 260000,
      billingCycle: "monthly",
      startDate: new Date("2025-01-01"),
      nextDueDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      status: "active",
    },
    {
      name: "Spotify",
      amount: 59000,
      billingCycle: "monthly",
      startDate: new Date("2025-03-15"),
      nextDueDate: new Date(now.getFullYear(), now.getMonth() + 1, 15),
      status: "active",
    },
    {
      name: "GitHub Pro",
      amount: 110000,
      billingCycle: "monthly",
      startDate: new Date("2024-06-01"),
      nextDueDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      status: "active",
    },
  ];

  for (const sub of subscriptions) {
    await prisma.subscription.create({ data: sub });
  }

  console.log(`✅ Seeded ${subscriptions.length} subscriptions`);

  // Seed a sample credit card
  const card = await prisma.creditCard.create({
    data: {
      name: "Visa Platinum",
      limitAmount: 50000000,
    },
  });

  const ccTransactions = [
    {
      cardId: card.id,
      amount: 1200000,
      date: new Date(now.getFullYear(), now.getMonth(), 3),
      description: "Shopee Online Purchase",
    },
    {
      cardId: card.id,
      amount: 450000,
      date: new Date(now.getFullYear(), now.getMonth(), 7),
      description: "Grab Premium Ride",
    },
    {
      cardId: card.id,
      amount: 800000,
      date: new Date(now.getFullYear(), now.getMonth(), 14),
      description: "Coffee House",
    },
  ];

  for (const tx of ccTransactions) {
    await prisma.creditCardTransaction.create({ data: tx });
  }

  console.log(`✅ Seeded 1 credit card with ${ccTransactions.length} transactions`);

  console.log("\n🎉 Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
