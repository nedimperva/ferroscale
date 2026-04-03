import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

describe("GET /api/sync/google/auth/poll", () => {
  it("requires authRequestId", async () => {
    const request = new NextRequest("https://example.com/api/sync/google/auth/poll");
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({
      message: "Missing authRequestId",
    });
  });
});
