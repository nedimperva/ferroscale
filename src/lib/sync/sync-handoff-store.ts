type PendingEntry = {
  kind: "pending";
  state: string;
  codeVerifier: string;
  expiresAt: number;
};

type CompleteEntry = {
  kind: "complete";
  sessionToken: string;
  accountEmail: string | null;
  accountSub: string | null;
  expiresAt: number;
};

type ErrorEntry = {
  kind: "error";
  message: string;
  expiresAt: number;
};

type HandoffEntry = PendingEntry | CompleteEntry | ErrorEntry;

declare global {
  // eslint-disable-next-line no-var
  var __ferroscaleAuthHandoffStore: Map<string, HandoffEntry> | undefined;
}

function getStore() {
  if (!globalThis.__ferroscaleAuthHandoffStore) {
    globalThis.__ferroscaleAuthHandoffStore = new Map<string, HandoffEntry>();
  }
  return globalThis.__ferroscaleAuthHandoffStore;
}

function cleanupExpired() {
  const now = Date.now();
  const store = getStore();
  for (const [key, value] of store.entries()) {
    if (value.expiresAt <= now) {
      store.delete(key);
    }
  }
}

export function putPendingAuthHandoff(authRequestId: string, state: string, codeVerifier: string, ttlMs = 10 * 60_000) {
  cleanupExpired();
  getStore().set(authRequestId, {
    kind: "pending",
    state,
    codeVerifier,
    expiresAt: Date.now() + ttlMs,
  });
}

export function getPendingAuthHandoffByState(state: string) {
  cleanupExpired();
  for (const [authRequestId, value] of getStore().entries()) {
    if (value.kind === "pending" && value.state === state) {
      return { authRequestId, value };
    }
  }
  return null;
}

export function getAuthHandoff(authRequestId: string) {
  cleanupExpired();
  return getStore().get(authRequestId) ?? null;
}

export function completeAuthHandoff(
  authRequestId: string,
  sessionToken: string,
  accountEmail: string | null,
  accountSub: string | null,
  ttlMs = 10 * 60_000,
) {
  cleanupExpired();
  getStore().set(authRequestId, {
    kind: "complete",
    sessionToken,
    accountEmail,
    accountSub,
    expiresAt: Date.now() + ttlMs,
  });
}

export function failAuthHandoff(authRequestId: string, message: string, ttlMs = 10 * 60_000) {
  cleanupExpired();
  getStore().set(authRequestId, {
    kind: "error",
    message,
    expiresAt: Date.now() + ttlMs,
  });
}

export function consumeAuthHandoff(authRequestId: string) {
  cleanupExpired();
  const value = getStore().get(authRequestId) ?? null;
  if (value && value.kind !== "pending") {
    getStore().delete(authRequestId);
  }
  return value;
}
