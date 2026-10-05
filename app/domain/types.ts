export type Color = "white" | "black";

export const GAME_SOURCES = ["duolingo", "lichess", "chesscom", "otb", "other"] as const;
export type GameSource = (typeof GAME_SOURCES)[number];

export const OPPONENT_TYPES = ["oscar", "human", "unknown"] as const;
export type OpponentType = (typeof OPPONENT_TYPES)[number];

export const IMPORT_METHODS = ["manual", "pgn"] as const;
export type ImportMethod = (typeof IMPORT_METHODS)[number];

export type GameResult = "1-0" | "0-1" | "1/2-1/2";

/** PGN の Termination を正規化した値（D47）。 */
export const TERMINATIONS = ["resignation", "timeout", "agreement", "other"] as const;
export type Termination = (typeof TERMINATIONS)[number];

/** 手番側から見たエンジンの評価。 */
export type Score = { type: "cp"; value: number } | { type: "mate"; value: number };

export type CandidateMove = {
  uci: string;
  san: string;
  score: Score;
  /** Candidate Move から始まる手順（UCI）。 */
  pv: string[];
};

/** 終局の局面の種類（D46）。エンジンには渡さない。 */
export type TerminalKind = "checkmate" | "stalemate" | "repetition" | "fifty-move" | "insufficient";

/** 1局面の解析結果（Position Evaluation）。 */
export type PositionEvaluation = {
  ply: number;
  fen: string;
  /** 終局の局面なら種類。Candidate Move は空になる。 */
  terminal: TerminalKind | null;
  candidates: CandidateMove[];
};

export type MoveClassification = "inaccuracy" | "mistake" | "blunder";
