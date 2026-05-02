import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseEmailBody } from "@/lib/parsers/email-parser";
import { fetchFinanceEmails, isConnected } from "@/lib/gmail";
import { getSession } from "@/lib/auth";

/**
 * POST /api/email/sync
 *
 * Sync email transactions into the database.
 *
 * Modes:
 * 1. Auto / Force sync from Gmail (no body required)
 *    - Fetches yesterday's emails from Gmail, parses, and stores.
 *    - Query params: ?forceDate=YYYY-MM-DD to sync a specific date.
 *
 * 2. Manual sync with provided emails (body: { emails: [...] })
 *    - Parses provided email bodies and stores.
 */
export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const forceDateParam = searchParams.get("forceDate"); // optional: YYYY-MM-DD

    const session = await getSession();
    let targetUserId = session?.userId;
    if (!targetUserId) {
      const admin = await prisma.user.findFirst({ where: { role: "admin" } });
      if (admin) targetUserId = admin.id;
    }

    let emailsToProcess: { subject: string; body: string }[] = [];

    // Check if body has manually provided emails
    let bodyData: any = null;
    try {
      bodyData = await req.json();
    } catch {
      // No body — that's fine, we'll fetch from Gmail
    }

    if (bodyData?.emails && Array.isArray(bodyData.emails)) {
      // Mode 2: Manual sync with provided emails
      emailsToProcess = bodyData.emails;
      console.log(
        `[email/sync] Manual mode: ${emailsToProcess.length} emails provided`
      );
    } else {
      // Mode 1: Fetch from Gmail
      if (!isConnected()) {
        return NextResponse.json(
          { error: "Gmail not connected. Please authorize in Settings." },
          { status: 401 }
        );
      }

      // Calculate date range
      let afterDate: Date;
      let beforeDate: Date;

      const daysParam = searchParams.get("days");
      const daysToFetch = daysParam ? parseInt(daysParam) : 1; // Default 1 day (yesterday)

      if (forceDateParam) {
        // Sync a specific date
        afterDate = new Date(forceDateParam);
        beforeDate = new Date(afterDate.getTime() + 24 * 60 * 60 * 1000);
        console.log(
          `[email/sync] Force sync for date: ${forceDateParam}`
        );
      } else {
        // Fetch last X days
        const now = new Date();
        const todayMidnight = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        afterDate = new Date(todayMidnight.getTime() - daysToFetch * 24 * 60 * 60 * 1000);
        beforeDate = new Date(todayMidnight.getTime() + 24 * 60 * 60 * 1000); // include today up to now
        console.log(
          `[email/sync] Auto sync: last ${daysToFetch} days (from ${afterDate.toISOString().split("T")[0]})`
        );
      }

      const fetched = await fetchFinanceEmails({
        afterDate,
        beforeDate,
        maxResults: 500, // Increased to support 30-day syncs properly
      });

      console.log(`[email/sync] Fetched ${fetched.length} emails from Gmail`);

      emailsToProcess = fetched.map((e) => ({
        subject: e.subject,
        body: e.body,
      }));
    }

    // Parse and insert
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    let totalParsed = 0;

    for (const email of emailsToProcess) {
      try {
        const parsed = parseEmailBody(email.body || "");
        totalParsed += parsed.length;

        for (const tx of parsed) {
          // Check deduplication via externalId
          const existing = await prisma.transaction.findUnique({
            where: { externalId: tx.externalId },
          });

          if (existing) {
            skipped++;
            continue;
          }

          await prisma.transaction.create({
            data: {
              amount: tx.amount,
              type: tx.type,
              note: tx.description,
              date: tx.date,
              source: tx.source || "Email",
              externalId: tx.externalId,
              userId: targetUserId,
            },
          });
          imported++;
        }
      } catch (err) {
        console.error("[email/sync] Failed to process email:", err);
        errors++;
      }
    }

    const result = {
      emailsFetched: emailsToProcess.length,
      transactionsParsed: totalParsed,
      imported,
      skipped,
      errors,
    };

    console.log("[email/sync] Result:", result);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[email/sync] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to sync emails" },
      { status: 500 }
    );
  }
}
