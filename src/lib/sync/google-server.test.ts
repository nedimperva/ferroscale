import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildRemoteFileName, parseRemoteFileName } from "./sync-shared";
import { pullInitialRecords, pushRecordsToDrive } from "./google-server";
import { sealSyncSession, unsealSyncSession } from "./sync-session";

describe("sync helpers", () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      GOOGLE_CLIENT_ID: "test-client-id",
      GOOGLE_CLIENT_SECRET: "test-client-secret",
      SYNC_SESSION_SECRET: "test-sync-secret",
    };
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("seals and unseals sync sessions", () => {
    const token = sealSyncSession({
      provider: "google",
      refreshToken: "refresh-token",
      scope: "scope-a",
      accountEmail: "test@example.com",
      accountSub: "sub-123",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(unsealSyncSession(token)).toMatchObject({
      refreshToken: "refresh-token",
      accountEmail: "test@example.com",
      accountSub: "sub-123",
    });
  });

  it("lists every page of Drive files on a first pull", async () => {
    const json = (body: unknown) =>
      new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname === "/drive/v3/files") {
        return url.searchParams.get("pageToken") === "page-2"
          ? json({ files: [{ id: "f2", name: buildRemoteFileName("saved", "saved:2") }] })
          : json({
              files: [{ id: "f1", name: buildRemoteFileName("saved", "saved:1") }],
              nextPageToken: "page-2",
            });
      }
      if (url.pathname === "/drive/v3/changes/startPageToken") return json({ startPageToken: "start" });
      return new Response(`payload-${url.pathname.split("/").pop()}`, { status: 200 });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await pullInitialRecords("access-token");

    expect(result.records.map((record) => record.recordKey)).toEqual(["saved:1", "saved:2"]);
    expect(result.records.map((record) => record.encryptedPayload)).toEqual(["payload-f1", "payload-f2"]);
    expect(result.nextPageToken).toBe("start");
  });

  it("round-trips remote file names", () => {
    const name = buildRemoteFileName("saved", "saved:123");
    expect(parseRemoteFileName(name)).toEqual({
      kind: "saved",
      recordKey: "saved:123",
    });
  });

  it("recreates Drive files when a stored file id can no longer be patched", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("File not found", { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: "new-file-id",
        name: "ignored",
        modifiedTime: "2026-04-02T00:00:00.000Z",
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }));

    global.fetch = fetchMock as typeof fetch;

    const results = await pushRecordsToDrive("access-token", [{
      recordKey: "saved:123",
      kind: "saved",
      entityId: "123",
      updatedAt: "2026-04-02T00:00:00.000Z",
      contentHash: "hash-123",
      encryptedPayload: "encrypted",
      existingFileId: "missing-file-id",
    }]);

    expect(results).toEqual([
      expect.objectContaining({ recordKey: "saved:123", driveFileId: "new-file-id" }),
    ]);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/upload/drive/v3/files/missing-file-id");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("/upload/drive/v3/files?uploadType=multipart");
    expect(String(fetchMock.mock.calls[0]?.[1]?.body ?? "")).not.toContain("\"parents\"");
    expect(String(fetchMock.mock.calls[1]?.[1]?.body ?? "")).toContain("\"parents\":[\"appDataFolder\"]");
  });
});
