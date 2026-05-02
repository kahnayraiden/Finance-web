import { NextResponse } from "next/server";
import { exchangeCode } from "@/lib/gmail";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        new URL(`/settings?error=${encodeURIComponent(error)}`, req.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/settings?error=No+authorization+code+received", req.url)
      );
    }

    await exchangeCode(code);

    return NextResponse.redirect(
      new URL("/settings?success=Gmail+connected+successfully", req.url)
    );
  } catch (error: any) {
    console.error("[email/callback] Error:", error);
    return NextResponse.redirect(
      new URL(
        `/settings?error=${encodeURIComponent(error.message || "OAuth failed")}`,
        req.url
      )
    );
  }
}
