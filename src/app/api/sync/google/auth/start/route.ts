import { NextResponse, type NextRequest } from "next/server";
import type { SyncAuthStartResponse } from "@/lib/sync/sync-shared";
import {
  buildGoogleAuthUrl,
  createAuthRequestId,
  createPkceChallenge,
  createPkceVerifier,
} from "@/lib/sync/google-server";
import { putPendingAuthHandoff } from "@/lib/sync/sync-handoff-store";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const authRequestId = createAuthRequestId();
    const verifier = createPkceVerifier();
    const challenge = createPkceChallenge(verifier);
    putPendingAuthHandoff(authRequestId, authRequestId, verifier);

    const payload: SyncAuthStartResponse = {
      ok: true,
      authRequestId,
      authUrl: buildGoogleAuthUrl(request, authRequestId, challenge),
      expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
    };

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to start Google Drive auth" },
      { status: 500 },
    );
  }
}
