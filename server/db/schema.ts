import { date, integer, jsonb, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import type {
  CandidateMove,
  GameResult,
  GameSource,
  ImportMethod,
  OpponentType,
  TerminalKind,
  Termination,
} from "../../app/domain/types";

export const games = pgTable("games", {
  id: text("id").primaryKey(),
  /** 編集トークンの SHA-256（ADR 0005）。トークン自体は保存しない。 */
  tokenHash: text("token_hash").notNull(),
  startFen: text("start_fen"),
  /** 指し手（UCI）。PGN の原文は保存しない（D40）。 */
  moves: jsonb("moves").$type<string[]>().notNull(),
  playerColor: text("player_color").$type<"white" | "black">().notNull(),
  gameSource: text("game_source").$type<GameSource>().notNull(),
  importMethod: text("import_method").$type<ImportMethod>().notNull(),
  opponentType: text("opponent_type").$type<OpponentType>().notNull().default("unknown"),
  result: text("result").$type<GameResult>(),
  termination: text("termination").$type<Termination>(),
  playedOn: date("played_on"),
  manualRetries: integer("manual_retries").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AnalysisStatus = "queued" | "running" | "done" | "failed";

export const analyses = pgTable("analyses", {
  /** Game ごとに最新の1件だけ持つ（D37）。 */
  gameId: text("game_id")
    .primaryKey()
    .references(() => games.id, { onDelete: "cascade" }),
  status: text("status").$type<AnalysisStatus>().notNull(),
  engineName: text("engine_name"),
  depth: integer("depth").notNull(),
  multiPv: integer("multi_pv").notNull(),
  totalPositions: integer("total_positions").notNull(),
  donePositions: integer("done_positions").notNull().default(0),
  attempts: integer("attempts").notNull().default(0),
  /** 日次上限で数えたキー。最終的に失敗したら戻す（D44）。 */
  countedKeys: jsonb("counted_keys").$type<CountedKey[]>().notNull().default([]),
  countedOn: date("counted_on"),
  error: text("error"),
  queuedAt: timestamp("queued_at", { withTimezone: true }).notNull().defaultNow(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  heartbeatAt: timestamp("heartbeat_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

export type CountedKey = { scope: string; key: string };

export const positionEvaluations = pgTable(
  "position_evaluations",
  {
    gameId: text("game_id")
      .notNull()
      .references(() => analyses.gameId, { onDelete: "cascade" }),
    ply: integer("ply").notNull(),
    fen: text("fen").notNull(),
    terminal: text("terminal").$type<TerminalKind>(),
    candidates: jsonb("candidates").$type<CandidateMove[]>().notNull(),
  },
  (t) => [primaryKey({ columns: [t.gameId, t.ply] })],
);

export const rateCounters = pgTable(
  "rate_counters",
  {
    scope: text("scope").notNull(),
    key: text("key").notNull(),
    day: date("day").notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.scope, t.key, t.day] })],
);
