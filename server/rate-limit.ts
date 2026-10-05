import { sql } from "drizzle-orm";
import type { CountedKey } from "./db/schema";

/** 日次上限の「1日」は日本時間で区切る。 */
export function todayJst(now = new Date()): string {
  return now.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
}

/** IPv6 は /64 単位でまとめて数える（D32）。 */
export function ipKey(ip: string): string {
  const v4mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (v4mapped) return v4mapped[1];
  if (!ip.includes(":")) return ip;
  const [head, tail = ""] = ip.split("::");
  const h = head ? head.split(":") : [];
  const t = tail ? tail.split(":") : [];
  const full = [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill("0"), ...t];
  return `${full
    .slice(0, 4)
    .map((g) => g.toLowerCase().replace(/^0+(?=.)/, ""))
    .join(":")}::/64`;
}

/**
 * 利用者の IP。Fly のプロキシが付ける Fly-Client-IP だけを信じる。
 * X-Forwarded-For は偽装できるので、Fly の外（ローカル、CI）でだけ使う。
 */
export function clientIp(request: Request): string {
  const fly = request.headers.get("fly-client-ip");
  if (fly) return fly;
  if (!process.env.FLY_APP_NAME) {
    return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  }
  return "unknown";
}

export type LimitScope = "browser" | "ip" | "global";

export class RateLimitError extends Error {
  constructor(readonly scope: LimitScope | "queue") {
    super(`rate limited: ${scope}`);
  }
}

type Executor = { execute: (q: ReturnType<typeof sql>) => Promise<{ rows: unknown[] }> };

/** 上限に達していなければ1つ数える。達していれば RateLimitError（D32）。 */
export async function consume(
  tx: Executor,
  keys: (CountedKey & { scope: LimitScope; limit: number })[],
  day: string,
): Promise<void> {
  for (const k of keys) {
    const res = await tx.execute(sql`
      INSERT INTO rate_counters (scope, key, day, count) VALUES (${k.scope}, ${k.key}, ${day}, 1)
      ON CONFLICT (scope, key, day) DO UPDATE SET count = rate_counters.count + 1
      WHERE rate_counters.count < ${k.limit}
      RETURNING count`);
    if (res.rows.length === 0 || k.limit <= 0) throw new RateLimitError(k.scope);
  }
}

/** 最終的に失敗した解析の分を戻す（D44）。 */
export async function refund(tx: Executor, keys: CountedKey[], day: string): Promise<void> {
  for (const k of keys) {
    await tx.execute(sql`
      UPDATE rate_counters SET count = GREATEST(count - 1, 0)
      WHERE scope = ${k.scope} AND key = ${k.key} AND day = ${day}`);
  }
}
