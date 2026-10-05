import type { Score } from "../../app/domain/types";
import type { EngineLine } from "./types";

/** UCI の `info` 行を解析する。MultiPV の行でなければ null。 */
export function parseInfoLine(line: string): (EngineLine & { depth: number }) | null {
  if (!line.startsWith("info ") || !line.includes(" pv ")) return null;
  const tokens = line.split(" ");
  let depth = 0;
  let multipv = 1;
  let score: Score | null = null;
  let pv: string[] = [];
  for (let i = 1; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === "depth") depth = Number(tokens[++i]);
    else if (t === "multipv") multipv = Number(tokens[++i]);
    else if (t === "score") {
      const kind = tokens[++i];
      const value = Number(tokens[++i]);
      if (kind === "cp" || kind === "mate") score = { type: kind, value };
      // lowerbound / upperbound の行は確定値ではないので捨てる。
      if (tokens[i + 1] === "lowerbound" || tokens[i + 1] === "upperbound") return null;
    } else if (t === "pv") {
      pv = tokens.slice(i + 1);
      break;
    }
  }
  if (!score || pv.length === 0) return null;
  return { depth, multipv, score, pv };
}
