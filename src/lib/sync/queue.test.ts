// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

const KEY = "ferroscale-sync-queue-v1";

async function load() {
  vi.resetModules();
  return import("./queue");
}

beforeEach(() => {
  localStorage.clear();
});

describe("queueRetryDelay", () => {
  it("is due immediately with no failures", async () => {
    const { queueRetryDelay } = await load();
    expect(queueRetryDelay(0)).toBe(0);
  });

  it("backs off exponentially and stops at a quarter of an hour", async () => {
    const { queueRetryDelay } = await load();
    expect(queueRetryDelay(1)).toBe(30_000);
    expect(queueRetryDelay(2)).toBe(60_000);
    expect(queueRetryDelay(3)).toBe(120_000);
    expect(queueRetryDelay(20)).toBe(15 * 60_000);
  });
});

describe("noteQueueAttempt", () => {
  it("moves the next attempt into the future on a failure", async () => {
    const { noteQueueAttempt, getQueueState, queueIsDue } = await load();
    noteQueueAttempt(false, "transient");
    const state = getQueueState();
    expect(state.attempts).toBe(1);
    expect(state.lastErrorKind).toBe("transient");
    expect(state.nextAttemptAt).toBeGreaterThan(Date.now() - 1);
    expect(queueIsDue()).toBe(false);
  });

  it("clears the failures on a success", async () => {
    const { noteQueueAttempt, getQueueState } = await load();
    noteQueueAttempt(false, "transient");
    noteQueueAttempt(false, "transient");
    noteQueueAttempt(true);
    const state = getQueueState();
    expect(state.attempts).toBe(0);
    expect(state.nextAttemptAt).toBe(0);
  });

  it("survives being read in a new session", async () => {
    const first = await load();
    first.noteQueueAttempt(false, "transient");

    vi.resetModules();
    const again = await import("./queue");
    expect(again.getQueueState().attempts).toBe(1);
  });
});

describe("clearQueueState", () => {
  it("forgets the attempt history", async () => {
    const { noteQueueAttempt, clearQueueState, getQueueState } = await load();
    noteQueueAttempt(false);
    clearQueueState();
    expect(getQueueState()).toEqual({
      lastAttemptAt: 0,
      attempts: 0,
      lastErrorKind: null,
      nextAttemptAt: 0,
    });
    expect(localStorage.getItem(KEY)).toContain('"attempts":0');
  });
});

describe("writeQueueState", () => {
  it("persists the state", async () => {
    const { writeQueueState, getQueueState } = await load();
    writeQueueState({
      lastAttemptAt: 1,
      attempts: 2,
      lastErrorKind: "reauth",
      nextAttemptAt: 3,
    });
    expect(JSON.parse(localStorage.getItem(KEY) ?? "{}")).toMatchObject({ attempts: 2 });
    expect(getQueueState().lastErrorKind).toBe("reauth");
  });

  it("hands out the same object until something changes — the store snapshot", async () => {
    const { getQueueState, writeQueueState } = await load();
    expect(getQueueState()).toBe(getQueueState());
    writeQueueState({ lastAttemptAt: 0, attempts: 0, lastErrorKind: null, nextAttemptAt: 0 });
    expect(getQueueState()).toBe(getQueueState());
  });
});
