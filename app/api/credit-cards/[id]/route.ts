import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const card = await prisma.creditCard.findUnique({
      where: { id: params.id, userId: session.userId },
      include: {
        transactions: {
          orderBy: { date: "desc" },
        },
      },
    });
    if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(card);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch credit card" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await prisma.creditCard.delete({
      where: { id: params.id, userId: session.userId },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete credit card" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const card = await prisma.creditCard.update({
      where: { id: params.id, userId: session.userId },
      data: body,
    });
    return NextResponse.json(card);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update credit card" },
      { status: 500 }
    );
  }
}
