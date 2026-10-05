import { describe, expect, it } from "vitest";
import { replayLine } from "~/domain/game-line";
import { buildReview } from "~/domain/review";
import type { PositionEvaluation, Score } from "~/domain/types";

/** 局面ごとに、手番側から見た最善の評価と最善手を与えて Position Evaluation を作る。 */
function evals(startFen: string | null, moves: string[], spec: [Score, string[]][]): PositionEvaluation[] {
  return replayLine(startFen, moves).map((p, i) => ({
    ply: p.ply,
    fen: p.fen,
    terminal: p.terminal,
    candidates: p.terminal ? [] : [{ uci: spec[i][1][0], san: "?", score: spec[i][0], pv: spec[i][1] }],
  }));
}

const cp = (value: number): Score => ({ type: "cp", value });

describe("buildReview", () => {
  // 1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6?? 4. Qxf7#
  const moves = ["e2e4", "e7e5", "d1h5", "b8c6", "f1c4", "g8f6", "h5f7"];
  const spec: [Score, string[]][] = [
    [cp(30), ["e2e4", "e7e5"]],
    [cp(-30), ["e7e5"]],
    [cp(30), ["g1f3"]],
    [cp(-60), ["b8c6"]],
    [cp(60), ["f1c4"]],
    [cp(-70), ["g7g6", "h5f3"]],
    [{ type: "mate", value: 1 }, ["h5f7"]],
    [cp(0), []],
  ];

  it("classifies the blunder from the mover's point of view (D27)", () => {
    const review = buildReview({ startFen: null, moves, playerColor: "black", evaluations: evals(null, moves, spec) });
    const nf6 = review.moves[5];
    expect(nf6.san).toBe("Nf6");
    expect(nf6.isPlayerMove).toBe(true);
    expect(nf6.classification).toBe("blunder");
    expect(review.moves[0].classification).toBeNull();
    expect(review.finalTerminal).toBe("checkmate");
    expect(review.finalCandidates).toBeNull();
  });

  it("reports scores from the Player's point of view", () => {
    const review = buildReview({ startFen: null, moves, playerColor: "black", evaluations: evals(null, moves, spec) });
    // 黒の Player から見ると、白が +60 の局面は −60。
    expect(review.moves[4].candidates?.[0].playerScore).toEqual(cp(-60));
    expect(review.moves[5].candidates?.[0].playerScore).toEqual(cp(-70));
  });

  it("marks the Played Move rank and builds its variation from the next PV (D28)", () => {
    const review = buildReview({ startFen: null, moves, playerColor: "white", evaluations: evals(null, moves, spec) });
    expect(review.moves[0].playedRank).toBe(0);
    expect(review.moves[2].playedRank).toBeNull();
    expect(review.moves[5].playedVariation).toEqual(["Nf6", "Qxf7#"]);
  });

  it("marks book moves only while the line stays in the book and the move is accurate (D38)", () => {
    const book = new Set([
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -",
      "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -",
    ]);
    const review = buildReview({
      startFen: null,
      moves,
      playerColor: "white",
      evaluations: evals(null, moves, spec),
      openingLookup: (epd) => (book.has(epd) ? { eco: "C20", name: "King's Pawn Game" } : null),
    });
    expect(review.moves[0].isBook).toBe(true);
    expect(review.moves[1].isBook).toBe(true);
    expect(review.moves[2].isBook).toBe(false);
    expect(review.moves[2].opening?.name).toBe("King's Pawn Game");
  });

  it("does not let a blunder hide behind the book", () => {
    // 1. e4 は候補手に入っておらず、指した後の局面は黒が +400。
    const blunderSpec = spec.map((s, i) =>
      i === 0 ? ([cp(30), ["d2d4"]] as [Score, string[]]) : i === 1 ? ([cp(400), ["e7e5"]] as [Score, string[]]) : s,
    );
    const review = buildReview({
      startFen: null,
      moves,
      playerColor: "white",
      evaluations: evals(null, moves, blunderSpec),
      openingLookup: () => ({ eco: "C20", name: "x" }),
    });
    expect(review.moves[0].isBook).toBe(false);
    expect(review.moves[0].classification).toBe("blunder");
  });

  it("never classifies a move the engine itself listed first", () => {
    // 指す前の探索では +200、指した後の局面を別に探索すると +90（浅い探索のぶれ）。
    const ms = ["e2e4", "e7e5"];
    const review = buildReview({
      startFen: null,
      moves: ms,
      playerColor: "white",
      evaluations: evals(null, ms, [
        [cp(200), ["e2e4"]],
        [cp(-90), ["e7e5"]],
        [cp(90), ["g1f3"]],
      ]),
    });
    expect(review.moves[0].playedRank).toBe(0);
    expect(review.moves[0].drop).toBe(0);
    expect(review.moves[0].classification).toBeNull();
    expect(review.moves[0].playedScore).toEqual(cp(200));
  });

  it("never classifies a mating move, even outside the candidates", () => {
    const ms = ["f2f3", "e7e5", "g2g4", "d8h4"];
    const review = buildReview({
      startFen: null,
      moves: ms,
      playerColor: "black",
      evaluations: evals(null, ms, [
        [cp(0), ["e2e4"]],
        [cp(-50), ["e7e5"]],
        [cp(-60), ["d2d4"]],
        [{ type: "mate", value: 1 }, ["d8e7"]], // 実際の詰み手 Qh4# を候補に入れない
        [cp(0), []],
      ]),
    });
    const qh4 = review.moves[3];
    expect(qh4.san).toBe("Qh4#");
    expect(qh4.playedRank).toBeNull();
    expect(qh4.drop).toBe(0);
    expect(qh4.classification).toBeNull();
    expect(qh4.playedScore).toBeNull();
  });

  it("works with partial analysis", () => {
    const partial = evals(null, moves, spec).slice(0, 3);
    const review = buildReview({ startFen: null, moves, playerColor: "white", evaluations: partial });
    expect(review.moves[0].classification).toBeNull();
    expect(review.moves[0].drop).not.toBeNull();
    expect(review.moves[4].candidates).toBeNull();
    expect(review.analyzedPositions).toBe(3);
    expect(review.totalPositions).toBe(8);
  });

  it("numbers moves from a FEN start where black moves first", () => {
    const fen = "4k3/8/8/8/8/8/4P3/4K3 b - - 0 12";
    const ms = ["e8d7", "e2e4"];
    const review = buildReview({
      startFen: fen,
      moves: ms,
      playerColor: "white",
      evaluations: evals(fen, ms, [
        [cp(0), ["e8d7"]],
        [cp(0), ["e2e4"]],
        [cp(0), ["d7d6"]],
      ]),
    });
    expect(review.moves.map((m) => [m.moveNumber, m.mover])).toEqual([
      [12, "black"],
      [13, "white"],
    ]);
  });
});
