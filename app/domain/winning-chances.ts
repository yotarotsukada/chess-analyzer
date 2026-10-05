import type { Score } from "./types";

/** 詰みは ±1000cp 相当に換算する（D50）。 */
export const MATE_CP = 1000;

export function scoreToCp(score: Score): number {
  if (score.type === "mate") {
    // mate 0 は「手番側が詰まされている」。
    return score.value > 0 ? MATE_CP : -MATE_CP;
  }
  return Math.max(-MATE_CP, Math.min(MATE_CP, score.value));
}

/**
 * Lichess と同じロジスティック関数で、センチポーンを −1〜1 の勝率に換算する（D27）。
 * 値は評価を出した側（手番側）から見たもの。
 */
export function winningChances(score: Score): number {
  const cp = scoreToCp(score);
  return 2 / (1 + Math.exp(-0.00368208 * cp)) - 1;
}

export function negate(score: Score): Score {
  return { type: score.type, value: -score.value } as Score;
}
