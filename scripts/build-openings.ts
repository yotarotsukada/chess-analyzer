/**
 * lichess-org/chess-openings（CC0）から、EPD → オープニング名の辞書を作る（D38）。
 * 使い方: pnpm openings:build
 */
import { writeFileSync } from "node:fs";
import { Chess } from "chess.js";
import { toEpd } from "../app/domain/game-line";

const BASE = "https://raw.githubusercontent.com/lichess-org/chess-openings/master";
const out: Record<string, [string, string]> = {};

for (const file of ["a", "b", "c", "d", "e"]) {
  const tsv = await (await fetch(`${BASE}/${file}.tsv`)).text();
  for (const row of tsv.trim().split("\n").slice(1)) {
    const [eco, name, pgn] = row.split("\t");
    const chess = new Chess();
    chess.loadPgn(pgn);
    out[toEpd(chess.fen())] = [eco, name];
  }
}

writeFileSync("server/openings/openings.json", `${JSON.stringify(out)}\n`);
console.log(`${Object.keys(out).length} positions`);
