import type { Engine, EngineSearch } from "@server/engine/types";
import { parseInfoLine } from "@server/engine/uci";
import { type AnalysisStore, analyzeGame } from "@server/worker/analyze";
import { describe, expect, it } from "vitest";
import type { PositionEvaluation } from "~/domain/types";

class StubEngine implements Engine {
  name = "stub";
  calls: EngineSearch[] = [];
  failAt: number | null = null;
  async newGame() {}
  async close() {}
  async analyze(search: EngineSearch) {
    if (this.failAt === search.moves.length) throw new Error("boom");
    this.calls.push(search);
    // 何か合法な手を返すため、次の実際の手を候補にする。
    const next = ["e2e4", "e7e5", "g1f3", "b8c6"][search.moves.length] ?? "a2a3";
    return [{ multipv: 1, score: { type: "cp" as const, value: 10 }, pv: [next] }];
  }
}

function memoryStore(moves: string[]) {
  const saved = new Map<number, PositionEvaluation>();
  const store: AnalysisStore = {
    loadGame: async () => ({ startFen: null, moves }),
    analyzedPlies: async () => new Set(saved.keys()),
    savePosition: async (_id, e) => {
      saved.set(e.ply, e);
    },
  };
  return { store, saved };
}

describe("analyzeGame", () => {
  it("analyzes every position and passes the move history (D46)", async () => {
    const { store, saved } = memoryStore(["e2e4", "e7e5", "g1f3"]);
    const engine = new StubEngine();
    expect(await analyzeGame(store, engine, "g", { depth: 6, multiPv: 3 })).toBe("done");
    expect(saved.size).toBe(4);
    expect(engine.calls.map((c) => c.moves)).toEqual([[], ["e2e4"], ["e2e4", "e7e5"], ["e2e4", "e7e5", "g1f3"]]);
    expect(saved.get(1)?.candidates[0].san).toBe("e5");
  });

  it("resumes from saved positions after a failure (D44)", async () => {
    const { store, saved } = memoryStore(["e2e4", "e7e5", "g1f3"]);
    const engine = new StubEngine();
    engine.failAt = 2;
    await expect(analyzeGame(store, engine, "g", { depth: 6, multiPv: 3 })).rejects.toThrow("boom");
    expect([...saved.keys()]).toEqual([0, 1]);
    engine.failAt = null;
    engine.calls = [];
    await analyzeGame(store, engine, "g", { depth: 6, multiPv: 3 });
    expect(engine.calls.map((c) => c.moves.length)).toEqual([2, 3]);
    expect(saved.size).toBe(4);
  });

  it("does not send terminal positions to the engine", async () => {
    const { store, saved } = memoryStore(["f2f3", "e7e5", "g2g4", "d8h4"]);
    const engine = new StubEngine();
    await analyzeGame(store, engine, "g", { depth: 6, multiPv: 3 });
    expect(engine.calls).toHaveLength(4);
    expect(saved.get(4)).toMatchObject({ terminal: "checkmate", candidates: [] });
  });

  it("returns missing for deleted games", async () => {
    const store: AnalysisStore = {
      loadGame: async () => null,
      analyzedPlies: async () => new Set(),
      savePosition: async () => {},
    };
    expect(await analyzeGame(store, new StubEngine(), "g", { depth: 1, multiPv: 1 })).toBe("missing");
  });
});

describe("parseInfoLine", () => {
  it("parses multipv lines", () => {
    expect(
      parseInfoLine("info depth 18 seldepth 24 multipv 2 score cp -35 nodes 1 nps 1 time 1 pv e7e5 g1f3 b8c6"),
    ).toEqual({ depth: 18, multipv: 2, score: { type: "cp", value: -35 }, pv: ["e7e5", "g1f3", "b8c6"] });
    expect(parseInfoLine("info depth 5 multipv 1 score mate -3 pv a2a3")?.score).toEqual({ type: "mate", value: -3 });
  });

  it("ignores bound and non-pv lines", () => {
    expect(parseInfoLine("info depth 18 multipv 1 score cp 20 lowerbound pv e2e4")).toBeNull();
    expect(parseInfoLine("info string NNUE enabled")).toBeNull();
  });
});
