import { createHash, randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import {
  buildRemoteFileName,
  parseRemoteFileName,
  SYNC_FILE_PREFIX,
} from "./sync-shared";
import type {
  SyncPushRecord,
  SyncPushResult,
  SyncPulledRecord,
} from "./sync-shared";
import type { SyncSessionPayload } from "./types";
import { sealSyncSession } from "./sync-session";

const DRIVE_SPACE_QUERY = "'appDataFolder' in parents and trashed=false";

type GoogleTokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
};

type DriveFile = {
  id: string;
  name: string;
  modifiedTime?: string;
};

function requireEnv(name: string, fallback?: string) {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

function getGoogleClientId() {
  return requireEnv("GOOGLE_CLIENT_ID", process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
}

function getGoogleClientSecret() {
  return requireEnv("GOOGLE_CLIENT_SECRET");
}

function base64Url(buffer: Buffer | Uint8Array) {
  return Buffer.from(buffer)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function createPkceVerifier() {
  return base64Url(randomBytes(32));
}

export function createAuthRequestId() {
  return base64Url(randomBytes(24));
}

export function createPkceChallenge(verifier: string) {
  return base64Url(createHash("sha256").update(verifier).digest());
}

function getBaseUrl(request: NextRequest) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  return request.nextUrl.origin;
}

export function getGoogleRedirectUri(request: NextRequest) {
  return `${getBaseUrl(request)}/api/sync/google/auth/callback`;
}

export function buildGoogleAuthUrl(request: NextRequest, state: string, codeChallenge: string) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", getGoogleClientId());
  url.searchParams.set("redirect_uri", getGoogleRedirectUri(request));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("scope", "https://www.googleapis.com/auth/drive.appdata openid email");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

async function tokenRequest(params: URLSearchParams) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await response.text() || "Google token exchange failed");
  }

  return response.json() as Promise<GoogleTokenResponse>;
}

export async function exchangeAuthCode(request: NextRequest, code: string, codeVerifier: string) {
  return tokenRequest(new URLSearchParams({
    code,
    code_verifier: codeVerifier,
    client_id: getGoogleClientId(),
    client_secret: getGoogleClientSecret(),
    grant_type: "authorization_code",
    redirect_uri: getGoogleRedirectUri(request),
  }));
}

export async function refreshGoogleAccessToken(session: SyncSessionPayload) {
  const tokens = await tokenRequest(new URLSearchParams({
    client_id: getGoogleClientId(),
    client_secret: getGoogleClientSecret(),
    grant_type: "refresh_token",
    refresh_token: session.refreshToken,
  }));

  const nextSession = tokens.refresh_token
    ? sealSyncSession({
        ...session,
        refreshToken: tokens.refresh_token,
        scope: tokens.scope ?? session.scope,
        updatedAt: new Date().toISOString(),
      })
    : undefined;

  return {
    accessToken: tokens.access_token,
    sessionToken: nextSession,
  };
}

export async function fetchGoogleAccount(accessToken: string) {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!response.ok) {
    return { email: null, sub: null };
  }

  const payload = await response.json() as { email?: string; sub?: string };
  return {
    email: payload.email ?? null,
    sub: payload.sub ?? null,
  };
}

async function driveFetch(accessToken: string, input: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  const response = await fetch(input, { ...init, headers, cache: "no-store" });
  if (!response.ok) {
    throw new Error(await response.text() || `Google Drive request failed (${response.status})`);
  }
  return response;
}

async function listPrefixedDriveFiles(accessToken: string) {
  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set("spaces", "appDataFolder");
  url.searchParams.set("fields", "files(id,name,modifiedTime)");
  url.searchParams.set("q", `name contains '${SYNC_FILE_PREFIX}' and ${DRIVE_SPACE_QUERY}`);
  const response = await driveFetch(accessToken, url.toString());
  const payload = await response.json() as { files?: DriveFile[] };
  return payload.files ?? [];
}

async function getDriveStartPageToken(accessToken: string) {
  const url = new URL("https://www.googleapis.com/drive/v3/changes/startPageToken");
  url.searchParams.set("spaces", "appDataFolder");
  const response = await driveFetch(accessToken, url.toString());
  const payload = await response.json() as { startPageToken?: string };
  return payload.startPageToken ?? null;
}

async function downloadDriveFile(accessToken: string, fileId: string) {
  const response = await driveFetch(accessToken, `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);
  return response.text();
}

async function uploadDriveFile(accessToken: string, name: string, encryptedPayload: string, existingFileId?: string | null) {
  const boundary = `sync-${Date.now()}`;
  const upload = async (fileId?: string | null) => {
    const metadata = JSON.stringify(fileId ? { name } : { name, parents: ["appDataFolder"] });
    const body = [
      `--${boundary}`,
      "Content-Type: application/json; charset=UTF-8",
      "",
      metadata,
      `--${boundary}`,
      "Content-Type: text/plain",
      "",
      encryptedPayload,
      `--${boundary}--`,
    ].join("\r\n");

    const base = fileId
      ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}`
      : "https://www.googleapis.com/upload/drive/v3/files";

    const response = await driveFetch(accessToken, `${base}?uploadType=multipart&fields=id,name,modifiedTime`, {
      method: fileId ? "PATCH" : "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    });

    return response.json() as Promise<DriveFile>;
  };

  try {
    return await upload(existingFileId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (existingFileId && /File not found|insufficientFilePermissions|not be modified|Invalid Value|404/i.test(message)) {
      return upload(null);
    }
    throw error;
  }
}

export async function pushRecordsToDrive(accessToken: string, records: SyncPushRecord[]) {
  const uploaded: SyncPushResult[] = [];
  for (const record of records) {
    const remote = await uploadDriveFile(
      accessToken,
      buildRemoteFileName(record.kind, record.recordKey),
      record.encryptedPayload,
      record.existingFileId,
    );
    uploaded.push({
      recordKey: record.recordKey,
      driveFileId: remote.id,
      name: remote.name,
      modifiedTime: remote.modifiedTime ?? null,
    });
  }
  return uploaded;
}

export async function clearRemoteSyncFiles(accessToken: string) {
  const files = await listPrefixedDriveFiles(accessToken);
  for (const file of files) {
    await driveFetch(accessToken, `https://www.googleapis.com/drive/v3/files/${file.id}`, { method: "DELETE" });
  }
}

export async function pullInitialRecords(accessToken: string) {
  const files = await listPrefixedDriveFiles(accessToken);
  const records: SyncPulledRecord[] = [];
  for (const file of files) {
    const parsed = parseRemoteFileName(file.name);
    if (!parsed) continue;
    records.push({
      recordKey: parsed.recordKey,
      kind: parsed.kind,
      driveFileId: file.id,
      encryptedPayload: await downloadDriveFile(accessToken, file.id),
      removed: false,
      modifiedTime: file.modifiedTime ?? null,
    });
  }

  return {
    records,
    nextPageToken: await getDriveStartPageToken(accessToken),
  };
}

export async function pullChangedRecords(accessToken: string, pageToken: string) {
  const records: SyncPulledRecord[] = [];
  let currentToken: string | null = pageToken;
  let nextPageToken: string | null = null;

  while (currentToken) {
    const url = new URL("https://www.googleapis.com/drive/v3/changes");
    url.searchParams.set("pageToken", currentToken);
    url.searchParams.set("spaces", "appDataFolder");
    url.searchParams.set("includeRemoved", "true");
    url.searchParams.set("fields", "nextPageToken,newStartPageToken,changes(fileId,removed,file(id,name,modifiedTime,trashed))");

    const response = await driveFetch(accessToken, url.toString());
    const payload = await response.json() as {
      nextPageToken?: string;
      newStartPageToken?: string;
      changes?: Array<{
        fileId: string;
        removed?: boolean;
        file?: DriveFile | null;
      }>;
    };

    for (const change of payload.changes ?? []) {
      const file = change.file;
      const parsed = file?.name ? parseRemoteFileName(file.name) : null;
      if (!parsed) continue;

      records.push({
        recordKey: parsed.recordKey,
        kind: parsed.kind,
        driveFileId: change.fileId,
        encryptedPayload: change.removed ? null : await downloadDriveFile(accessToken, change.fileId),
        removed: !!change.removed,
        modifiedTime: file?.modifiedTime ?? null,
      });
    }

    currentToken = payload.nextPageToken ?? null;
    nextPageToken = payload.newStartPageToken ?? nextPageToken;
  }

  return {
    records,
    nextPageToken,
  };
}
