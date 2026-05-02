import cron from "node-cron";

const logger = {
  info: (msg: string) =>
    console.log(`[${new Date().toISOString()}] INFO: ${msg}`),
  error: (msg: string, err?: unknown) =>
    console.error(`[${new Date().toISOString()}] ERROR: ${msg}`, err || ""),
  warn: (msg: string) =>
    console.warn(`[${new Date().toISOString()}] WARN: ${msg}`),
};

const API_BASE = process.env.API_BASE_URL || "http://localhost:3000";

/**
 * Trigger email sync via the API.
 * The API handles: fetch Gmail → parse → save to DB (with deduplication).
 */
async function syncEmails(forceDate?: string) {
  const url = forceDate
    ? `${API_BASE}/api/email/sync?forceDate=${forceDate}`
    : `${API_BASE}/api/email/sync`;

  logger.info(`Calling sync API: ${url}`);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  const result = await res.json();

  if (!res.ok) {
    throw new Error(result.error || `HTTP ${res.status}`);
  }

  return result;
}

logger.info("╔════════════════════════════════════════════════╗");
logger.info("║  Finance App — Email Sync Worker              ║");
logger.info("║  Schedule: Daily at 00:05 (midnight + 5 min)  ║");
logger.info("╚════════════════════════════════════════════════╝");

// ─── Daily sync at 00:05 ────────────────────────────────────────────────
// Runs at 00:05 every day → fetches yesterday's emails
cron.schedule("5 0 * * *", async () => {
  logger.info("═══ Daily email sync started ═══");

  try {
    const result = await syncEmails();
    logger.info(
      `✅ Sync complete — Fetched: ${result.emailsFetched}, Parsed: ${result.transactionsParsed}, Imported: ${result.imported}, Skipped: ${result.skipped}, Errors: ${result.errors}`
    );
  } catch (error) {
    logger.error("❌ Daily sync failed", error);
  }

  logger.info("═══ Daily email sync finished ═══");
});

logger.info("Worker is running. Waiting for next scheduled run...");
logger.info("Next sync: tomorrow at 00:05");
logger.info("");

// Handle graceful shutdown
process.on("SIGINT", () => {
  logger.info("Shutting down email sync worker...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger.info("Shutting down email sync worker...");
  process.exit(0);
});
