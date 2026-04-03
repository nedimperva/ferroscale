import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

describe("POST /api/sync/google/disconnect", () => {
  it("requires sessionToken", async () => {
    const request = new NextRequest("https://example.com/api/sync/google/disconnect", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({
      message: "Missing sessionToken",
    });
  });
});
