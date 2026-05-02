import { NextResponse } from "next/server";
import { parseEmailBody } from "@/lib/parsers/email-parser";

/**
 * POST /api/email/test-parse
 *
 * Test the email parser with raw text input.
 * Body: { text: string }
 * Returns: parsed transactions
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Provide a 'text' field with email body content." },
        { status: 400 }
      );
    }

    const parsed = parseEmailBody(text);

    return NextResponse.json({
      input: text.substring(0, 200) + (text.length > 200 ? "..." : ""),
      count: parsed.length,
      transactions: parsed.map((tx) => ({
        amount: tx.amount,
        type: tx.type,
        date: tx.date.toISOString(),
        description: tx.description,
        externalId: tx.externalId,
      })),
    });
  } catch (error: any) {
    console.error("[email/test-parse] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to parse text" },
      { status: 500 }
    );
  }
}
