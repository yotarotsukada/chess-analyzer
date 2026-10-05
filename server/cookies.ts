import { randomUUID } from "node:crypto";
import { createCookie } from "react-router";

/** ブラウザ単位の日次上限に使う ID（D32）。広告や解析には使わない。 */
export const browserIdCookie = createCookie("ca_bid", {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
});

export async function getBrowserId(request: Request): Promise<{ id: string; isNew: boolean }> {
  const existing = await browserIdCookie.parse(request.headers.get("Cookie"));
  if (typeof existing === "string" && /^[0-9a-f-]{36}$/.test(existing)) {
    return { id: existing, isNew: false };
  }
  return { id: randomUUID(), isNew: true };
}
