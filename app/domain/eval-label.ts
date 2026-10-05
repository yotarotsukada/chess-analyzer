import type { Score } from "./types";
import { winningChances } from "./winning-chances";

export type EvalLevel = "winning" | "better" | "equal" | "worse" | "losing";

/** Player から見た評価を、言葉と色のための5段階にする（D9）。 */
export function evalLevel(playerScore: Score): EvalLevel {
  const wc = winningChances(playerScore);
  // 0.1 ≒ 55cp、0.35 ≒ 200cp。
  if (wc >= 0.35) return "winning";
  if (wc >= 0.1) return "better";
  if (wc > -0.1) return "equal";
  if (wc > -0.35) return "worse";
  return "losing";
}

/** 数値の表示（小さく添える用）。Player から見た値。 */
export function formatScore(playerScore: Score): string {
  if (playerScore.type === "mate") {
    return playerScore.value >= 0 ? `M${playerScore.value}` : `-M${-playerScore.value}`;
  }
  const pawns = playerScore.value / 100;
  const sign = pawns > 0 ? "+" : pawns < 0 ? "−" : "±";
  return `${sign}${Math.abs(pawns).toFixed(1)}`;
}
