import { and, eq, inArray, lt, sql, TransactionRollbackError } from "drizzle-orm";
import { replayLine } from "../app/domain/game-line";
import { MAX_MANUAL_RETRIES, MAX_PLIES } from "../app/domain/limits";
import type {
  Color,
  GameResult,
  GameSource,
  ImportMethod,
  OpponentType,
  PositionEvaluation,
  Termination,
} from "../app/domain/types";
import { failAnalysis } from "./analysis-store";
import { db } from "./db/client";
import { analyses, games, positionEvaluations } from "./db/schema";
import { env } from "./env";
import { hashToken, newGameId, newToken, tokenMatches } from "./ids";
import { enqueueAnalysis } from "./queue";
import { consume, RateLimitError, todayJst } from "./rate-limit";
import { wakeWorker } from "./worker-control";

export class InvalidGameError extends Error {}

export type NewGame = {
  startFen: string | null;
  moves: string[];
  playerColor: Color;
  gameSource: GameSource;
  importMethod: ImportMethod;
  opponentType: OpponentType;
  result: GameResult | null;
  termination: Termination | null;
  playedOn: string | null;
};

/** 入力を検証する。手順の合法性、手数の上限、Player が1手以上指しているか。 */
export function validateNewGame(game: NewGame): void {
  if (game.moves.length === 0) throw new InvalidGameError("no-moves");
  if (game.moves.length > MAX_PLIES) throw new InvalidGameError("too-long");
  let line: ReturnType<typeof replayLine>;
  try {
    line = replayLine(game.startFen, game.moves);
  } catch {
    throw new InvalidGameError("illegal");
  }
  const playerMoved = line
    .slice(0, -1)
    .some((p) => (p.fen.split(" ")[1] === "w" ? "white" : "black") === game.playerColor);
  if (!playerMoved) throw new InvalidGameError("player-no-moves");
}

export async function createGame(
  game: NewGame,
  client: { browserId: string; ip: string },
): Promise<{ id: string; token: string }> {
  validateNewGame(game);
  const id = newGameId();
  const token = newToken();
  const day = todayJst();
  const keys = [
    { scope: "browser" as const, key: client.browserId, limit: env.limits.perBrowserDaily },
    { scope: "ip" as const, key: client.ip, limit: env.limits.perIpDaily },
    { scope: "global" as const, key: "all", limit: env.limits.globalDaily },
  ];

  await db.transaction(async (tx) => {
    // 先に数える。global の行がロックされるので、続くキュー長の確認が直列になる。
    await consume(tx, keys, day);
    const [{ pending }] = await tx
      .select({ pending: sql<number>`count(*)::int` })
      .from(analyses)
      .where(inArray(analyses.status, ["queued", "running"]));
    if (pending >= env.limits.queueLength) throw new RateLimitError("queue");
    await tx.insert(games).values({ id, tokenHash: hashToken(token), ...game });
    await tx.insert(analyses).values({
      gameId: id,
      status: "queued",
      depth: env.engine.depth,
      multiPv: env.engine.multiPv,
      totalPositions: game.moves.length + 1,
      countedKeys: keys.map(({ scope, key }) => ({ scope, key })),
      countedOn: day,
    });
  });

  try {
    await enqueueAnalysis(id, game.moves.length + 1);
  } catch (e) {
    // ジョブを送れなければ失敗にして上限を戻す。画面から再試行できる。
    await failAnalysis(id, `enqueue: ${e instanceof Error ? e.message : String(e)}`);
    return { id, token };
  }
  void wakeWorker();
  return { id, token };
}

export async function getGame(id: string) {
  const [row] = await db
    .select()
    .from(games)
    .innerJoin(analyses, eq(analyses.gameId, games.id))
    .where(eq(games.id, id));
  return row ?? null;
}

export async function getEvaluations(id: string): Promise<PositionEvaluation[]> {
  const rows = await db
    .select()
    .from(positionEvaluations)
    .where(eq(positionEvaluations.gameId, id))
    .orderBy(positionEvaluations.ply);
  return rows.map((r) => ({ ply: r.ply, fen: r.fen, terminal: r.terminal, candidates: r.candidates }));
}

async function authorized(id: string, token: string): Promise<boolean> {
  const [row] = await db.select({ hash: games.tokenHash }).from(games).where(eq(games.id, id));
  return !!row && tokenMatches(token, row.hash);
}

export async function deleteGame(id: string, token: string): Promise<boolean> {
  if (!(await authorized(id, token))) return false;
  await db.delete(games).where(eq(games.id, id));
  return true;
}

/** Player Color を直す。両者の手を解析済みなので再解析は要らない（D29）。 */
export async function updatePlayerColor(id: string, token: string, color: Color): Promise<boolean> {
  if (!(await authorized(id, token))) return false;
  await db.update(games).set({ playerColor: color }).where(eq(games.id, id));
  return true;
}

/** 失敗した解析の手動再試行。日次上限には数えない（D44）。 */
export async function retryAnalysis(id: string): Promise<boolean> {
  const total = await db
    .transaction(async (tx): Promise<number | null> => {
      const [g] = await tx
        .update(games)
        .set({ manualRetries: sql`${games.manualRetries} + 1` })
        .where(and(eq(games.id, id), lt(games.manualRetries, MAX_MANUAL_RETRIES)))
        .returning({ id: games.id });
      if (!g) return null;
      const [a] = await tx
        .update(analyses)
        .set({ status: "queued", attempts: 0, error: null, queuedAt: new Date(), heartbeatAt: null })
        .where(and(eq(analyses.gameId, id), eq(analyses.status, "failed")))
        .returning({ total: analyses.totalPositions });
      // 失敗していなければ、再試行の回数も戻す。
      if (!a) tx.rollback();
      return a.total;
    })
    .catch((e) => {
      if (e instanceof TransactionRollbackError) return null;
      throw e;
    });
  if (total === null) return false;
  await enqueueAnalysis(id, total);
  void wakeWorker();
  return true;
}
