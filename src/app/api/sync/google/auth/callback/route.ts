import { NextResponse, type NextRequest } from "next/server";
import { exchangeAuthCode, fetchGoogleAccount } from "@/lib/sync/google-server";
import {
  completeAuthHandoff,
  failAuthHandoff,
  getPendingAuthHandoffByState,
} from "@/lib/sync/sync-handoff-store";
import { sealSyncSession } from "@/lib/sync/sync-session";
import { SYNC_AUTH_RESULT_STORAGE_KEY } from "@/lib/sync/keys";
import { SYNC_PROVIDER } from "@/lib/sync/sync-shared";

export const runtime = "nodejs";

function escapeForScript(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function html(message: string) {
  return new NextResponse(
    `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1" /><title>FerroScale Sync</title></head><body style="font-family:system-ui,sans-serif;padding:24px;background:#f3f1eb;color:#18181b"><main style="max-width:520px;margin:0 auto;background:white;border-radius:16px;padding:24px;border:1px solid #e7e5e4"><h1 style="margin:0 0 12px;font-size:20px">FerroScale Sync</h1><p style="margin:0;color:#57534e;line-height:1.5">${message}</p><p style="margin:12px 0 0;color:#78716c;font-size:14px">This window should close automatically. If it stays open, you can close it and return to FerroScale.</p></main><script>setTimeout(function(){try{window.close()}catch(e){}}, 900);</script></body></html>`,
    {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    },
  );
}

function successHtml(session: { sessionToken: string; accountEmail: string | null; accountSub: string | null }) {
  const payload = escapeForScript({
    ok: true,
    status: "complete",
    session: {
      provider: SYNC_PROVIDER,
      sessionToken: session.sessionToken,
      accountEmail: session.accountEmail,
      accountSub: session.accountSub,
    },
  });

  return new NextResponse(
    `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1" /><title>FerroScale Sync</title></head><body style="font-family:system-ui,sans-serif;padding:24px;background:#f3f1eb;color:#18181b"><main style="max-width:520px;margin:0 auto;background:white;border-radius:16px;padding:24px;border:1px solid #e7e5e4"><h1 style="margin:0 0 12px;font-size:20px">FerroScale Sync</h1><p style="margin:0;color:#57534e;line-height:1.5">Google Drive is connected. Returning to FerroScale...</p></main><script>(function(){var payload=${payload};try{localStorage.setItem(${JSON.stringify(SYNC_AUTH_RESULT_STORAGE_KEY)}, JSON.stringify(payload));}catch(e){}try{if(window.opener&&!window.opener.closed){window.opener.postMessage({type:"ferroscale-sync-auth-result"}, window.location.origin);setTimeout(function(){window.close()},300);return;}}catch(e){}setTimeout(function(){window.location.replace("/")},300)})();</script></body></html>`,
    {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    },
  );
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  if (!state) {
    return html("The sign-in response is missing state. Return to FerroScale and try connecting Google Drive again.");
  }

  const handoff = getPendingAuthHandoffByState(state);
  if (!handoff || handoff.value.kind !== "pending") {
    return html("This sign-in request expired. Return to FerroScale and start the Google Drive connection again.");
  }

  if (error) {
    failAuthHandoff(handoff.authRequestId, error);
    return html("Google sign-in was cancelled or failed. Return to FerroScale and try again.");
  }

  if (!code) {
    failAuthHandoff(handoff.authRequestId, "Missing authorization code");
    return html("Google did not return an authorization code. Return to FerroScale and try again.");
  }

  try {
    const tokens = await exchangeAuthCode(request, code, handoff.value.codeVerifier);
    if (!tokens.refresh_token) {
      throw new Error("Google did not return a refresh token");
    }

    const account = await fetchGoogleAccount(tokens.access_token);
    const sessionToken = sealSyncSession({
      provider: SYNC_PROVIDER,
      refreshToken: tokens.refresh_token,
      scope: tokens.scope ?? "",
      accountEmail: account.email,
      accountSub: account.sub,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    completeAuthHandoff(handoff.authRequestId, sessionToken, account.email, account.sub);
    return successHtml({
      sessionToken,
      accountEmail: account.email,
      accountSub: account.sub,
    });
  } catch (callbackError) {
    failAuthHandoff(
      handoff.authRequestId,
      callbackError instanceof Error ? callbackError.message : "Google sign-in failed",
    );
    return html("Google Drive sign-in failed. Return to FerroScale and try again.");
  }
}
