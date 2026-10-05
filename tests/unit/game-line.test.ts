import { describe, expect, it } from "vitest";
import { IllegalMoveError, replayLine, toEpd, uciLineToSan } from "~/domain/game-line";

describe("replayLine", () => {
  it("returns every position including the start", () => {
    const line = replayLine(null, ["e2e4", "e7e5"]);
    expect(line).toHaveLength(3);
    expect(line[1].move).toEqual({ uci: "e2e4", san: "e4" });
    expect(line[0].terminal).toBeNull();
  });

  it("detects checkmate (D46)", () => {
    const line = replayLine(null, ["f2f3", "e7e5", "g2g4", "d8h4"]);
    expect(line.at(-1)?.terminal).toBe("checkmate");
  });

  it("detects stalemate", () => {
    const line = replayLine("7k/5Q2/6K1/8/8/8/8/8 w - - 0 1", ["f7f6"]);
    expect(line.at(-1)?.terminal).toBeNull();
    const stale = replayLine("7k/8/6K1/8/8/8/8/5Q2 w - - 0 1", ["f1f7"]);
    expect(stale.at(-1)?.terminal).toBe("stalemate");
  });

  it("detects threefold repetition from history", () => {
    const shuffle = ["g1f3", "g8f6", "f3g1", "f6g8", "g1f3", "g8f6", "f3g1", "f6g8"];
    expect(replayLine(null, shuffle).at(-1)?.terminal).toBe("repetition");
  });

  it("lets a game continue after an unclaimed repetition", () => {
    const shuffle = ["g1f3", "g8f6", "f3g1", "f6g8", "g1f3", "g8f6", "f3g1", "f6g8", "d2d4"];
    const line = replayLine(null, shuffle);
    expect(line.every((p) => p.terminal === null)).toBe(true);
  });

  it("rejects illegal moves and moves after the end", () => {
    expect(() => replayLine(null, ["e2e5"])).toThrow(IllegalMoveError);
    expect(() => replayLine(null, ["f2f3", "e7e5", "g2g4", "d8h4", "a2a3"])).toThrow(IllegalMoveError);
  });

  it("handles promotion", () => {
    const line = replayLine("8/P6k/8/8/8/8/8/K7 w - - 0 1", ["a7a8q"]);
    expect(line[1].move?.san).toBe("a8=Q");
  });
});

describe("helpers", () => {
  it("converts UCI lines to SAN and stops at illegal moves", () => {
    const start = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    expect(uciLineToSan(start, ["e2e4", "e7e5", "g1f3"], 2)).toEqual(["e4", "e5"]);
    expect(uciLineToSan(start, ["e2e4", "e2e4"])).toEqual(["e4"]);
  });

  it("builds EPD", () => {
    expect(toEpd("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1")).toBe(
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -",
    );
  });
});
