import { and, eq, inArray, isNotNull, lt, sql } from "drizzle-orm";
import { estimateEtaMinutes } from "../app/domain/eta";
import { failAnalysis } from "./analysis-store";
import { db } from "./db/client";
import { type AnalysisStatus, analyses } from "./db/schema";

export type AnalysisProgress = {
  status: AnalysisStatus;
  done: number;
  total: number;
  /** 自分より前に並んでいる Game の数（D48）。 */
  ahead: number;
  etaMinutes: number | null;
  engine: { name: string | null; depth: number; multiPv: number };
  error: string | null;
};

/** 進み具合が止まった running を失敗扱いにする閾値（タイムアウト10分＋余裕）。 */
const STALE_MS = 12 * 60 * 1000;
/** 順番待ちのまま動きがない（ジョブを失った）解析を失敗扱いにする閾値。 */
const QUEUED_STALE_MS = 4 * 60 * 60 * 1000;

async function secondsPerPosition(): Promise<number | null> {
  const [row] = await db
    .select({
      spp: sql<
        number | null
      >`sum(extract(epoch from ${analyses.finishedAt} - ${analyses.startedAt})) / nullif(sum(${analyses.totalPositions}), 0)`,
    })
    .from(analyses)
    .where(and(eq(analyses.status, "done"), isNotNull(analyses.startedAt)));
  return row?.spp ? Number(row.spp) : null;
}

export async function getProgress(gameId: string): Promise<AnalysisProgress | null> {
  const [a] = await db.select().from(analyses).where(eq(analyses.gameId, gameId));
  if (!a) return null;

  const lastSeen = (a.heartbeatAt ?? a.queuedAt).getTime();
  const staleMs = a.status === "running" ? STALE_MS : QUEUED_STALE_MS;
  if ((a.status === "running" || a.status === "queued") && Date.now() - lastSeen > staleMs) {
    await failAnalysis(gameId, "stalled");
    a.status = "failed";
  }

  const base = {
    status: a.status,
    done: a.donePositions,
    total: a.totalPositions,
    engine: { name: a.engineName, depth: a.depth, multiPv: a.multiPv },
    error: a.error,
  };
  if (a.status === "done" || a.status === "failed") return { ...base, ahead: 0, etaMinutes: null };

  const [ahead] = await db
    .select({
      count: sql<number>`count(*)::int`,
      remaining: sql<number>`coalesce(sum(${analyses.totalPositions} - ${analyses.donePositions}), 0)::int`,
      running: sql<number>`count(*) filter (where ${analyses.status} = 'running')::int`,
    })
    .from(analyses)
    .where(and(inArray(analyses.status, ["queued", "running"]), lt(analyses.queuedAt, a.queuedAt)));

  return {
    ...base,
    ahead: ahead.count,
    etaMinutes: estimateEtaMinutes({
      positionsAhead: ahead.remaining,
      ownRemaining: a.totalPositions - a.donePositions,
      secondsPerPosition: await secondsPerPosition(),
      workerRunning: a.status === "running" || ahead.running > 0,
    }),
  };
}
