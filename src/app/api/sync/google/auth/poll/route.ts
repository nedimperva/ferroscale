import { NextResponse, type NextRequest } from "next/server";
import type { SyncAuthPollResponse } from "@/lib/sync/sync-shared";
import { consumeAuthHandoff, getAuthHandoff } from "@/lib/sync/sync-handoff-store";
import { SYNC_PROVIDER } from "@/lib/sync/sync-shared";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const authRequestId = request.nextUrl.searchParams.get("authRequestId");
  if (!authRequestId) {
    return NextResponse.json({ message: "Missing authRequestId" }, { status: 400 });
  }

  const existing = getAuthHandoff(authRequestId);
  if (!existing || existing.kind === "pending") {
    const payload: SyncAuthPollResponse = { ok: true, status: "pending" };
    return NextResponse.json(payload);
  }

  const handoff = consumeAuthHandoff(authRequestId);
  if (!handoff || handoff.kind === "pending") {
    const payload: SyncAuthPollResponse = { ok: true, status: "pending" };
    return NextResponse.json(payload);
  }

  if (handoff.kind === "error") {
    const payload: SyncAuthPollResponse = { ok: true, status: "error", message: handoff.message };
    return NextResponse.json(payload);
  }

  const payload: SyncAuthPollResponse = {
    ok: true,
    status: "complete",
    session: {
      provider: SYNC_PROVIDER,
      sessionToken: handoff.sessionToken,
      accountEmail: handoff.accountEmail,
      accountSub: handoff.accountSub,
    },
  };
  return NextResponse.json(payload);
}
