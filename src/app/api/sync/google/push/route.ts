import { NextResponse, type NextRequest } from "next/server";
import type { SyncPushRequest, SyncPushResponse } from "@/lib/sync/sync-shared";
import { clearRemoteSyncFiles, pushRecordsToDrive, refreshGoogleAccessToken } from "@/lib/sync/google-server";
import { unsealSyncSession } from "@/lib/sync/sync-session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as SyncPushRequest;
    if (!body.sessionToken) {
      return NextResponse.json({ message: "Missing sessionToken" }, { status: 400 });
    }

    const session = unsealSyncSession(body.sessionToken);
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
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to push sync records" },
      { status: 500 },
    );
  }
}
