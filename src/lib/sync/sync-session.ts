import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { SyncSessionPayload } from "./types";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

function getSyncSessionSecret() {
  return process.env.SYNC_SESSION_SECRET
    ?? process.env.SYNC_COOKIE_SECRET
    ?? process.env.GOOGLE_SYNC_COOKIE_SECRET
    ?? requireEnv("SYNC_SESSION_SECRET");
}

function toBase64Url(buffer: Uint8Array) {
  return Buffer.from(buffer)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  return Buffer.from(padded, "base64");
}

function getKeyMaterial() {
  return createHash("sha256").update(getSyncSessionSecret()).digest();
}

export function sealSyncSession(payload: SyncSessionPayload) {
  const key = getKeyMaterial();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map(toBase64Url).join(".");
}

export function unsealSyncSession(token: string): SyncSessionPayload {
  const [ivValue, tagValue, encryptedValue] = token.split(".");
  if (!ivValue || !tagValue || !encryptedValue) {
    throw new Error("Invalid sync session token");
  }

  const key = getKeyMaterial();
  const decipher = createDecipheriv("aes-256-gcm", key, fromBase64Url(ivValue));
  decipher.setAuthTag(fromBase64Url(tagValue));
  const decrypted = Buffer.concat([
    decipher.update(fromBase64Url(encryptedValue)),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString("utf8")) as SyncSessionPayload;
}
