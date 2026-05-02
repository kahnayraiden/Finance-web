"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FlaskConical,
  Play,
  Loader2,
  Mail,
  ArrowUpCircle,
  ArrowDownCircle,
  Download,
  Trash2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface ParsedTransaction {
  amount: number;
  type: string;
  date: string;
  description: string;
  externalId: string;
}

interface ParseResult {
  input: string;
  count: number;
  transactions: ParsedTransaction[];
}

interface FetchedEmail {
  id: string;
  subject: string;
  body: string;
  date: string;
}

const SAMPLE_TEXTS = [
  {
    label: "🏦 Timo Bank (HTML)",
    text: `NGUYEN TIEN DAT thân mến,
Tài khoản Spend Account vừa giảm 166.667 VND vào 11/04/2026 22:25.
Số dư hiện tại: 74.896 VND.
Mô tả: 0368096524;NAP;124915537103.

Cảm ơn Quý khách đã sử dụng dịch vụ Timo Digital Bank by BVBank!`,
  },
  {
    label: "🏦 Vietcombank Receipt (HTML)",
    text: `Ngày, giờ giao dịch | Trans. Date, Time | 18:44 Thứ Ba 14/04/2026
Số lệnh giao dịch | Order Number | 13792464938
Tài khoản nguồn | Debit Account | 1030790105
Tên người chuyển tiền | Remitter's name | NGUYEN TIEN DAT
Tài khoản người hưởng | Credit Account | 0368096524
Tên người hưởng | Beneficiary Name | NGUYEN VAN A
Tên ngân hàng hưởng | Beneficiary Bank Name | Ngân hàng Shinhan Bank Việt Nam
Số tiền | Amount | 2,400,000 VND
Nội dung chuyển tiền | Details of Payment | Thanh toan tien nha thang 4`,
  },
  {
    label: "Banking alert (credit)",
    text: "TK 123456789 +1,000,000 VND luc 12:30 01/04/2026. Noi dung: Chuyen tien luong thang 4",
  },
  {
    label: "Spending alert",
    text: "Chi tieu 50,000 VND tai Grab luc 14:00 ngay 10/04/2026",
  },
  {
    label: "Balance change (debit)",
    text: "TK 987654321 -250,000 VND luc 09:15 15/04/2026. Thanh toan hoa don dien",
  },
  {
    label: "Multiple transactions",
    text: `TK 123456 +25,000,000 VND luc 08:00 01/04/2026. Luong thang 4
Chi tieu 1,200,000 VND tai BigC Supermarket
TK 123456 -500,000 VND luc 19:30 05/04/2026. Thanh toan Grab`,
  },
];

export default function EmailTestPage() {
  const [inputText, setInputText] = useState("");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isBase64, setIsBase64] = useState(false);

  // Gmail fetch state
  const [fetching, setFetching] = useState(false);
  const [fetchedEmails, setFetchedEmails] = useState<FetchedEmail[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);

  const handleParse = async () => {
    if (!inputText.trim()) return;
    setParsing(true);
    setParseError(null);
    setParseResult(null);

    let textToParse = inputText;
    if (isBase64) {
      try {
        textToParse = atob(inputText.trim());
      } catch (err) {
        setParseError("Invalid Base64 string");
        setParsing(false);
        return;
      }
    }

    try {
      const res = await fetch("/api/email/test-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToParse }),
      });
      const data = await res.json();
      if (res.ok) {
        setParseResult(data);
      } else {
        setParseError(data.error || "Parse failed");
      }
    } catch (err: any) {
      setParseError(err.message || "Network error");
    } finally {
      setParsing(false);
    }
  };

  const handleFetchEmails = async () => {
    setFetching(true);
    setFetchError(null);
    setFetchedEmails([]);

    try {
      const res = await fetch("/api/email/fetch?limit=10");
      const data = await res.json();
      if (res.ok) {
        setFetchedEmails(data.emails || []);
      } else {
        setFetchError(data.error || "Fetch failed");
      }
    } catch (err: any) {
      setFetchError(err.message || "Network error");
    } finally {
      setFetching(false);
    }
  };

  const handleSyncAll = async () => {
    if (fetchedEmails.length === 0) return;
    setSyncing(true);
    setSyncResult(null);

    try {
      const res = await fetch("/api/email/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails: fetchedEmails.map((e) => ({
            subject: e.subject,
            body: e.body,
          })),
        }),
      });
      const data = await res.json();
      setSyncResult(data);
    } catch (err: any) {
      setSyncResult({ error: err.message });
    } finally {
      setSyncing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <FlaskConical className="h-8 w-8 text-violet-600" />
          Email Parser Test
        </h1>
        <p className="text-slate-500 mt-1">
          Test email parsing with sample text or fetch real emails from Gmail
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input */}
        <div className="space-y-6">
          {/* Manual Parse */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Test Parser</CardTitle>
              <CardDescription>
                Paste an email body or banking notification text to test parsing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <textarea
                className="w-full h-40 rounded-lg border border-slate-200 bg-white p-3 text-sm font-mono placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 resize-none"
                placeholder="Paste email body text here..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />

              <div className="flex items-center gap-2 mb-2">
                <input 
                  type="checkbox" 
                  id="isBase64" 
                  checked={isBase64} 
                  onChange={(e) => setIsBase64(e.target.checked)} 
                  className="rounded border-slate-300 text-violet-600 focus:ring-violet-600"
                />
                <label htmlFor="isBase64" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Decode Base64 string before parsing
                </label>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleParse}
                  disabled={!inputText.trim() || parsing}
                  className="gap-2"
                >
                  {parsing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Parse Text
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setInputText("");
                    setParseResult(null);
                    setParseError(null);
                  }}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Sample Texts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sample Templates</CardTitle>
              <CardDescription>
                Click a sample to load it into the parser
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {SAMPLE_TEXTS.map((sample, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInputText(sample.text);
                    setParseResult(null);
                    setParseError(null);
                  }}
                  className="w-full text-left p-3 rounded-lg border border-slate-100 hover:border-violet-200 hover:bg-violet-50 transition-all group"
                >
                  <p className="text-sm font-medium text-slate-700 group-hover:text-violet-700">
                    {sample.label}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 font-mono truncate">
                    {sample.text}
                  </p>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right: Results */}
        <div className="space-y-6">
          {/* Parse Result */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Parse Result</CardTitle>
              <CardDescription>
                Extracted transactions from the input text
              </CardDescription>
            </CardHeader>
            <CardContent>
              {parseError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  {parseError}
                </div>
              )}

              {!parseResult && !parseError && (
                <div className="text-center py-12 text-slate-400">
                  <FlaskConical className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">
                    Paste text and click Parse to see results
                  </p>
                </div>
              )}

              {parseResult && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        parseResult.count > 0 ? "success" : "secondary"
                      }
                    >
                      {parseResult.count} transaction
                      {parseResult.count !== 1 ? "s" : ""} found
                    </Badge>
                  </div>

                  {parseResult.transactions.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">
                      <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      No transactions could be extracted.
                      <br />
                      Try a different format or check the regex patterns.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {parseResult.transactions.map((tx, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-lg border border-slate-100 bg-slate-50 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {tx.type === "income" ? (
                                <ArrowUpCircle className="h-5 w-5 text-emerald-500" />
                              ) : (
                                <ArrowDownCircle className="h-5 w-5 text-red-500" />
                              )}
                              <span className="capitalize text-sm font-medium">
                                {tx.type}
                              </span>
                            </div>
                            <span
                              className={`text-lg font-bold ${
                                tx.type === "income"
                                  ? "text-emerald-600"
                                  : "text-red-600"
                              }`}
                            >
                              {tx.type === "income" ? "+" : "-"}
                              {formatCurrency(tx.amount)}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 space-y-1">
                            <p>
                              <span className="font-medium text-slate-600">
                                Date:
                              </span>{" "}
                              {new Date(tx.date).toLocaleDateString("vi-VN")}
                            </p>
                            <p>
                              <span className="font-medium text-slate-600">
                                Desc:
                              </span>{" "}
                              {tx.description}
                            </p>
                            <p className="font-mono text-xs text-slate-400 truncate">
                              ID: {tx.externalId}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Live Gmail Fetch */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    Live Gmail Fetch
                  </CardTitle>
                  <CardDescription>
                    Fetch real emails from your connected Gmail
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {fetchedEmails.length > 0 && (
                    <Button
                      size="sm"
                      onClick={handleSyncAll}
                      disabled={syncing}
                      className="gap-1"
                    >
                      {syncing ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Download className="h-3 w-3" />
                      )}
                      Sync to DB
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleFetchEmails}
                    disabled={fetching}
                    className="gap-1"
                  >
                    {fetching ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Mail className="h-3 w-3" />
                    )}
                    Fetch Emails
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {fetchError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4">
                  {fetchError}
                </div>
              )}

              {syncResult && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm mb-4 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Imported: {syncResult.imported} | Skipped:{" "}
                  {syncResult.skipped} | Errors: {syncResult.errors || 0}
                </div>
              )}

              {fetchedEmails.length === 0 && !fetchError ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  <Mail className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  Click &quot;Fetch Emails&quot; to pull from Gmail
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {fetchedEmails.map((email) => (
                    <button
                      key={email.id}
                      onClick={() => {
                        setInputText(email.body);
                        setParseResult(null);
                        setParseError(null);
                      }}
                      className="w-full text-left p-3 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-all"
                    >
                      <p className="text-sm font-medium text-slate-700 truncate">
                        {email.subject || "(no subject)"}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {email.date}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {email.body.substring(0, 120)}...
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
