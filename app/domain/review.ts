import { CLASSIFICATION_THRESHOLDS, classifyDrop } from "./classification";
import { DEFAULT_POSITION, replayLine, sideToMove, toEpd, uciLineToSan } from "./game-line";
import type { CandidateMove, Color, MoveClassification, PositionEvaluation, Score } from "./types";
import { negate, winningChances } from "./winning-chances";

/** Variation として見せる手数（D9）。 */
export const VARIATION_PLIES = 5;

export type Opening = { eco: string; name: string };
export type OpeningLookup = (epd: string) => Opening | null;

export type ReviewCandidate = {
  san: string;
  uci: string;
  /** Player から見た評価。 */
  playerScore: Score;
  variation: string[];
};

export type ReviewMove = {
  ply: number;
  moveNumber: number;
  mover: Color;
  san: string;
  uci: string;
  isPlayerMove: boolean;
  /** 指す前の局面の Candidate Move（未解析なら null）。 */
  candidates: ReviewCandidate[] | null;
  /** Played Move が Candidate Move の何番目か（0 始まり）。入っていなければ null。 */
  playedRank: number | null;
  /** 指した後の Player から見た評価。 */
  playedScore: Score | null;
  playedVariation: string[];
  /** 指した側から見た勝率の落ち幅（−1〜1 尺度）。 */
  drop: number | null;
  /** 計算は両者の手で行う（D29）。強調するかは UI 側で isPlayerMove を見る。 */
  classification: MoveClassification | null;
  isBook: boolean;
  /** この手の時点でのオープニング名。 */
  opening: Opening | null;
};

export type GameReview = {
  startFen: string;
  playerColor: Color;
  moves: ReviewMove[];
  /** 最後の局面（投了などで終わった局面）の Candidate Move。終局していれば空。 */
  finalCandidates: ReviewCandidate[] | null;
  finalTerminal: PositionEvaluation["terminal"];
  analyzedPositions: number;
  totalPositions: number;
};

/** 局面の評価を、その局面の手番側から見て返す。 */
export function positionScore(evaluation: PositionEvaluation): Score | null {
  if (evaluation.terminal === "checkmate") return { type: "mate", value: 0 };
  if (evaluation.terminal) return { type: "cp", value: 0 };
  return evaluation.candidates[0]?.score ?? null;
}

function toPlayer(score: Score, stm: Color, player: Color): Score {
  return stm === player ? score : negate(score);
}

function reviewCandidates(evaluation: PositionEvaluation, player: Color): ReviewCandidate[] {
  const stm = sideToMove(evaluation.fen);
  return evaluation.candidates.map((c: CandidateMove) => ({
    san: c.san,
    uci: c.uci,
    playerScore: toPlayer(c.score, stm, player),
    variation: uciLineToSan(evaluation.fen, c.pv, VARIATION_PLIES),
  }));
}

export function buildReview(input: {
  startFen: string | null;
  moves: string[];
  playerColor: Color;
  evaluations: PositionEvaluation[];
  openingLookup?: OpeningLookup;
}): GameReview {
  const line = replayLine(input.startFen, input.moves);
  const byPly = new Map(input.evaluations.map((e) => [e.ply, e]));
  const player = input.playerColor;
  const standardStart = !input.startFen || input.startFen === DEFAULT_POSITION;

  let inBook = standardStart;
  let opening: Opening | null = null;
  const moves: ReviewMove[] = [];

  for (let ply = 1; ply < line.length; ply++) {
    const before = line[ply - 1];
    const after = line[ply];
    const move = after.move!;
    const mover = sideToMove(before.fen);
    const evBefore = byPly.get(ply - 1) ?? null;
    const evAfter = byPly.get(ply) ?? null;

    const candidates = evBefore ? reviewCandidates(evBefore, player) : null;
    const rankIdx = evBefore ? evBefore.candidates.findIndex((c) => c.uci === move.uci) : -1;

    const scoreBefore = evBefore ? positionScore(evBefore) : null;
    // Played Move が Candidate Move に入っていれば、同じ探索の評価を使う。
    // 指した後の局面を別に探索した値と比べると、浅い探索では最善手でも落ち幅が出てしまう。
    // 詰ませた手は、指した側の勝率 100%（D46）。
    const deliveredMate = evAfter?.terminal === "checkmate" || after.terminal === "checkmate";
    const scoreAfterMover: Score | null = deliveredMate
      ? null
      : rankIdx >= 0 && evBefore
        ? evBefore.candidates[rankIdx].score
        : evAfter
          ? (() => {
              const s = positionScore(evAfter);
              return s ? negate(s) : null;
            })()
          : null;
    let drop: number | null = null;
    if (scoreBefore && (scoreAfterMover || deliveredMate)) {
      const wcAfter = deliveredMate ? 1 : winningChances(scoreAfterMover!);
      drop = Math.max(0, winningChances(scoreBefore) - wcAfter);
    }

    const bookHit = inBook && input.openingLookup ? input.openingLookup(toEpd(after.fen)) : null;
    if (bookHit) opening = bookHit;
    const isBook = bookHit !== null && (drop === null || drop < CLASSIFICATION_THRESHOLDS.inaccuracy);
    if (!bookHit) inBook = false;

    const playedScore = scoreAfterMover ? toPlayer(scoreAfterMover, mover, player) : null;
    const playedVariation = [
      move.san,
      ...(evAfter?.candidates[0] ? uciLineToSan(evAfter.fen, evAfter.candidates[0].pv, VARIATION_PLIES - 1) : []),
    ];

    moves.push({
      ply,
      moveNumber: Number(before.fen.split(" ")[5]),
      mover,
      san: move.san,
      uci: move.uci,
      isPlayerMove: mover === player,
      candidates,
      playedRank: rankIdx >= 0 ? rankIdx : null,
      playedScore,
      playedVariation,
      drop,
      classification: isBook || drop === null ? null : classifyDrop(drop),
      isBook,
      opening,
    });
  }

  const last = line[line.length - 1];
  const evLast = byPly.get(last.ply) ?? null;
  return {
    startFen: line[0].fen,
    playerColor: player,
    moves,
    finalCandidates: evLast && !evLast.terminal ? reviewCandidates(evLast, player) : null,
    finalTerminal: last.terminal,
    analyzedPositions: input.evaluations.length,
    totalPositions: line.length,
  };
}
