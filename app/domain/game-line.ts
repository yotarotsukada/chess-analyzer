import { Chess, DEFAULT_POSITION } from "chess.js";
import type { TerminalKind } from "./types";

export { DEFAULT_POSITION };

export type LinePosition = {
  ply: number;
  fen: string;
  /** この局面に至った手（ply 0 は null）。 */
  move: { uci: string; san: string } | null;
  terminal: TerminalKind | null;
};

export class IllegalMoveError extends Error {
  constructor(
    readonly ply: number,
    readonly uci: string,
  ) {
    super(`illegal move at ply ${ply}: ${uci}`);
  }
}

function uciToMoveArg(uci: string) {
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.length > 4 ? uci.slice(4, 5) : undefined,
  };
}

/** chess.js が手順の履歴を持っている前提で、終局の種類を判定する（D46）。 */
export function terminalKind(chess: Chess): TerminalKind | null {
  if (chess.isCheckmate()) return "checkmate";
  if (chess.isStalemate()) return "stalemate";
  if (chess.isInsufficientMaterial()) return "insufficient";
  if (chess.isThreefoldRepetition()) return "repetition";
  if (chess.isDrawByFiftyMoves()) return "fifty-move";
  return null;
}

/** 千日手と50手ルールは申告して初めて引き分けになるので、局面のあとに手が続いてもよい。 */
const CLAIMABLE: ReadonlySet<TerminalKind> = new Set(["repetition", "fifty-move"]);

/**
 * 開始局面から手順を再生し、全局面を返す。
 * 詰み・ステイルメイト・駒不足のあとに手が続く場合は IllegalMoveError。
 * 千日手と50手ルールは、最後の局面のときだけ終局として扱う（D46）。
 */
export function replayLine(startFen: string | null, uciMoves: string[]): LinePosition[] {
  const chess = new Chess(startFen ?? DEFAULT_POSITION);
  const positions: LinePosition[] = [{ ply: 0, fen: chess.fen(), move: null, terminal: terminalKind(chess) }];
  uciMoves.forEach((uci, i) => {
    const ply = i + 1;
    const prev = positions[i];
    if (prev.terminal && !CLAIMABLE.has(prev.terminal)) throw new IllegalMoveError(ply, uci);
    if (prev.terminal) prev.terminal = null;
    let san: string;
    try {
      san = chess.move(uciToMoveArg(uci)).san;
    } catch {
      throw new IllegalMoveError(ply, uci);
    }
    positions.push({ ply, fen: chess.fen(), move: { uci, san }, terminal: terminalKind(chess) });
  });
  return positions;
}

/** 局面から UCI の手順を SAN に変換する。不正な手に当たったらそこで打ち切る。 */
export function uciLineToSan(fen: string, uciMoves: string[], limit = uciMoves.length): string[] {
  const chess = new Chess(fen);
  const sans: string[] = [];
  for (const uci of uciMoves.slice(0, limit)) {
    try {
      sans.push(chess.move(uciToMoveArg(uci)).san);
    } catch {
      break;
    }
  }
  return sans;
}

export function sideToMove(fen: string): "white" | "black" {
  return fen.split(" ")[1] === "b" ? "black" : "white";
}

/** 定跡の照合に使う EPD（FEN の先頭4フィールド）。 */
export function toEpd(fen: string): string {
  return fen.split(" ").slice(0, 4).join(" ");
}
