import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const envPath = path.join(process.cwd(), ".env");

export async function GET() {
  try {
    let clientId = "";
    let clientSecret = "";
    let redirectUri = "";

    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf-8");
      const lines = envContent.split("\n");
      
      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith("GOOGLE_CLIENT_ID=")) clientId = trimmed.substring("GOOGLE_CLIENT_ID=".length).trim();
        if (trimmed.startsWith("GOOGLE_CLIENT_SECRET=")) clientSecret = trimmed.substring("GOOGLE_CLIENT_SECRET=".length).trim();
        if (trimmed.startsWith("GOOGLE_REDIRECT_URI=")) redirectUri = trimmed.substring("GOOGLE_REDIRECT_URI=".length).trim();
      });
    }

    return NextResponse.json({
      GOOGLE_CLIENT_ID: clientId,
      GOOGLE_CLIENT_SECRET: clientSecret,
      GOOGLE_REDIRECT_URI: redirectUri,
    });
  } catch (error) {
    console.error("Failed to read env", error);
    return NextResponse.json({ error: "Failed to read configuration" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = body;

    let envContent = "";
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, "utf-8");
    }

    const updates: Record<string, string> = {
      GOOGLE_CLIENT_ID: GOOGLE_CLIENT_ID || "",
      GOOGLE_CLIENT_SECRET: GOOGLE_CLIENT_SECRET || "",
      GOOGLE_REDIRECT_URI: GOOGLE_REDIRECT_URI || "",
    };

    let lines = envContent.split("\n");
    
    for (const [key, value] of Object.entries(updates)) {
      const index = lines.findIndex(line => line.trim().startsWith(`${key}=`));
      if (index !== -1) {
        lines[index] = `${key}=${value}`;
      } else {
        lines.push(`${key}=${value}`);
      }
      process.env[key] = value;
    }

    fs.writeFileSync(envPath, lines.join("\n"));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update env", error);
    return NextResponse.json({ error: "Failed to update configuration" }, { status: 500 });
  }
}
