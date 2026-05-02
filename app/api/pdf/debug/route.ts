import { NextResponse } from "next/server";
import { extractPdfText } from "@/lib/parsers/pdf-parser";

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const text = await extractPdfText(buffer);

    return NextResponse.json({
      length: text.length,
      preview: text.substring(0, 1000),
      lines: text.split("\n").slice(0, 30),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}
