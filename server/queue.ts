import { PgBoss } from "pg-boss";
import { env } from "./env";

export const ANALYZE_QUEUE = "analyze";
export type AnalyzeJob = { gameId: string };

const globalForBoss = globalThis as unknown as { __boss?: Promise<PgBoss> };

/**
 * pg-boss は Postgres 上のジョブキュー（ADR 0004）。
 * Web はジョブを送るだけなので、定期的なメンテナンスは止める。止めないと DB を叩き続け、
 * Neon の自動休止が効かなくなる。メンテナンスは Worker が動いている間だけ行う。
 */
export function getBoss(role: "web" | "worker" = "web"): Promise<PgBoss> {
  globalForBoss.__boss ??= (async () => {
    const boss = new PgBoss({
      connectionString: env.databaseUrl,
      supervise: role === "worker",
      schedule: false,
    });
    boss.on("error", (e) => console.error("[pg-boss]", e));
    await boss.start();
    await boss.createQueue(ANALYZE_QUEUE, { retryLimit: env.worker.retryLimit });
    return boss;
  })();
  return globalForBoss.__boss;
}

/** タイムアウトは10分を基本に、長い Game では局面数に合わせて延ばす（D44）。 */
export function jobTimeoutSeconds(positions: number): number {
  return Math.max(env.worker.jobTimeoutSeconds, positions * 8);
}

export async function enqueueAnalysis(gameId: string, positions: number): Promise<void> {
  const boss = await getBoss();
  await boss.send(ANALYZE_QUEUE, { gameId } satisfies AnalyzeJob, {
    retryLimit: env.worker.retryLimit,
    expireInSeconds: jobTimeoutSeconds(positions),
  });
}
