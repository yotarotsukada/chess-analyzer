import { replayLine, uciLineToSan } from "../../app/domain/game-line";
import type { CandidateMove, PositionEvaluation } from "../../app/domain/types";
import type { Engine } from "../engine/types";

export interface AnalysisStore {
  loadGame(gameId: string): Promise<{ startFen: string | null; moves: string[] } | null>;
  analyzedPlies(gameId: string): Promise<Set<number>>;
  /** 冪等に保存する（同じ ply は上書き）。done は保存後の解析済み局面数。 */
  savePosition(gameId: string, evaluation: PositionEvaluation, done: number): Promise<void>;
}

export class AnalyzePositionError extends Error {
  constructor(
    readonly ply: number,
    readonly fen: string,
    readonly cause: unknown,
  ) {
    super(`ply ${ply} (${fen}): ${cause instanceof Error ? cause.message : String(cause)}`);
  }
}

export type AnalyzeOptions = { depth: number; multiPv: number; signal?: AbortSignal };

/**
 * Game の全局面を解析し、局面ごとに保存する（D39）。
 * 保存済みの局面は飛ばすので、再試行では続きから再開できる（D44）。
 */
export async function analyzeGame(
  store: AnalysisStore,
  engine: Engine,
  gameId: string,
  opts: AnalyzeOptions,
): Promise<"done" | "missing"> {
  const game = await store.loadGame(gameId);
  if (!game) return "missing";
  const line = replayLine(game.startFen, game.moves);
  const done = await store.analyzedPlies(gameId);
  await engine.newGame();

  for (const pos of line) {
    opts.signal?.throwIfAborted();
    if (done.has(pos.ply)) continue;
    let candidates: CandidateMove[] = [];
    // 終局した局面はエンジンに渡さない（D46）。
    if (!pos.terminal) {
      let lines: Awaited<ReturnType<Engine["analyze"]>>;
      try {
        lines = await engine.analyze({
          startFen: line[0].fen,
          moves: game.moves.slice(0, pos.ply),
          depth: opts.depth,
          multiPv: opts.multiPv,
          signal: opts.signal,
        });
      } catch (e) {
        // 原因を追えるよう、失敗した局面を記録する（D44）。
        throw new AnalyzePositionError(pos.ply, pos.fen, e);
      }
      candidates = lines.flatMap((l) => {
        const [san] = uciLineToSan(pos.fen, l.pv.slice(0, 1));
        return san ? [{ uci: l.pv[0], san, score: l.score, pv: l.pv }] : [];
      });
    }
    done.add(pos.ply);
    await store.savePosition(gameId, { ply: pos.ply, fen: pos.fen, terminal: pos.terminal, candidates }, done.size);
  }
  return "done";
}
