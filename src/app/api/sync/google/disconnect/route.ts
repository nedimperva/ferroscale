import { NextResponse, type NextRequest } from "next/server";
import { unsealSyncSession } from "@/lib/sync/sync-session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { sessionToken?: string };
    if (!body.sessionToken) {
      return NextResponse.json({ message: "Missing sessionToken" }, { status: 400 });
    }

    const session = unsealSyncSession(body.sessionToken);
    await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: session.refreshToken }).toString(),
      cache: "no-store",
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to disconnect Google Drive sync" },
      { status: 500 },
    );
  }
}
