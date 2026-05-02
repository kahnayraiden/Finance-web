import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { getSession } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const card = await prisma.creditCard.findUnique({
      where: { id: params.id, userId: session.userId }
    });
    if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 });

    const { amount, date, description } = await req.json();

    if (!amount || !date || !description) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Generate a unique externalId based on content for deduplication
    const raw = `${amount}|${new Date(date).toISOString()}|${description}`.toLowerCase().trim();
    const externalId = crypto.createHash("sha256").update(raw).digest("hex").substring(0, 32);

    const transaction = await prisma.creditCardTransaction.create({
      data: {
        cardId: params.id,
        amount: parseFloat(amount),
        date: new Date(date),
        description,
        externalId: `manual_${externalId}`, // Add prefix to distinguish manual entries
      },
    });

    return NextResponse.json(transaction);
  } catch (error) {
    console.error("Failed to add transaction", error);
    return NextResponse.json(
      { error: "Failed to add transaction" },
      { status: 500 }
    );
  }
}
