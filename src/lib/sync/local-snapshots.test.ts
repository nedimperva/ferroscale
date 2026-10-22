// @vitest-environment jsdom
import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearLocalSnapshots,
  deleteLocalSnapshot,
  listLocalSnapshots,
  readLocalSnapshot,
  restoreLocalSnapshot,
  selectSnapshotEvictions,
  writeLocalSnapshot,
} from "./local-snapshots";

const mocks = vi.hoisted(() => ({
  saved: [{ id: "saved-1" }, { id: "saved-2" }],
  projects: [{ id: "project-1" }],
  customers: [{ id: "customer-1" }, { id: "customer-2" }, { id: "customer-3" }],
  compare: [{ id: "compare-1" }, { id: "compare-2" }, { id: "compare-3" }, { id: "compare-4" }],
  quickHistory: ["hea120 6m", "shs40x40x3 6m", "upn100 3m", "l50x50x5 6m", "f80 6m"],
  priceBook: [{ gradeId: "s235", unitPrice: 1.2 }, { gradeId: "s355", unitPrice: 1.4 }],
  persistSavedEntries: vi.fn(),
  persistProjects: vi.fn(),
  persistCustomers: vi.fn(),
  persistCompareItems: vi.fn(),
  persistPriceBook: vi.fn(),
  persistQuickHistory: vi.fn(),
  notifyCollectionsReplaced: vi.fn(),
}));

vi.mock("./collections", () => ({
  loadSavedEntries: () => mocks.saved,
  loadProjects: () => mocks.projects,
  loadCustomers: () => mocks.customers,
  loadCompareItems: () => mocks.compare,
  loadQuickHistory: () => mocks.quickHistory,
  loadPriceBook: () => mocks.priceBook,
  persistSavedEntries: mocks.persistSavedEntries,
  persistProjects: mocks.persistProjects,
  persistCustomers: mocks.persistCustomers,
  persistCompareItems: mocks.persistCompareItems,
  persistPriceBook: mocks.persistPriceBook,
  persistQuickHistory: mocks.persistQuickHistory,
}));

vi.mock("./external-changes", () => ({
  notifyCollectionsReplaced: mocks.notifyCollectionsReplaced,
}));

interface FakeRow {
  [key: string]: unknown;
}

class FakeRequest<T> {
  onsuccess: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onupgradeneeded: (() => void) | null = null;
  result: T | undefined = undefined;
  error: unknown = null;
}

class FakeStore {
  readonly rows = new Map<string, FakeRow>();
  readonly indexes = new Map<string, string>();

  constructor(readonly name: string, readonly keyPath: string) {}
}

class FakeStoreView {
  constructor(private readonly store: FakeStore, private readonly tx: FakeTransaction) {}

  put(value: FakeRow) {
    return this.tx.request<FakeRow>((request) => {
      this.store.rows.set(String(value[this.store.keyPath]), value);
      request.result = value;
    });
  }

  get(key: string) {
    return this.tx.request<FakeRow | undefined>((request) => {
      request.result = this.store.rows.get(key);
    });
  }

  delete(key: string) {
    return this.tx.request<undefined>((request) => {
      this.store.rows.delete(key);
      request.result = undefined;
    });
  }

  clear() {
    return this.tx.request<undefined>((request) => {
      this.store.rows.clear();
      request.result = undefined;
    });
  }

  index(name: string) {
    const keyPath = this.store.indexes.get(name) ?? "";
    return {
      getAll: () =>
        this.tx.request<FakeRow[]>((request) => {
          request.result = [...this.store.rows.values()].sort(
            (left, right) => Number(left[keyPath]) - Number(right[keyPath]),
          );
        }),
    };
  }
}

class FakeTransaction {
  oncomplete: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  private pending = 0;

  constructor(private readonly store: FakeStore) {}

  objectStore(): FakeStoreView {
    return new FakeStoreView(this.store, this);
  }

  request<T>(build: (request: FakeRequest<T>) => void): FakeRequest<T> {
    const request = new FakeRequest<T>();
    this.pending += 1;
    queueMicrotask(() => {
      build(request);
      request.onsuccess?.();
      this.pending -= 1;
      if (this.pending === 0) {
        queueMicrotask(() => this.oncomplete?.());
      }
    });
    return request;
  }
}

class FakeDatabase {
  readonly stores = new Map<string, FakeStore>();

  constructor(readonly name: string) {}

  get objectStoreNames() {
    const names = [...this.stores.keys()];
    return {
      length: names.length,
      contains: (name: string) => names.includes(name),
      item: (index: number) => names[index] ?? null,
    };
  }

  createObjectStore(name: string, options?: { keyPath?: string }) {
    const store = new FakeStore(name, options?.keyPath ?? "id");
    this.stores.set(name, store);
    return {
      name,
      createIndex: (indexName: string, keyPath: string) => {
        store.indexes.set(indexName, keyPath);
        return { name: indexName };
      },
    };
  }

  transaction(name: string) {
    const store = this.stores.get(name);
    if (!store) throw new Error(`no object store ${name}`);
    return new FakeTransaction(store);
  }

  close() {
    // noop
  }
}

function createFakeIndexedDb() {
  const databases = new Map<string, FakeDatabase>();
  const indexedDB = {
    open(name: string) {
      const request = new FakeRequest<FakeDatabase>();
      let db = databases.get(name);
      const created = !db;
      if (!db) {
        db = new FakeDatabase(name);
        databases.set(name, db);
      }
      request.result = db;
      queueMicrotask(() => {
        if (created) request.onupgradeneeded?.();
        request.onsuccess?.();
      });
      return request;
    },
  };
  const storedRows = () => {
    const db = databases.get("ferroscale-snapshots");
    const store = db?.stores.get("snapshots");
    return store ? [...store.rows.values()] : [];
  };
  return { indexedDB, storedRows };
}

function toBytes(data: BufferSource): Uint8Array<ArrayBuffer> {
  const view = ArrayBuffer.isView(data)
    ? new Uint8Array(data.buffer as ArrayBuffer, data.byteOffset, data.byteLength)
    : new Uint8Array(data);
  return new Uint8Array(view);
}

/**
 * WebCrypto with the PBKDF2 stretch replaced by a hash. The salt still
 * decides the key and the ciphertext is still real AES-GCM, but a test that
 * writes a dozen snapshots does not spend ten seconds on the derivation.
 */
function createTestCrypto(): Crypto {
  const rawByKey = new WeakMap<CryptoKey, Uint8Array<ArrayBuffer>>();
  const subtle = webcrypto.subtle as unknown as SubtleCrypto;

  const fakeSubtle = {
    encrypt: (algorithm: AlgorithmIdentifier | AesGcmParams, key: CryptoKey, data: BufferSource) =>
      subtle.encrypt(algorithm, key, data),
    decrypt: (algorithm: AlgorithmIdentifier | AesGcmParams, key: CryptoKey, data: BufferSource) =>
      subtle.decrypt(algorithm, key, data),
    digest: (algorithm: AlgorithmIdentifier, data: BufferSource) => subtle.digest(algorithm, data),
    importKey: async (
      format: string,
      keyData: BufferSource,
      algorithm: unknown,
      extractable: boolean,
      keyUsages: string[],
    ): Promise<CryptoKey> => {
      const bytes = toBytes(keyData);
      const key = await subtle.importKey(
        "raw",
        bytes,
        algorithm as AlgorithmIdentifier,
        extractable,
        keyUsages as KeyUsage[],
      );
      rawByKey.set(key, bytes);
      return key;
    },
    deriveKey: async (
      algorithm: unknown,
      baseKey: CryptoKey,
      derivedKeyType: unknown,
      extractable: boolean,
      keyUsages: string[],
    ): Promise<CryptoKey> => {
      const bytes = rawByKey.get(baseKey);
      if (!bytes) throw new Error("no key material for this base key");
      const stretched = await subtle.digest("SHA-256", bytes);
      return subtle.importKey(
        "raw",
        stretched,
        derivedKeyType as AlgorithmIdentifier,
        extractable,
        keyUsages as KeyUsage[],
      );
    },
  };

  return {
    getRandomValues: webcrypto.getRandomValues.bind(webcrypto),
    randomUUID: webcrypto.randomUUID.bind(webcrypto),
    subtle: fakeSubtle,
  } as unknown as Crypto;
}

const testCrypto = createTestCrypto();

let storedRows: () => FakeRow[] = () => [];

beforeEach(() => {
  vi.stubGlobal("crypto", testCrypto);
  const fake = createFakeIndexedDb();
  storedRows = fake.storedRows;
  vi.stubGlobal("indexedDB", fake.indexedDB);
  mocks.persistSavedEntries.mockClear();
  mocks.persistProjects.mockClear();
  mocks.persistCustomers.mockClear();
  mocks.persistCompareItems.mockClear();
  mocks.persistPriceBook.mockClear();
  mocks.persistQuickHistory.mockClear();
  mocks.notifyCollectionsReplaced.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the snapshot ring", () => {
  it("evicts the oldest auto snapshot once the ring is full", async () => {
    const ids: string[] = [];
    for (let i = 0; i < 11; i++) {
      ids.push(await writeLocalSnapshot("auto"));
    }

    const ring = await listLocalSnapshots();
    expect(ring).toHaveLength(10);
    expect(ids.every((id) => id.length > 0)).toBe(true);
    expect(ring.map((snapshot) => snapshot.id)).not.toContain(ids[0]);
    expect(ring.map((snapshot) => snapshot.id)).toContain(ids[10]);
  });

  it("never lets a rolling snapshot push a manual one out", async () => {
    const manual: string[] = [];
    for (let i = 0; i < 4; i++) {
      manual.push(await writeLocalSnapshot("manual"));
    }
    for (let i = 0; i < 11; i++) {
      await writeLocalSnapshot("auto");
    }

    const ring = await listLocalSnapshots();
    expect(ring.filter((snapshot) => snapshot.kind === "auto")).toHaveLength(10);
    expect(ring.filter((snapshot) => snapshot.kind === "manual")).toHaveLength(3);
    expect(ring.some((snapshot) => snapshot.id === manual[0])).toBe(false);
    expect(manual.slice(1).every((id) => ring.some((snapshot) => snapshot.id === id))).toBe(true);
  });

  it("lists the newest first", async () => {
    const first = await writeLocalSnapshot("auto");
    const second = await writeLocalSnapshot("auto");

    const ring = await listLocalSnapshots();
    expect(ring.map((snapshot) => snapshot.id)).toEqual([second, first]);
  });

  it("forgets a deleted snapshot and every snapshot on a clear", async () => {
    const id = await writeLocalSnapshot("auto");
    await writeLocalSnapshot("auto");

    await deleteLocalSnapshot(id);
    expect((await listLocalSnapshots()).map((snapshot) => snapshot.id)).not.toContain(id);

    await clearLocalSnapshots();
    expect(await listLocalSnapshots()).toEqual([]);
  });
});

describe("without IndexedDB", () => {
  it("returns safe empty values instead of throwing", async () => {
    vi.stubGlobal("indexedDB", undefined);

    await expect(writeLocalSnapshot("auto")).resolves.toBe("");
    await expect(listLocalSnapshots()).resolves.toEqual([]);
    await expect(readLocalSnapshot("anything")).resolves.toBeNull();
    await expect(restoreLocalSnapshot("anything")).resolves.toBe(false);
    await expect(deleteLocalSnapshot("anything")).resolves.toBeUndefined();
    await expect(clearLocalSnapshots()).resolves.toBeUndefined();
  });
});

describe("what a snapshot holds", () => {
  it("counts what it holds", async () => {
    await writeLocalSnapshot("auto");

    const [snapshot] = await listLocalSnapshots();
    expect(snapshot.summary).toEqual({
      saved: 2,
      projects: 1,
      customers: 3,
      compare: 4,
      history: 5,
    });
  });

  it("reads the collections back", async () => {
    const id = await writeLocalSnapshot("manual");

    const state = await readLocalSnapshot(id);
    expect(state?.saved).toEqual(mocks.saved);
    expect(state?.projects).toEqual(mocks.projects);
    expect(state?.customers).toEqual(mocks.customers);
    expect(state?.compare).toEqual(mocks.compare);
    expect(state?.quickHistory).toEqual(mocks.quickHistory);
    expect(state?.priceBook).toEqual(mocks.priceBook);
  });

  it("keeps the payload encrypted on disk", async () => {
    const id = await writeLocalSnapshot("auto");

    const [row] = storedRows();
    expect(row.id).toBe(id);
    expect(String(row.payload)).not.toContain("saved-1");
    expect(String(row.payload)).not.toContain("customer-1");
    // The salt that opens it is on this device and nowhere else.
    expect(localStorage.getItem("ferroscale-snapshot-salt-v1")).toBeTruthy();
  });

  it("restores the collections without marking them dirty", async () => {
    const id = await writeLocalSnapshot("auto");

    await expect(restoreLocalSnapshot(id)).resolves.toBe(true);
    expect(mocks.persistSavedEntries).toHaveBeenCalledWith(mocks.saved, { markDirty: false });
    expect(mocks.persistProjects).toHaveBeenCalledWith(mocks.projects, { markDirty: false });
    expect(mocks.persistCustomers).toHaveBeenCalledWith(mocks.customers, { markDirty: false });
    expect(mocks.persistCompareItems).toHaveBeenCalledWith(mocks.compare, { markDirty: false });
    expect(mocks.persistQuickHistory).toHaveBeenCalledWith(mocks.quickHistory, { markDirty: false });
    expect(mocks.persistPriceBook).toHaveBeenCalledWith(mocks.priceBook, { markDirty: false });
    expect(mocks.notifyCollectionsReplaced).toHaveBeenCalled();
  });

  it("refuses to restore a snapshot it does not have", async () => {
    await expect(restoreLocalSnapshot("nope")).resolves.toBe(false);
    expect(mocks.persistSavedEntries).not.toHaveBeenCalled();
  });
});

describe("selectSnapshotEvictions", () => {
  const snapshot = (id: string, at: number, kind: "auto" | "manual") => ({
    id,
    at,
    kind,
    summary: { saved: 0, projects: 0, customers: 0, compare: 0, history: 0 },
  });

  it("keeps the newest ones and drops the oldest past the cap", () => {
    const ring = Array.from({ length: 12 }, (_, index) => snapshot(`a${index}`, index, "auto"));
    expect(selectSnapshotEvictions(ring, "auto")).toEqual(["a0", "a1"]);
  });

  it("leaves a ring that is within its cap alone", () => {
    const ring = Array.from({ length: 10 }, (_, index) => snapshot(`a${index}`, index, "auto"));
    expect(selectSnapshotEvictions(ring, "auto")).toEqual([]);
  });

  it("counts each kind against its own cap", () => {
    const ring = [
      ...Array.from({ length: 11 }, (_, index) => snapshot(`a${index}`, index, "auto")),
      ...Array.from({ length: 4 }, (_, index) => snapshot(`m${index}`, 100 + index, "manual")),
    ];
    expect(selectSnapshotEvictions(ring, "auto")).toEqual(["a0"]);
    expect(selectSnapshotEvictions(ring, "manual")).toEqual(["m0"]);
  });
});
