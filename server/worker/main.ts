import { and, inArray, sql } from "drizzle-orm";
import { dbAnalysisStore, failAnalysis, markDone, markRetrying, markStarted } from "../analysis-store";
import { db, pool } from "../db/client";
import { analyses } from "../db/schema";
import { StockfishEngine } from "../engine/stockfish";
import { env } from "../env";
import { ANALYZE_QUEUE, type AnalyzeJob, getBoss } from "../queue";
import { analyzeGame } from "./analyze";

/**
 * 解析 Worker。ジョブがある間だけ動き、解析待ちが空のまま WORKER_IDLE_EXIT_MS 経ったら終了する（D42）。
 * 同時に解析するのは1局だけ（D26）。
 */
const boss = await getBoss("worker");
const engine = await StockfishEngine.start(env.engine);
// Stockfish が落ちたら Worker ごと終了する。次のジョブで Web が起こし直す（D51）。
engine.onExit = (e) => {
  console.error("[worker] engine died", e.message);
  process.exit(1);
};
console.log(`[worker] ready engine="${engine.name}" depth=${env.engine.depth} multipv=${env.engine.multiPv}`);

let running = 0;
let lastActivity = Date.now();

await boss.work<AnalyzeJob>(ANALYZE_QUEUE, { batchSize: 1, pollingIntervalSeconds: 2 }, async ([job]) => {
  running++;
  const { gameId } = job.data;
  try {
    const attempts = await markStarted(gameId, engine.name);
    if (attempts === null) return; // Game が削除されたか、もう解析中でない
    try {
      const result = await analyzeGame(dbAnalysisStore, engine, gameId, { ...env.engine, signal: job.signal });
      if (result === "done") await markDone(gameId);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error(`[worker] game=${gameId} attempt=${attempts} ${message}`);
      if (attempts > env.worker.retryLimit) {
        await failAnalysis(gameId, message);
        return;
      }
      await markRetrying(gameId, message);
      throw e;
    }
  } finally {
    running--;
    lastActivity = Date.now();
  }
});

/**
 * 解析待ちの数は、キャッシュされた pg-boss の統計ではなく analyses から数える。
 * 長く動きのないもの（ジョブを失った解析）は数えない。数えると Worker が止まらず課金が続く。
 */
async function pendingCount(): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(analyses)
    .where(
      and(
        inArray(analyses.status, ["queued", "running"]),
        sql`coalesce(${analyses.heartbeatAt}, ${analyses.queuedAt}) > now() - interval '15 minutes'`,
      ),
    );
  return row.n;
}

const timer = setInterval(async () => {
  try {
    if (running > 0 || Date.now() - lastActivity < env.worker.idleExitMs) return;
    if ((await pendingCount()) > 0) {
      lastActivity = Date.now();
      return;
    }
    clearInterval(timer);
    console.log("[worker] idle, exiting");
    await boss.stop({ graceful: true });
    await engine.close();
    await pool.end();
    process.exit(0);
  } catch (e) {
    console.error("[worker] idle check failed", e);
  }
}, 10_000);

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, async () => {
    await boss.stop({ graceful: true, timeout: 5000 }).catch(() => {});
    await engine.close().catch(() => {});
    process.exit(0);
  });
}
