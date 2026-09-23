import { NextResponse, type NextRequest } from "next/server";
import type { SyncPullRequest, SyncPullResponse } from "@/lib/sync/sync-shared";
import {
  SyncStaleChangeTokenError,
  openSyncSession,
  pullChangedRecords,
  pullInitialRecords,
  refreshGoogleAccessToken,
  syncErrorResponse,
} from "@/lib/sync/google-server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as SyncPullRequest;
    if (!body.sessionToken) {
      return NextResponse.json({ message: "Missing sessionToken" }, { status: 400 });
    }

    const session = openSyncSession(body.sessionToken);
    const { accessToken, sessionToken } = await refreshGoogleAccessToken(session);

    let result;
    try {
      result = body.pageToken
        ? await pullChangedRecords(accessToken, body.pageToken)
        : await pullInitialRecords(accessToken);
    } catch (error) {
      // A cursor Drive no longer knows: list everything again. Merging is
      // idempotent, so re-reading records the client already has is harmless.
      if (!(error instanceof SyncStaleChangeTokenError)) throw error;
      result = await pullInitialRecords(accessToken);
    }

    const payload: SyncPullResponse = {
      ok: true,
      records: result.records,
      nextPageToken: result.nextPageToken,
      sessionToken,
    };

    return NextResponse.json(payload);
  } catch (error) {
    const { status, body } = syncErrorResponse(error, "Failed to pull sync records");
    return NextResponse.json(body, { status });
  }
}
