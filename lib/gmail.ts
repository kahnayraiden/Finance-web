import { google } from "googleapis";
import fs from "fs";
import path from "path";

const TOKEN_PATH = path.join(process.cwd(), "data", "gmail-tokens.json");

/**
 * Create an OAuth2 client from environment variables.
 */
export function createOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_REDIRECT_URI in .env"
    );
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Generate the Google OAuth2 authorization URL.
 */
export function getAuthUrl(): string {
  const oauth2Client = createOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.modify",
    ],
  });
}

/**
 * Exchange an authorization code for tokens and save them.
 */
export async function exchangeCode(code: string) {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  saveTokens(tokens);
  return tokens;
}

/**
 * Save tokens to a local JSON file.
 */
export function saveTokens(tokens: any) {
  const dir = path.dirname(TOKEN_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  // Merge with existing tokens (preserve refresh_token if not in new tokens)
  const existing = loadTokens();
  const merged = { ...existing, ...tokens };
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(merged, null, 2));
}

/**
 * Load tokens from the local JSON file.
 */
export function loadTokens(): any | null {
  try {
    if (fs.existsSync(TOKEN_PATH)) {
      const data = fs.readFileSync(TOKEN_PATH, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("[gmail] Failed to load tokens:", err);
  }
  return null;
}

/**
 * Delete stored tokens.
 */
export function clearTokens() {
  try {
    if (fs.existsSync(TOKEN_PATH)) {
      fs.unlinkSync(TOKEN_PATH);
    }
  } catch (err) {
    console.error("[gmail] Failed to clear tokens:", err);
  }
}

/**
 * Check if Gmail is connected (tokens exist and have refresh_token).
 */
export function isConnected(): boolean {
  const tokens = loadTokens();
  return tokens !== null && !!tokens.refresh_token;
}

/**
 * Get an authenticated Gmail API client.
 */
export function getGmailClient() {
  const tokens = loadTokens();
  if (!tokens) {
    throw new Error("Gmail not connected. Please authorize first.");
  }

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials(tokens);

  // Auto-refresh tokens
  oauth2Client.on("tokens", (newTokens) => {
    saveTokens(newTokens);
  });

  return google.gmail({ version: "v1", auth: oauth2Client });
}

/**
 * Fetch emails from Gmail matching finance-related filters.
 *
 * @param options.afterDate  - Only fetch emails after this date (inclusive). Defaults to yesterday 00:00.
 * @param options.beforeDate - Only fetch emails before this date (exclusive). Defaults to today 00:00.
 * @param options.maxResults - Max number of emails to fetch. Defaults to 50.
 */
export async function fetchFinanceEmails(options?: {
  afterDate?: Date;
  beforeDate?: Date;
  maxResults?: number;
}) {
  const gmail = getGmailClient();

  // Default: yesterday 00:00 → today 00:00
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayMidnight = new Date(todayMidnight.getTime() - 24 * 60 * 60 * 1000);

  const afterDate = options?.afterDate ?? yesterdayMidnight;
  const beforeDate = options?.beforeDate ?? todayMidnight;
  const maxResults = options?.maxResults ?? 100; // Increased default to 100

  // Optimize search query
  const subjectFilters = [
    "biến động số dư",
    "bien dong so du",
    "biên lai chuyển tiền",
    "transaction alert",
    "spending alert",
    "giao dịch",
    "chi tiêu",
    "vietcombank",
    "payment receipt",
    "timo",
    "thay đổi số dư",
  ];
  const queryTerms = subjectFilters.map((t) => `"${t}"`).join(" OR ");
  
  // Format dates as YYYY/MM/DD for Gmail search
  const formatGmailDate = (d: Date) => d.toISOString().split("T")[0].replace(/-/g, "/");
  const query = `(${queryTerms}) after:${formatGmailDate(afterDate)} before:${formatGmailDate(beforeDate)}`;

  console.log(`[gmail] Fetching emails with query: ${query}`);

  let messages: any[] = [];
  let pageToken: string | undefined | null = undefined;

  do {
    const res: any = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults: Math.min(maxResults - messages.length, 500),
      pageToken: pageToken as string | undefined,
    });

    if (res.data.messages) {
      messages = messages.concat(res.data.messages);
    }
    pageToken = res.data.nextPageToken;
  } while (pageToken && messages.length < maxResults);

    console.log(`[gmail] Found ${messages.length} matching messages`);

  const results: { id: string; subject: string; body: string; date: string }[] = [];

  for (const msg of messages) {
    try {
      const detail = await gmail.users.messages.get({
        userId: "me",
        id: msg.id!,
        format: "full",
      });

      const headers = detail.data.payload?.headers || [];
      const subject =
        headers.find((h) => h.name?.toLowerCase() === "subject")?.value || "";
      const dateHeader =
        headers.find((h) => h.name?.toLowerCase() === "date")?.value || "";

      // Extract body text — keep HTML intact, the parser handles stripping
      let body = "";
      const payload = detail.data.payload;

      const extractBodyData = (part: any): string => {
        if (!part) return "";
        if (part.mimeType === "text/html" && part.body?.data) {
          return part.body.data;
        }
        if (part.parts) {
          let textData = "";
          for (const p of part.parts) {
            if (p.mimeType === "text/html" && p.body?.data) {
              return p.body.data; // Prioritize HTML
            }
            if (p.mimeType === "text/plain" && p.body?.data) {
              textData = p.body.data;
            }
            if (p.parts) {
              const nested = extractBodyData(p);
              if (nested) return nested;
            }
          }
          if (textData) return textData;
        }
        return "";
      };

      const decodeB64 = (str: string) => Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), "base64").toString("utf-8");

      if (payload?.body?.data && payload.mimeType === "text/html") {
        body = decodeB64(payload.body.data);
      } else if (payload?.body?.data && payload.mimeType === "text/plain") {
         body = decodeB64(payload.body.data);
      } else {
        const extracted = extractBodyData(payload);
        if (extracted) {
           body = decodeB64(extracted);
        } else if (payload?.body?.data) {
           body = decodeB64(payload.body.data);
        }
      }

      results.push({
        id: msg.id!,
        subject,
        body,
        date: dateHeader,
      });
    } catch (err) {
      console.error(`[gmail] Failed to fetch message ${msg.id}:`, err);
    }
  }

  return results;
}

