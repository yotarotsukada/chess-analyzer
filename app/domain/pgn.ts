import { Chess, DEFAULT_POSITION } from "chess.js";
import type { GameResult, Termination } from "./types";

export type ParsedPgn = {
  startFen: string | null;
  moves: string[];
  result: GameResult | null;
  /** YYYY-MM-DD。不明なら null。 */
  date: string | null;
  termination: Termination | null;
};

export class PgnParseError extends Error {}

/**
 * Termination ヘッダーを4値に正規化する（D47）。
 * 元の文字列（ユーザー名を含むことがある）は保持しない。
 */
export function normalizeTermination(raw: string | undefined): Termination | null {
  if (!raw) return null;
  if (/resign/i.test(raw)) return "resignation";
  if (/time|forfeit/i.test(raw)) return "timeout";
  if (/agree/i.test(raw)) return "agreement";
  return "other";
}

function normalizeResult(raw: string | undefined): GameResult | null {
  return raw === "1-0" || raw === "0-1" || raw === "1/2-1/2" ? raw : null;
}

function normalizeDate(raw: string | undefined): string | null {
  const m = raw?.match(/^(\d{4})\.(\d{2})\.(\d{2})$/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/**
 * 貼り付けられた PGN を解析し、許可したヘッダーだけを取り出す（D40）。
 * 指し手中のコメントや NAG、名前などのヘッダーは結果に残らない。
 */
export function parsePgn(text: string): ParsedPgn {
  const chess = new Chess();
  try {
    chess.loadPgn(text.trim());
  } catch (e) {
    throw new PgnParseError(e instanceof Error ? e.message : "invalid PGN");
  }
  const headers = chess.getHeaders();
  const moves = chess.history({ verbose: true }).map((m) => m.lan);
  if (moves.length === 0) throw new PgnParseError("no moves");
  const fen = headers.SetUp === "1" && headers.FEN ? headers.FEN : null;
  return {
    startFen: fen && fen !== DEFAULT_POSITION ? fen : null,
    moves,
    result: normalizeResult(headers.Result),
    date: normalizeDate(headers.Date),
    termination: normalizeTermination(headers.Termination),
  };
}
