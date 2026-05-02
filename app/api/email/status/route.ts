import { NextResponse } from "next/server";
import { isConnected, clearTokens } from "@/lib/gmail";

export async function GET() {
  try {
    const connected = isConnected();
    return NextResponse.json({ connected });
  } catch (error) {
    return NextResponse.json({ connected: false });
  }
}

export async function DELETE() {
  try {
    clearTokens();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to disconnect" },
      { status: 500 }
    );
  }
}
