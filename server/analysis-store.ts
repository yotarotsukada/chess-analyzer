import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "./db/client";
import { analyses, games, positionEvaluations } from "./db/schema";
import { refund } from "./rate-limit";
import type { AnalysisStore } from "./worker/analyze";

export const dbAnalysisStore: AnalysisStore = {
  async loadGame(gameId) {
    const [g] = await db
      .select({ startFen: games.startFen, moves: games.moves })
      .from(games)
      .where(eq(games.id, gameId));
    return g ?? null;
  },
  async analyzedPlies(gameId) {
    const rows = await db
      .select({ ply: positionEvaluations.ply })
      .from(positionEvaluations)
      .where(eq(positionEvaluations.gameId, gameId));
    return new Set(rows.map((r) => r.ply));
  },
  async savePosition(gameId, e, done) {
    await db.transaction(async (tx) => {
      await tx
        .insert(positionEvaluations)
        .values({ gameId, ply: e.ply, fen: e.fen, terminal: e.terminal, candidates: e.candidates })
        .onConflictDoUpdate({
          target: [positionEvaluations.gameId, positionEvaluations.ply],
          set: { fen: e.fen, terminal: e.terminal, candidates: e.candidates },
        });
      await tx
        .update(analyses)
        .set({ donePositions: done, heartbeatAt: new Date() })
        .where(eq(analyses.gameId, gameId));
    });
  },
};

/** 解析の開始を記録する。Game が消えたか、もう解析中でなければ null。 */
export async function markStarted(gameId: string, engineName: string): Promise<number | null> {
  const [row] = await db
    .update(analyses)
    .set({
      status: "running",
      engineName,
      attempts: sql`${analyses.attempts} + 1`,
      startedAt: new Date(),
      heartbeatAt: new Date(),
    })
    // 失敗や完了にした解析を、残っていたリトライで running に戻さない。
    .where(and(eq(analyses.gameId, gameId), inArray(analyses.status, ["queued", "running"])))
    .returning({ attempts: analyses.attempts });
  return row?.attempts ?? null;
}

export async function markDone(gameId: string): Promise<void> {
  await db
    .update(analyses)
    .set({ status: "done", finishedAt: new Date(), error: null })
    .where(and(eq(analyses.gameId, gameId), eq(analyses.status, "running")));
}

/** 再試行を待つ状態に戻す（pg-boss がリトライする）。 */
export async function markRetrying(gameId: string, error: string): Promise<void> {
  await db
    .update(analyses)
    .set({ status: "queued", error })
    .where(and(eq(analyses.gameId, gameId), eq(analyses.status, "running")));
}

/** 最終的な失敗。日次上限の分を戻し、二重に戻さないよう記録を消す（D44）。 */
export async function failAnalysis(gameId: string, error: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [a] = await tx
      .select({ keys: analyses.countedKeys, day: analyses.countedOn })
      .from(analyses)
      .where(and(eq(analyses.gameId, gameId), inArray(analyses.status, ["queued", "running"])))
      .for("update");
    // 完了や失敗が確定した解析は上書きしない。
    if (!a) return;
    if (a.day && a.keys.length) await refund(tx, a.keys, a.day);
    await tx
      .update(analyses)
      .set({ status: "failed", error, countedKeys: [], finishedAt: new Date() })
      .where(eq(analyses.gameId, gameId));
  });
  console.error(`[analysis] failed game=${gameId} error=${error}`);
}
