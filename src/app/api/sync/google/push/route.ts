import { NextResponse, type NextRequest } from "next/server";
import type { SyncPushRequest, SyncPushResponse } from "@/lib/sync/sync-shared";
import {
  clearRemoteSyncFiles,
  openSyncSession,
  pushRecordsToDrive,
  refreshGoogleAccessToken,
  syncErrorResponse,
} from "@/lib/sync/google-server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as SyncPushRequest;
    if (!body.sessionToken) {
      return NextResponse.json({ message: "Missing sessionToken" }, { status: 400 });
    }

    const session = openSyncSession(body.sessionToken);
    const { accessToken, sessionToken } = await refreshGoogleAccessToken(session);

    if (body.resetRemote) {
      await clearRemoteSyncFiles(accessToken);
    }

    const uploaded = await pushRecordsToDrive(accessToken, body.records ?? []);
    const payload: SyncPushResponse = {
      ok: true,
      records: uploaded,
      sessionToken,
    };

    return NextResponse.json(payload);
  } catch (error) {
    const { status, body } = syncErrorResponse(error, "Failed to push sync records");
    return NextResponse.json(body, { status });
  }
}
