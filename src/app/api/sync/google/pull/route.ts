import { NextResponse, type NextRequest } from "next/server";
import type { SyncPullRequest, SyncPullResponse } from "@/lib/sync/sync-shared";
import { pullChangedRecords, pullInitialRecords, refreshGoogleAccessToken } from "@/lib/sync/google-server";
import { unsealSyncSession } from "@/lib/sync/sync-session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as SyncPullRequest;
    if (!body.sessionToken) {
      return NextResponse.json({ message: "Missing sessionToken" }, { status: 400 });
    }

    const session = unsealSyncSession(body.sessionToken);
    const { accessToken, sessionToken } = await refreshGoogleAccessToken(session);

    const result = body.pageToken
      ? await pullChangedRecords(accessToken, body.pageToken)
      : await pullInitialRecords(accessToken);

    const payload: SyncPullResponse = {
      ok: true,
      records: result.records,
      nextPageToken: result.nextPageToken,
      sessionToken,
    };

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to pull sync records" },
      { status: 500 },
    );
  }
}
