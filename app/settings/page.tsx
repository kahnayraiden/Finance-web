"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Settings2,
  Mail,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Unplug,
  Loader2,
} from "lucide-react";

function SettingsContent() {
  const searchParams = useSearchParams();
  const [gmailConnected, setGmailConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  const [envVars, setEnvVars] = useState({
    GOOGLE_CLIENT_ID: "",
    GOOGLE_CLIENT_SECRET: "",
    GOOGLE_REDIRECT_URI: "",
  });
  const [savingEnv, setSavingEnv] = useState(false);

  const successMsg = searchParams.get("success");
  const errorMsg = searchParams.get("error");

  const checkStatus = async () => {
    try {
      const res = await fetch("/api/email/status");
      const data = await res.json();
      setGmailConnected(data.connected);

      const envRes = await fetch("/api/settings/env");
      if (envRes.ok) {
        const envData = await envRes.json();
        setEnvVars({
          GOOGLE_CLIENT_ID: envData.GOOGLE_CLIENT_ID || "",
          GOOGLE_CLIENT_SECRET: envData.GOOGLE_CLIENT_SECRET || "",
          GOOGLE_REDIRECT_URI: envData.GOOGLE_REDIRECT_URI || "",
        });
      }
    } catch {
      setGmailConnected(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await fetch("/api/email/status", { method: "DELETE" });
      setGmailConnected(false);
    } catch (err) {
      console.error("Failed to disconnect:", err);
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSaveEnv = async () => {
    setSavingEnv(true);
    try {
      const res = await fetch("/api/settings/env", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(envVars),
      });
      if (res.ok) {
        alert("Google API credentials saved successfully!");
      } else {
        alert("Failed to save credentials.");
      }
    } catch (err) {
      console.error("Failed to save env vars:", err);
      alert("Error saving credentials.");
    } finally {
      setSavingEnv(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Settings2 className="h-8 w-8 text-slate-600" />
          Settings
        </h1>
        <p className="text-slate-500 mt-1">
          Manage integrations and API connections
        </p>
      </div>

      {/* Status Messages */}
      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 flex items-center gap-2">
          <XCircle className="h-5 w-5 flex-shrink-0" />
          {errorMsg}
        </div>
      )}

      <div className="space-y-6">
        {/* Gmail Integration */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/20">
                  <Mail className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">Gmail Integration</CardTitle>
                  <CardDescription>
                    Connect your Gmail to auto-import banking transactions
                  </CardDescription>
                </div>
              </div>
              {loading ? (
                <Badge variant="secondary">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Checking...
                </Badge>
              ) : gmailConnected ? (
                <Badge variant="success" className="text-sm px-3 py-1">
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-sm px-3 py-1">
                  <XCircle className="h-3.5 w-3.5 mr-1" />
                  Not Connected
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <h4 className="text-sm font-semibold text-slate-700">
                How it works
              </h4>
              <ul className="text-sm text-slate-600 space-y-1.5 list-disc list-inside">
                <li>
                  Connect your Gmail account using Google OAuth2
                </li>
                <li>
                  We search for banking emails (transaction alerts, spending
                  notifications)
                </li>
                <li>
                  Transactions are automatically parsed and imported
                </li>
                <li>
                  Duplicates are prevented using hash-based deduplication
                </li>
              </ul>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-slate-700 mb-2">
                Search Filters
              </h4>
              <div className="flex flex-wrap gap-2">
                {[
                  "biến động số dư",
                  "transaction alert",
                  "spending alert",
                  "giao dịch",
                  "chi tiêu",
                ].map((filter) => (
                  <Badge key={filter} variant="outline" className="text-xs">
                    &quot;{filter}&quot;
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              {gmailConnected ? (
                <>
                  <Button
                    variant="outline"
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="gap-2"
                  >
                    {disconnecting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Unplug className="h-4 w-4" />
                    )}
                    Disconnect Gmail
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      (window.location.href = "/api/email/authorize")
                    }
                    className="gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Re-authorize
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() =>
                    (window.location.href = "/api/email/authorize")
                  }
                  className="gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Connect Gmail
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Google API Credentials */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Google API Credentials</CardTitle>
            <CardDescription>
              Configure your Google OAuth2 credentials to enable Gmail integration.
              These will be saved directly to your <code className="bg-slate-100 px-1 py-0.5 rounded text-xs">.env</code> file.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-w-2xl">
              <div className="space-y-2">
                <Label htmlFor="clientId">Client ID</Label>
                <Input
                  id="clientId"
                  value={envVars.GOOGLE_CLIENT_ID}
                  onChange={(e) =>
                    setEnvVars({ ...envVars, GOOGLE_CLIENT_ID: e.target.value })
                  }
                  placeholder="e.g. 123456789-abc.apps.googleusercontent.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientSecret">Client Secret</Label>
                <Input
                  id="clientSecret"
                  type="password"
                  value={envVars.GOOGLE_CLIENT_SECRET}
                  onChange={(e) =>
                    setEnvVars({ ...envVars, GOOGLE_CLIENT_SECRET: e.target.value })
                  }
                  placeholder="e.g. GOCSPX-..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="redirectUri">Redirect URI</Label>
                <Input
                  id="redirectUri"
                  value={envVars.GOOGLE_REDIRECT_URI}
                  onChange={(e) =>
                    setEnvVars({ ...envVars, GOOGLE_REDIRECT_URI: e.target.value })
                  }
                  placeholder="e.g. http://localhost:3000/api/email/callback"
                />
              </div>
              <Button
                onClick={handleSaveEnv}
                disabled={savingEnv}
                className="mt-2"
              >
                {savingEnv ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Credentials"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>}>
      <SettingsContent />
    </Suspense>
  );
}
