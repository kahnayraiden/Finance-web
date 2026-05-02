import { NextResponse } from "next/server";
import { fetchFinanceEmails, isConnected } from "@/lib/gmail";

/**
 * GET /api/email/fetch
 *
 * Fetch finance emails from Gmail.
 * Query params:
 *   - limit: max emails (default 10)
 *   - after: date string YYYY-MM-DD (default yesterday)
 *   - before: date string YYYY-MM-DD (default today)
 */
export async function GET(req: Request) {
  try {
    if (!isConnected()) {
      return NextResponse.json(
        { error: "Gmail not connected. Please authorize first." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const afterParam = searchParams.get("after");
    const beforeParam = searchParams.get("before");

    const options: {
      afterDate?: Date;
      beforeDate?: Date;
      maxResults: number;
    } = { maxResults: limit };

    if (afterParam) {
      options.afterDate = new Date(afterParam);
    }
    if (beforeParam) {
      options.beforeDate = new Date(beforeParam);
    }

    const emails = await fetchFinanceEmails(options);

    return NextResponse.json({
      count: emails.length,
      emails,
    });
  } catch (error: any) {
    console.error("[email/fetch] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch emails" },
      { status: 500 }
    );
  }
}
