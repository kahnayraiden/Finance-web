import {
  normalizeCurrency,
  parseDate,
  generateExternalId,
  ParsedTransaction,
} from "./parser-utils";

/**
 * Base interface for bank-specific PDF parser templates.
 */
export interface PdfParserTemplate {
  name: string;
  matches(text: string): boolean;
  parse(text: string): ParsedTransaction[];
}

// ─── TPBank Credit Card Statement Template ──────────────────────────────────

const tpbankCreditCardTemplate: PdfParserTemplate = {
  name: "tpbank-credit-card",

  matches(text: string): boolean {
    const lower = text.toLowerCase();
    return (
      (lower.includes("tpbank") ||
        lower.includes("tiên phong") ||
        lower.includes("tien phong")) &&
      (lower.includes("sao kê") ||
        lower.includes("credit card") ||
        lower.includes("thẻ tín dụng") ||
        lower.includes("statement"))
    );
  },

  parse(text: string): ParsedTransaction[] {
    const results: ParsedTransaction[] = [];
    const lines = text.split("\n");

    // TPBank statement has two row formats from OCR:
    // Format A (table with pipes, noisy):
    //   "| 0303/2026 | 03032026 TTQUATPBANKEBANE | \ND24000O 2400000"
    // Format B (clean rows):
    //   "15/02/2026 23/02/2026 PAYOO-MINISTOP VND 51.000 51.000"
    //
    // Strategy:
    // 1. Strip pipes, normalize OCR date artifacts
    // 2. Match two consecutive dates at start
    // 3. Collect amount tokens from end, strip OCR trailing garbage

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.length < 20) continue;

      // Strip pipe characters (table borders in OCR)
      const cleaned = trimmed.replace(/\|/g, " ").replace(/\s+/g, " ").trim();

      // Normalize OCR date artifacts:
      //   "0303/2026" → "03/03/2026"
      //   "23022026" → "23/02/2026"
      const normalizedLine = cleaned
        .replace(/\b(\d{2})(\d{2})\/(\d{4})\b/g, "$1/$2/$3")
        .replace(/\b(\d{2})(\d{2})(\d{4})\b/g, "$1/$2/$3");

      // Usually: DD/MM/YYYY DD/MM/YYYY Description Amount Amount
      // We only strictly validate the FIRST date (Txn Date) since we only use that.
      // The SECOND date (Post Date) is often mangled by OCR (e.g. 2302202 ), so we just match \S+ for it.
      const twoDateMatch = normalizedLine.match(
        /^(\d{1,2}\/\d{1,2}\/\d{4})\s+(\S+)\s+(.+)$/
      );
      if (!twoDateMatch) continue;

      const [, txDateStr, , rest] = twoDateMatch;
      const txDate = parseDate(txDateStr);
      if (!txDate) continue;

      // Validate year is sane (between 2020 and 2030)
      const year = txDate.getFullYear();
      if (year < 2020 || year > 2030) continue;

      // Remove currency prefixes (including OCR garbled variants)
      const cleanRest = rest
        .replace(/(?:\\ND|WND|wND|WD|VND|USD|EUR)\s*/gi, "")
        .trim();

      // Tokenize
      const tokens = cleanRest.split(/\s+/);

      // A "valid amount token" must only have digits, dots, commas and >= 3 digits
      const isValidAmount = (t: string) =>
        /^[\d.,]+$/.test(t) && t.replace(/[.,]/g, "").length >= 3;

      // Find indices of all valid amounts in the token array
      const amountIndices: number[] = [];
      for (let i = 0; i < tokens.length; i++) {
        if (isValidAmount(tokens[i])) {
          amountIndices.push(i);
        }
      }

      if (amountIndices.length === 0) continue;

      // We only care about the last 1 or 2 valid amount tokens
      const targetIndices = amountIndices.slice(-2);
      const firstAmountIdx = targetIndices[0];

      // Description is everything before the first selected amount token
      let description = tokens.slice(0, firstAmountIdx).join(" ").trim();
      // Remove trailing OCR garbage (short non-alpha-digit tokens)
      description = description.replace(/\s+[^\w\s]{1,3}$/, "").trim();

      if (!description || description.length < 3) continue;

      // Skip summary/header lines
      const descLower = description.toLowerCase();
      if (
        descLower.includes("m\u00f4 t\u1ea3") ||
        descLower === "nd" ||
        descLower.includes("credit limit") ||
        descLower.includes("statement balance")
      )
        continue;

      // Amount columns (last two valid amounts = debit, credit)
      let debit = 0;
      let credit = 0;
      if (targetIndices.length >= 2) {
        debit = normalizeCurrency(tokens[targetIndices[0]]);
        credit = normalizeCurrency(tokens[targetIndices[1]]);
      } else {
        debit = normalizeCurrency(tokens[targetIndices[0]]);
      }

      // Use the larger of the two as the actual transaction amount
      // (avoids accidentally using a smaller "fee" column)
      const amount = Math.max(debit, credit);
      if (amount <= 0) continue;

      // Refunds/cashback = income
      const isRefund =
        descLower.includes("credit hoan") ||
        descLower.includes("ho\u00e0n ti\u1ec1n") ||
        descLower.includes("hoan tien") ||
        (descLower.startsWith("credit") && credit > debit);

      const type: "income" | "expense" = isRefund ? "income" : "expense";

      results.push({
        amount,
        type,
        date: txDate,
        description: description.substring(0, 120),
        externalId: generateExternalId(amount, txDate.toISOString(), description),
        source: "PDF-TPBank",
      });
    }

    console.log(`[pdf-parser:tpbank] Parsed ${results.length} transactions`);
    return results;
  },
};

// ─── Default Credit Card Statement Template ─────────────────────────────────

const defaultCreditCardTemplate: PdfParserTemplate = {
  name: "default-credit-card",

  matches(text: string): boolean {
    const keywords = [
      "sao kê",
      "sao ke",
      "credit card",
      "thẻ tín dụng",
      "the tin dung",
      "statement",
    ];
    const lower = text.toLowerCase();
    return keywords.some((kw) => lower.includes(kw));
  },

  parse(text: string): ParsedTransaction[] {
    const results: ParsedTransaction[] = [];
    const lines = text.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const match = trimmed.match(
          /^(\d{1,2}\/\d{1,2}(?:\/\d{4})?)\s+(.+?)\s+(-?[\d.,]+)\s*$/
        );

        if (match) {
          const [, rawDate, description, rawAmount] = match;
          const date = parseDate(rawDate);
          const amount = normalizeCurrency(rawAmount);

          if (date && amount > 0) {
            results.push({
              amount,
              type: "expense",
              date,
              description: description.trim(),
              externalId: generateExternalId(
                amount,
                date.toISOString(),
                description.trim()
              ),
            });
          }
        }
      } catch {
        // skip line
      }
    }

    return results;
  },
};

// ─── Fallback Generic Template ───────────────────────────────────────────────

const fallbackTemplate: PdfParserTemplate = {
  name: "fallback-generic",
  matches(): boolean {
    return true;
  },

  parse(text: string): ParsedTransaction[] {
    const results: ParsedTransaction[] = [];
    const lines = text.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const match = trimmed.match(
        /(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s+(.+?)\s+([\d.,]+)\s*$/
      );

      if (match) {
        const [, rawDate, description, rawAmount] = match;
        const date = parseDate(rawDate);
        const amount = normalizeCurrency(rawAmount);

        if (date && amount > 0) {
          results.push({
            amount,
            type: "expense",
            date,
            description: description.trim(),
            externalId: generateExternalId(
              amount,
              date.toISOString(),
              description.trim()
            ),
          });
        }
      }
    }

    return results;
  },
};

// ─── Template Registry ───────────────────────────────────────────────────────

const templates: PdfParserTemplate[] = [
  tpbankCreditCardTemplate,
  defaultCreditCardTemplate,
  fallbackTemplate,
];

export function registerPdfTemplate(template: PdfParserTemplate) {
  templates.splice(templates.length - 1, 0, template);
}

/**
 * Parse PDF text content into transactions.
 */
export function parsePdfText(text: string): ParsedTransaction[] {
  for (const template of templates) {
    if (template.matches(text)) {
      console.log(`[pdf-parser] Trying template: ${template.name}`);
      const results = template.parse(text);
      if (results.length > 0) {
        console.log(
          `[pdf-parser] Template "${template.name}" found ${results.length} transactions`
        );
        return results;
      }
    }
  }
  console.warn("[pdf-parser] No template returned any transactions.");
  return [];
}

// ─── NodeCanvasFactory (kept for direct use in test scripts) ─────────────────

function buildNodeCanvasFactory() {
  const canvasModule = require("canvas");
  return {
    create(width: number, height: number) {
      const canvas = canvasModule.createCanvas(width, height);
      return { canvas, context: canvas.getContext("2d") };
    },
    reset(obj: any, width: number, height: number) {
      obj.canvas.width = width;
      obj.canvas.height = height;
    },
    destroy(obj: any) {
      obj.canvas.width = 0;
      obj.canvas.height = 0;
    },
  };
}

/**
 * Extract text from a PDF buffer.
 *
 * For text-based PDFs: uses pdf-parse (fast).
 * For image-based PDFs (like TPBank): uses pdfjs-dist + canvas + tesseract.js OCR.
 * These packages are externalized in next.config.mjs so Next.js does NOT bundle them.
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  // ── Step 1: Try pdf-parse (works instantly for text-based PDFs) ──────────
  try {
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    if (data.text && data.text.trim().length > 50) {
      console.log(`[pdf-extract] pdf-parse: ${data.text.length} chars`);
      return data.text;
    }
  } catch (e: any) {
    console.warn("[pdf-extract] pdf-parse failed:", e.message);
  }

  // ── Step 2: OCR for image-based PDFs ────────────────────────────────────
  console.log("[pdf-extract] Trying OCR (image-based PDF)...");

  try {
    // Write buffer to a temp file — avoids any pipe/stdin size limits
    const os = await import("os");
    const fs = await import("fs");
    const path = await import("path");

    const tmpPath = path.join(os.tmpdir(), `ocr_${Date.now()}.pdf`);
    fs.writeFileSync(tmpPath, buffer);
    console.log(`[pdf-extract] Temp PDF: ${tmpPath} (${buffer.length} bytes)`);

    // Dynamically import OCR libraries (externalized, not bundled)
    const canvasModule = await import("canvas");
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs" as string);
    const { createWorker } = await import("tesseract.js");

    const canvasFactory = {
      create(width: number, height: number) {
        const canvas = canvasModule.createCanvas(width, height);
        return { canvas, context: canvas.getContext("2d") };
      },
      reset(obj: any, width: number, height: number) {
        obj.canvas.width = width;
        obj.canvas.height = height;
      },
      destroy(obj: any) {
        obj.canvas.width = 0;
        obj.canvas.height = 0;
      },
    };

    const loadingTask = (pdfjsLib as any).getDocument({
      data: new Uint8Array(fs.readFileSync(tmpPath)),
      canvasFactory,
    });
    const pdfDoc = await loadingTask.promise;
    const numPages: number = pdfDoc.numPages;
    console.log(`[pdf-extract] OCR: ${numPages} pages`);

    const worker = await createWorker("vie+eng");
    
    // Use PSM 6 (SINGLE_BLOCK) which performs much better on dense tables
    await worker.setParameters({
      tessedit_pageseg_mode: 6,
    });

    let fullText = "";

    for (let p = 1; p <= numPages; p++) {
      const page = await pdfDoc.getPage(p);
      const viewport = page.getViewport({ scale: 4.0 }); // 4x scale for high accuracy
      const { canvas, context } = canvasFactory.create(
        Math.ceil(viewport.width),
        Math.ceil(viewport.height)
      );
      await page.render({ canvasContext: context, viewport, canvasFactory }).promise;
      const imgBuf: Buffer = (canvas as any).toBuffer("image/png");
      const { data: { text } } = await worker.recognize(imgBuf);
      console.log(`[pdf-extract] Page ${p}/${numPages}: ${text.length} chars`);
      fullText += text + "\n";
    }

    await worker.terminate();

    // Cleanup temp file
    try { fs.unlinkSync(tmpPath); } catch {}

    console.log(`[pdf-extract] OCR done: ${fullText.length} total chars`);
    return fullText;
  } catch (err: any) {
    console.error("[pdf-extract] OCR failed:", err.message, err.stack?.split("\n")[1]);
    return "";
  }
}
