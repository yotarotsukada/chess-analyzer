import type { MoveClassification } from "./types";

/**
 * winningChances（−1〜1）の落ち幅のしきい値。0〜100% の尺度では 5 / 10 / 15 ポイント（D27）。
 */
export const CLASSIFICATION_THRESHOLDS = {
  inaccuracy: 0.1,
  mistake: 0.2,
  blunder: 0.3,
} as const;

/** 指した側から見た勝率の落ち幅から Move Classification を決める（D14）。 */
export function classifyDrop(drop: number): MoveClassification | null {
  if (drop >= CLASSIFICATION_THRESHOLDS.blunder) return "blunder";
  if (drop >= CLASSIFICATION_THRESHOLDS.mistake) return "mistake";
  if (drop >= CLASSIFICATION_THRESHOLDS.inaccuracy) return "inaccuracy";
  return null;
}
