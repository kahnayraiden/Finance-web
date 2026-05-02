import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const creditCards = await prisma.creditCard.findMany({
      where: { userId: session.userId },
      include: {
        transactions: {
          orderBy: { date: "desc" },
        },
      },
    });
    return NextResponse.json(creditCards);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch credit cards" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name, limitAmount } = body;

    if (!name || !limitAmount) {
      return NextResponse.json({ error: "Name and limit amount are required" }, { status: 400 });
    }

    const creditCard = await prisma.creditCard.create({
      data: {
        name,
        limitAmount: Number(limitAmount),
        userId: session.userId,
      },
    });

    return NextResponse.json(creditCard, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create credit card" }, { status: 500 });
  }
}
