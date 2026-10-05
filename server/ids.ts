import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** 共有 URL に使う、推測されにくい ID（約71ビット）。 */
export function newGameId(): string {
  const bytes = randomBytes(12);
  return Array.from(bytes, (b) => ALPHABET[b % 62]).join("");
}

/** 編集トークン（ADR 0005）。 */
export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function tokenMatches(token: string, hash: string): boolean {
  const a = Buffer.from(hashToken(token), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function isGameId(id: string): boolean {
  return /^[0-9A-Za-z]{12}$/.test(id);
}
