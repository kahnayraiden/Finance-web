import {
  normalizeCurrency,
  parseDate,
  detectTransactionType,
  generateExternalId,
  stripHtml,
  parseVietnameseDateTime,
  ParsedTransaction,
} from "./parser-utils";

/**
 * Base interface for bank-specific email parser templates.
 * Extend this to support multiple banks in the future.
 */
export interface EmailParserTemplate {
  name: string;
  /** Regex patterns to match relevant email subjects/bodies */
  subjectFilters: string[];
  /** Parse a single email body into transactions */
  parse(body: string): ParsedTransaction[];
}

// ─── Vietcombank Template ───────────────────────────────────────────────

const vietcombankTemplate: EmailParserTemplate = {
  name: "vietcombank",
  subjectFilters: [
    "biên lai chuyển tiền",
    "bien lai chuyen tien",
    "biến động số dư",
    "bien dong so du",
    "vietcombank",
    "vcb",
    "payment receipt",
  ],

  parse(body: string): ParsedTransaction[] {
    const results: ParsedTransaction[] = [];

    // Strip HTML to get clean text
    const text = body.includes("<") ? stripHtml(body) : body;

    // --- Structured receipt parsing (table-based emails) ---
    // Extract fields using label-value patterns from the stripped text

    // Date: Look for "Ngày, giờ giao dịch" or "Trans. Date"
    let txDate: Date | null = null;
    const dateMatch = text.match(
      /(?:Ngày,\s*giờ\s*giao\s*dịch[\s\S]*?Trans\.\s*Date,\s*Time|Ngày,\s*giờ\s*giao\s*dịch|Trans\.\s*Date,\s*Time)[\s|]*([^\n|]+)/i
    );
    if (dateMatch) {
      txDate = parseVietnameseDateTime(dateMatch[1].trim());
    }
    // Fallback: any Vietnamese datetime pattern in the text
    if (!txDate) {
      const fallbackDate = text.match(
        /(\d{1,2}:\d{2})\s*(?:Thứ\s*\w+\s*)?(\d{1,2}\/\d{1,2}\/\d{4})/
      );
      if (fallbackDate) {
        txDate = parseVietnameseDateTime(fallbackDate[0]);
      }
    }

    let amount = 0;
    const amountMatch = text.match(
      /(?:Số\s*tiền[\s\S]*?Amount|Số\s*tiền|Amount)[\s|]*([\d.,]+)/i
    );
    if (amountMatch) {
      amount = normalizeCurrency(amountMatch[1]);
    }

    let description = "";
    const descMatch = text.match(
      /(?:Nội\s*dung\s*chuyển\s*tiền[\s\S]*?Details\s*of\s*Payment|Nội\s*dung\s*chuyển\s*tiền|Details\s*of\s*Payment)[\s|]*([^\n|]+)/i
    );
    if (descMatch) {
      description = descMatch[1].trim();
    }

    // Beneficiary name
    let beneficiary = "";
    const beneficiaryMatch = text.match(
      /(?:Tên\s*người\s*hưởng[\s\S]*?Beneficiary\s*Name|Tên\s*người\s*hưởng|Beneficiary\s*Name)[\s|]*([^\n|]+)/i
    );
    if (beneficiaryMatch) {
      beneficiary = beneficiaryMatch[1].trim();
    }

    // Beneficiary bank
    let beneficiaryBank = "";
    const bankMatch = text.match(
      /(?:Tên\s*ngân\s*hàng\s*hưởng[\s\S]*?Beneficiary\s*Bank\s*Name|Tên\s*ngân\s*hàng\s*hưởng|Beneficiary\s*Bank\s*Name)[\s|]*([^\n|]+)/i
    );
    if (bankMatch) {
      beneficiaryBank = bankMatch[1].trim();
    }

    let orderNumber = "";
    const orderMatch = text.match(
      /(?:Số\s*lệnh\s*giao\s*dịch[\s\S]*?Order\s*Number|Số\s*lệnh\s*giao\s*dịch|Order\s*Number)[\s|]*(\d+)/i
    );
    if (orderMatch) {
      orderNumber = orderMatch[1].trim();
    }

    // Detect type: "Debit Account" = expense (money leaving), "Credit Account" / incoming = income
    let type: "income" | "expense" = "expense";
    const hasDebitAccount = /(?:Tài\s*khoản\s*nguồn|Debit\s*Account)/i.test(text);
    const titleLower = text.toLowerCase();
    if (
      titleLower.includes("biên lai chuyển tiền") ||
      titleLower.includes("payment receipt") ||
      hasDebitAccount
    ) {
      type = "expense";
    }
    // Check if it's an incoming transfer
    if (
      titleLower.includes("nhận tiền") ||
      titleLower.includes("receive") ||
      titleLower.includes("credited")
    ) {
      type = "income";
    }

    // Build description
    const fullDescription = [
      description,
      beneficiary ? `→ ${beneficiary}` : "",
      beneficiaryBank ? `(${beneficiaryBank})` : "",
    ]
      .filter(Boolean)
      .join(" ");

    if (amount > 0 && txDate) {
      // Use order number for deduplication if available, otherwise hash
      const externalId = orderNumber
        ? generateExternalId(amount, orderNumber, "vcb")
        : generateExternalId(
            amount,
            txDate.toISOString(),
            fullDescription
          );

      results.push({
        amount,
        type,
        date: txDate,
        description: fullDescription || "Vietcombank transaction",
        externalId,
        source: "VCB",
      });
    }

    return results;
  },
};

// ─── Default Vietnamese Bank Email Template ─────────────────────────────

const defaultVietnamTemplate: EmailParserTemplate = {
  name: "default-vietnam",
  subjectFilters: [
    "biến động số dư",
    "bien dong so du",
    "transaction",
    "spending alert",
    "giao dịch",
    "giao dich",
  ],

  parse(body: string): ParsedTransaction[] {
    const results: ParsedTransaction[] = [];

    // Strip HTML if needed
    const text = body.includes("<") ? stripHtml(body) : body;

    // Pattern 1: "TK 123456 +1,000,000 VND luc 12:30 01/01/2026"
    const pattern1 =
      /TK\s*\d+\s*([+-]?[\d.,]+)\s*VND\s*luc\s*([\d:]+\s*[\d/]+)/gi;
    let match: RegExpExecArray | null;

    while ((match = pattern1.exec(text)) !== null) {
      const rawAmount = match[1];
      const rawDate = match[2];
      const amount = normalizeCurrency(rawAmount);
      const date = parseDate(rawDate);

      if (amount > 0 && date) {
        const type = rawAmount.startsWith("+") ? "income" : "expense";
        const description = match[0].trim();
        results.push({
          amount,
          type,
          date,
          description,
          externalId: generateExternalId(
            amount,
            date.toISOString(),
            description
          ),
        });
      }
    }

    // Pattern 2: "Chi tieu 50,000 VND tai Grab"
    const pattern2 =
      /(?:chi\s*ti[eê]u|thanh\s*to[aá]n|mua)\s*([\d.,]+)\s*(?:VND|đ)?\s*(?:tai|tại|at)?\s*(.+)/gi;

    while ((match = pattern2.exec(text)) !== null) {
      const rawAmount = match[1];
      const rawDesc = match[2]?.trim() || "Unknown";
      const amount = normalizeCurrency(rawAmount);

      if (amount > 0) {
        const date = new Date(); // fallback to now
        results.push({
          amount,
          type: "expense",
          date,
          description: rawDesc,
          externalId: generateExternalId(
            amount,
            date.toISOString().split("T")[0],
            rawDesc
          ),
        });
      }
    }

    // Pattern 3: Generic "Số tiền" / "Amount" detection
    const pattern3 =
      /(?:số tiền|so tien|amount)[:\s]*([\d.,]+)\s*(?:VND|đ)?/gi;

    while ((match = pattern3.exec(text)) !== null) {
      const rawAmount = match[1];
      const amount = normalizeCurrency(rawAmount);

      if (amount > 0) {
        const type = detectTransactionType(text);
        const date = new Date();
        const description = text.substring(
          Math.max(0, match.index - 20),
          Math.min(text.length, match.index + match[0].length + 40)
        ).trim();

        results.push({
          amount,
          type,
          date,
          description,
          externalId: generateExternalId(
            amount,
            date.toISOString().split("T")[0],
            description
          ),
        });
      }
    }

    return results;
  },
};

// ─── Timo Bank Template ────────────────────────────────────────────────

const timoTemplate: EmailParserTemplate = {
  name: "timo",
  subjectFilters: [
    "thay đổi số dư",
    "thay doi so du",
    "timo",
  ],

  parse(body: string): ParsedTransaction[] {
    const results: ParsedTransaction[] = [];

    // Strip HTML to get clean text
    const text = body.includes("<") ? stripHtml(body) : body;

    // Pattern: "Tài khoản ... vừa giảm/tăng [Amount] VND vào [Date] [Time]"
    const changeMatch = text.match(/vừa\s+(giảm|tăng|giam|tang)\s+([\d.,]+)\s*(?:VND|đ)?\s*(?:vào|vao)?\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*(\d{1,2}:\d{2})/i);
    
    if (changeMatch) {
      const typeStr = changeMatch[1].toLowerCase();
      const type = (typeStr.includes("giảm") || typeStr.includes("giam")) ? "expense" : "income";
      const amount = normalizeCurrency(changeMatch[2]);
      
      // Parse Date: "11/04/2026 22:25"
      const dateParts = changeMatch[3].split("/");
      const timeParts = changeMatch[4].split(":");
      const txDate = new Date(
        parseInt(dateParts[2]),
        parseInt(dateParts[1]) - 1,
        parseInt(dateParts[0]),
        parseInt(timeParts[0]),
        parseInt(timeParts[1])
      );

      // Description: "Mô tả: 0368096524;NAP;124915537103"
      let description = "Timo transaction";
      const descMatch = text.match(/(?:Mô tả|Mo ta):\s*([^\.]+)/i);
      if (descMatch) {
        description = descMatch[1].trim();
      }

      if (amount > 0 && !isNaN(txDate.getTime())) {
        const externalId = generateExternalId(
          amount,
          txDate.toISOString(),
          description
        );

        results.push({
          amount,
          type,
          date: txDate,
          description,
          externalId,
          source: "Timo",
        });
      }
    }

    return results;
  },
};

// ─── Template Registry ──────────────────────────────────────────────────
// Vietcombank first (most specific), then Timo, then default as fallback
const templates: EmailParserTemplate[] = [
  vietcombankTemplate,
  timoTemplate,
  defaultVietnamTemplate,
];

/**
 * Register a new parser template (for future multi-bank support).
 */
export function registerEmailTemplate(template: EmailParserTemplate) {
  // Insert before the default template
  templates.splice(templates.length - 1, 0, template);
}

/**
 * Get all subject filters across all templates.
 */
export function getAllSubjectFilters(): string[] {
  return templates.flatMap((t) => t.subjectFilters);
}

/**
 * Parse an email body using all available templates.
 * Tries each template in order, returns the first non-empty result.
 */
export function parseEmailBody(body: string): ParsedTransaction[] {
  for (const template of templates) {
    const results = template.parse(body);
    if (results.length > 0) {
      console.log(`[email-parser] Matched template: ${template.name}, found ${results.length} transaction(s)`);
      return results;
    }
  }
  console.log("[email-parser] No template matched.");
  return [];
}

/**
 * Check if an email subject matches any known filter.
 */
export function isRelevantEmail(subject: string): boolean {
  const lower = subject.toLowerCase();
  return getAllSubjectFilters().some((filter) => lower.includes(filter));
}
