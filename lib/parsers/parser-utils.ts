import crypto from "crypto";

/**
 * Strip HTML tags and decode entities, returning clean plain text.
 */
export function stripHtml(html: string): string {
  return html
    // Remove style and script blocks entirely
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    // Replace <br>, <br/>, <p>, <tr>, <td> with newlines/spaces
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(p|tr|div|li|h[1-6])[^>]*>/gi, "\n")
    .replace(/<\/?(td|th)[^>]*>/gi, " | ")
    // Remove all remaining HTML tags
    .replace(/<[^>]*>/g, "")
    // Decode common HTML entities
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    // Collapse whitespace
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n/g, "\n")
    .trim();
}

/**
 * Parse Vietnamese-style datetimes like:
 * - "18:44 Thứ Ba 14/04/2026"
 * - "08:30 14/04/2026"
 * - "14/04/2026"
 */
export function parseVietnameseDateTime(raw: string): Date | null {
  const trimmed = raw.trim();

  // Pattern: "HH:MM ... DD/MM/YYYY" (time + optional day name + date)
  const fullMatch = trimmed.match(/(\d{1,2}):(\d{2}).*?(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (fullMatch) {
    const [, hour, minute, day, month, year] = fullMatch;
    const d = new Date(Date.UTC(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute)
    ));
    return isNaN(d.getTime()) ? null : d;
  }

  // Fallback: DD/MM/YYYY only
  const dateOnly = trimmed.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dateOnly) {
    const [, day, month, year] = dateOnly;
    const d = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

/**
 * Normalize currency strings like "1,000,000 VND" or "50.000" to a number.
 */
export function normalizeCurrency(raw: string): number {
  // Remove currency symbols, "VND", "đ", spaces
  let cleaned = raw
    .replace(/VND|đ|₫/gi, "")
    .replace(/\s/g, "")
    .trim();

  // Handle Vietnamese-style formatting: 1.000.000 or 1,000,000
  // If string contains dots as thousands separators (e.g., "1.000.000")
  if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, "");
  }
  // If string uses commas as thousands separators (e.g., "1,000,000")
  else if (/^\d{1,3}(,\d{3})+$/.test(cleaned)) {
    cleaned = cleaned.replace(/,/g, "");
  }
  // Remove any remaining commas or dots that are separators
  else {
    cleaned = cleaned.replace(/,/g, "");
  }

  const value = parseFloat(cleaned);
  return isNaN(value) ? 0 : Math.abs(value);
}

/**
 * Parse various date formats commonly used in Vietnamese banking:
 * - "01/01/2026"
 * - "01/02"  (day/month, assume current year)
 * - "12:30 01/01/2026" (time + date)
 * - "2026-01-01" (ISO)
 */
export function parseDate(raw: string): Date | null {
  const trimmed = raw.trim();

  // ISO format: 2026-01-01
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d;
  }

  // DD/MM/YYYY
  const fullMatch = trimmed.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (fullMatch) {
    const [, day, month, year] = fullMatch;
    const d = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
    return isNaN(d.getTime()) ? null : d;
  }

  // DD/MM (assume current year)
  const shortMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (shortMatch) {
    const [, day, month] = shortMatch;
    const currentYear = new Date().getFullYear();
    const d = new Date(Date.UTC(currentYear, parseInt(month) - 1, parseInt(day)));
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

/**
 * Detect whether a transaction is income or expense based on text content.
 */
export function detectTransactionType(text: string): "income" | "expense" {
  const incomeKeywords = [
    "+",
    "nhận",
    "nhan",
    "cộng",
    "cong",
    "salary",
    "lương",
    "luong",
    "chuyển đến",
    "chuyen den",
    "credited",
    "cr",
  ];
  const expenseKeywords = [
    "-",
    "chi",
    "trừ",
    "tru",
    "thanh toán",
    "thanh toan",
    "mua",
    "debit",
    "dr",
    "chi tiêu",
    "chi tieu",
  ];

  const lower = text.toLowerCase();

  for (const kw of incomeKeywords) {
    if (lower.includes(kw)) return "income";
  }
  for (const kw of expenseKeywords) {
    if (lower.includes(kw)) return "expense";
  }

  // Default to expense
  return "expense";
}

/**
 * Generate a unique external ID (hash) for deduplication.
 */
export function generateExternalId(
  amount: number,
  date: string,
  description: string
): string {
  const raw = `${amount}|${date}|${description}`.toLowerCase().trim();
  return crypto.createHash("sha256").update(raw).digest("hex").substring(0, 32);
}

/**
 * Parsed transaction result from any parser.
 */
export interface ParsedTransaction {
  amount: number;
  type: "income" | "expense";
  date: Date;
  description: string;
  externalId: string;
  source?: string;
}
