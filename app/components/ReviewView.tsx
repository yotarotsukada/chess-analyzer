import { useEffect, useMemo, useRef, useState } from "react";
import { replayLine } from "~/domain/game-line";
import type { GameReview, ReviewCandidate, ReviewMove } from "~/domain/review";
import type { GameResult, Termination } from "~/domain/types";
import { t } from "~/i18n";
import { Board } from "./Board";
import { ClassTag, EvalTag } from "./EvalTag";

const CANDIDATE_ARROWS = ["rgba(53,107,85,0.95)", "rgba(53,107,85,0.6)", "rgba(53,107,85,0.35)"];
const PLAYED_ARROW = "rgba(194,69,59,0.85)";
const NAV_BUTTON = "rounded border border-line-strong bg-card px-4 py-1.5 disabled:opacity-40";

function arrowOf(uci: string, color: string) {
  return { startSquare: uci.slice(0, 2), endSquare: uci.slice(2, 4), color };
}

function CandidateRow({ c, rank, highlight }: { c: ReviewCandidate; rank: number; highlight: boolean }) {
  return (
    <li className={`flex flex-col gap-1 rounded-lg p-3 ${highlight ? "bg-green/10 ring-1 ring-green" : "bg-card"}`}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="w-5 text-sm text-muted">{rank}.</span>
        <span className="font-bold">{c.san}</span>
        <EvalTag score={c.playerScore} />
      </div>
      <p className="pl-8 text-sm text-muted">{c.variation.join(" ")}</p>
    </li>
  );
}

function MoveDetail({ move, analysisFailed }: { move: ReviewMove; analysisFailed: boolean }) {
  return (
    <section className="flex flex-col gap-3" data-testid="move-detail" aria-live="polite">
      <h2 className="flex flex-wrap items-center gap-2 text-xl font-bold">
        {t("review.title", { n: move.moveNumber, color: t(move.mover === "white" ? "new.white" : "new.black") })}
        <span>{move.san}</span>
        {move.isPlayerMove && move.classification ? <ClassTag value={move.classification} /> : null}
        {move.isBook ? <span className="rounded bg-paper-2 px-1.5 py-0.5 text-xs">{t("review.book")}</span> : null}
      </h2>
      {!move.isPlayerMove ? <p className="text-sm text-muted">{t("review.opponentMove")}</p> : null}
      {move.opening ? <p className="text-sm text-muted">{move.opening.name}</p> : null}
      {move.candidates ? (
        <>
          <h3 className="text-sm font-bold">{t("review.candidates")}</h3>
          <ol className="flex flex-col gap-2">
            {move.candidates.map((c, i) => (
              <CandidateRow key={c.uci} c={c} rank={i + 1} highlight={move.playedRank === i} />
            ))}
          </ol>
          <h3 className="text-sm font-bold">{t("review.played")}</h3>
          <div className="flex flex-col gap-1 rounded-lg border border-dashed border-red/60 p-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-bold">{move.san}</span>
              {move.playedScore ? <EvalTag score={move.playedScore} /> : null}
              {move.playedRank !== null ? (
                <span className="text-xs text-green">{t("review.inCandidates", { rank: move.playedRank + 1 })}</span>
              ) : null}
            </div>
            <p className="text-sm text-muted">{move.playedVariation.join(" ")}</p>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted">{t(analysisFailed ? "review.notAnalyzedFailed" : "review.notAnalyzed")}</p>
      )}
    </section>
  );
}

function resultText(result: GameResult | null, player: "white" | "black"): string | null {
  if (!result) return null;
  if (result === "1/2-1/2") return t("review.resultDraw");
  const playerWon = (result === "1-0") === (player === "white");
  return t(playerWon ? "review.resultWin" : "review.resultLoss");
}

export function ReviewView(props: {
  review: GameReview;
  moves: string[];
  result: GameResult | null;
  termination: Termination | null;
  analysisFailed: boolean;
}) {
  const { review } = props;
  const line = useMemo(() => replayLine(review.startFen, props.moves), [review.startFen, props.moves]);
  const finalIndex = review.moves.length; // 最後の局面
  const [index, setIndex] = useState(0); // 0..moves-1 = その手、finalIndex = 最後の局面
  const move = review.moves[index] as ReviewMove | undefined;
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setIndex((i) => Math.min(finalIndex, i + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finalIndex]);

  // index が変わって aria-current が移ったあとに、その手までスクロールする。
  // biome-ignore lint/correctness/useExhaustiveDependencies: index の変化をきっかけに DOM を読む
  useEffect(() => {
    listRef.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: "nearest" });
  }, [index]);

  // 盤は、選んだ手を指す前の局面。候補手は緑、指した手は赤（D28）。
  const boardFen = line[Math.min(index, line.length - 1)].fen;
  const arrows = move
    ? [
        ...(move.candidates ?? [])
          .map((c, i) => (c.uci === move.uci ? null : arrowOf(c.uci, CANDIDATE_ARROWS[i] ?? CANDIDATE_ARROWS[2])))
          .filter((a) => a !== null),
        arrowOf(move.uci, PLAYED_ARROW),
      ]
    : (review.finalCandidates ?? []).map((c, i) => arrowOf(c.uci, CANDIDATE_ARROWS[i] ?? CANDIDATE_ARROWS[2]));

  const rows: { number: number; white?: ReviewMove; black?: ReviewMove }[] = [];
  for (const m of review.moves) {
    const last = rows[rows.length - 1];
    if (m.mover === "white" || !last || last.number !== m.moveNumber) {
      rows.push({ number: m.moveNumber, [m.mover]: m });
    } else last.black = m;
  }

  const cell = (m?: ReviewMove) =>
    m ? (
      <button
        type="button"
        onClick={() => setIndex(m.ply - 1)}
        aria-current={index === m.ply - 1}
        className={`flex items-center gap-1.5 rounded px-2 py-1 text-left ${index === m.ply - 1 ? "bg-ink text-paper" : "hover:bg-paper-2"}`}
        data-testid={`move-${m.ply}`}
      >
        <span>{m.san}</span>
        {m.isPlayerMove && m.classification ? <ClassTag value={m.classification} /> : null}
      </button>
    ) : (
      <span />
    );

  const result = resultText(props.result, review.playerColor);
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,560px)_1fr] lg:gap-x-8">
      <div className="flex flex-col gap-2 lg:col-start-1 lg:row-start-1">
        <Board
          options={{
            id: "review",
            position: boardFen,
            boardOrientation: review.playerColor,
            allowDragging: false,
            arrows,
            allowDrawingArrows: false,
          }}
        />
        <p className="text-xs text-muted">{t("review.boardCaption")}</p>
      </div>
      <div className="sticky bottom-0 z-10 flex gap-2 bg-paper py-2 lg:static lg:col-start-1 lg:row-start-2 lg:py-0">
        <button
          type="button"
          className={NAV_BUTTON}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
        >
          {t("review.prev")}
        </button>
        <button
          type="button"
          className={NAV_BUTTON}
          onClick={() => setIndex((i) => Math.min(finalIndex, i + 1))}
          disabled={index === finalIndex}
        >
          {t("review.next")}
        </button>
      </div>
      <div className="lg:col-start-2 lg:row-span-3 lg:row-start-1">
        {move ? (
          <MoveDetail move={move} analysisFailed={props.analysisFailed} />
        ) : (
          <section className="flex flex-col gap-3" aria-live="polite">
            <h2 className="text-xl font-bold">{t("review.final")}</h2>
            {review.finalTerminal ? <p>{t(`terminal.${review.finalTerminal}`)}</p> : null}
            {result ? (
              <p>
                {t("review.result", { result })}
                {props.termination ? `（${t(`termination.${props.termination}`)}）` : ""}
              </p>
            ) : null}
            {review.finalCandidates?.length ? (
              <>
                <h3 className="text-sm font-bold">{t("review.finalCandidates")}</h3>
                <ol className="flex flex-col gap-2">
                  {review.finalCandidates.map((c, i) => (
                    <CandidateRow key={c.uci} c={c} rank={i + 1} highlight={false} />
                  ))}
                </ol>
              </>
            ) : null}
          </section>
        )}
      </div>
      <ol
        ref={listRef}
        className="grid max-h-80 grid-cols-[3rem_1fr_1fr] gap-y-0.5 overflow-y-auto rounded-lg bg-card p-2 text-sm lg:col-start-1 lg:row-start-3"
      >
        {rows.map((r) => (
          <li key={`${r.number}-${r.white?.ply ?? r.black?.ply}`} className="contents">
            <span className="px-2 py-1 text-muted">{r.number}.</span>
            {cell(r.white)}
            {cell(r.black)}
          </li>
        ))}
        <li className="contents">
          <span />
          <button
            type="button"
            onClick={() => setIndex(finalIndex)}
            aria-current={index === finalIndex}
            className={`col-span-2 rounded px-2 py-1 text-left ${index === finalIndex ? "bg-ink text-paper" : "hover:bg-paper-2"}`}
          >
            {t("review.final")}
          </button>
        </li>
      </ol>
    </div>
  );
}
