import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { extractPdfText, parsePdfText } from "@/lib/parsers/pdf-parser";
import { getSession } from "@/lib/auth";

// Allow up to 120 seconds for OCR processing of image-based PDFs
export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const cardId = formData.get("cardId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!cardId) {
      return NextResponse.json(
        { error: "Card ID is required" },
        { status: 400 }
      );
    }

    // Verify card exists and belongs to user
    const card = await prisma.creditCard.findUnique({
      where: { id: cardId, userId: session.userId },
    });
    if (!card) {
      return NextResponse.json(
        { error: "Credit card not found" },
        { status: 404 }
      );
    }

    // Read file into buffer (stored in memory, no temp file needed)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract text from PDF
    const text = await extractPdfText(buffer);
    console.log(
      `[pdf/upload] Extracted ${text.length} chars from PDF "${file.name}"`
    );
    // Log first 500 chars for debugging
    if (text.length > 0) {
      console.log('[pdf/upload] Text preview:', text.substring(0, 500));
    } else {
      console.warn('[pdf/upload] EMPTY text extracted! OCR may have failed.');
    }

    // Parse transactions
    const parsed = parsePdfText(text);
    console.log(`[pdf/upload] Parsed ${parsed.length} transactions`);

    if (parsed.length === 0) {
      return NextResponse.json(
        {
          imported: 0,
          message: "No transactions could be parsed from the PDF.",
        },
        { status: 200 }
      );
    }

    // Insert with deduplication
    let imported = 0;
    let skipped = 0;

    for (const tx of parsed) {
      try {
        // Check for existing record by externalId
        const existing = await prisma.creditCardTransaction.findUnique({
          where: { externalId: tx.externalId },
        });

        if (existing) {
          skipped++;
          continue;
        }

        await prisma.creditCardTransaction.create({
          data: {
            cardId,
            amount: tx.amount,
            date: tx.date,
            description: tx.description,
            externalId: tx.externalId,
          },
        });
        imported++;
      } catch (err) {
        console.error(
          `[pdf/upload] Failed to insert transaction: ${tx.description}`,
          err
        );
      }
    }

    console.log(
      `[pdf/upload] Done. Imported: ${imported}, Skipped (duplicates): ${skipped}`
    );

    return NextResponse.json({
      imported,
      skipped,
      total: parsed.length,
    });
  } catch (error) {
    console.error("[pdf/upload] Error:", error);
    return NextResponse.json(
      { error: "Failed to process PDF" },
      { status: 500 }
    );
  }
}
