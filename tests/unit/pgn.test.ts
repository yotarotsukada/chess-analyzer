import { describe, expect, it } from "vitest";
import { normalizeTermination, PgnParseError, parsePgn } from "~/domain/pgn";

const CHESSCOM = `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.09.30"]
[White "RealName123"]
[Black "OtherPerson"]
[Result "0-1"]
[Termination "OtherPerson won by resignation"]
[Annotator "someone"]

1. e4 {[%clk 0:09:58]} e5 2. Nf3 $1 Nc6 {secret note} 3. Bc4 Nf6 0-1`;

describe("parsePgn (D40)", () => {
  it("keeps only moves and allowed headers", () => {
    const parsed = parsePgn(CHESSCOM);
    expect(parsed).toEqual({
      startFen: null,
      moves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "g8f6"],
      result: "0-1",
      date: "2026-09-30",
      termination: "resignation",
    });
    expect(JSON.stringify(parsed)).not.toMatch(/RealName|OtherPerson|secret|someone/);
  });

  it("accepts a SetUp/FEN start (D36)", () => {
    const parsed = parsePgn(`[SetUp "1"]
[FEN "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1"]

1. e4 Kd7 *`);
    expect(parsed.startFen).toBe("4k3/8/8/8/8/8/4P3/4K3 w - - 0 1");
    expect(parsed.moves).toEqual(["e2e4", "e8d7"]);
    expect(parsed.result).toBeNull();
  });

  it("rejects garbage and empty games", () => {
    expect(() => parsePgn("hello world")).toThrow(PgnParseError);
    expect(() => parsePgn('[Event "x"]\n\n*')).toThrow(PgnParseError);
  });
});

describe("normalizeTermination (D47)", () => {
  it.each([
    ["Player won by resignation", "resignation"],
    ["Time forfeit", "timeout"],
    ["Player won on time", "timeout"],
    ["Game drawn by agreement", "agreement"],
    ["Normal", "other"],
    [undefined, null],
  ])("%s → %s", (raw, expected) => {
    expect(normalizeTermination(raw)).toBe(expected);
  });
});
