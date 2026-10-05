import { Chess, type Square } from "chess.js";
import { useMemo, useState } from "react";
import { terminalKind } from "~/domain/game-line";
import { t } from "~/i18n";
import { Board } from "./Board";

const BUTTON = "rounded border border-line-strong bg-card px-3 py-1.5 text-sm disabled:opacity-40";

/** 盤をタップ（またはドラッグ）して手を入力する（D8）。初期配置から始める（D36）。 */
export function MoveEntry(props: {
  moves: string[];
  onChange: (moves: string[]) => void;
  orientation: "white" | "black";
}) {
  const [selected, setSelected] = useState<Square | null>(null);
  const chess = useMemo(() => {
    const c = new Chess();
    for (const uci of props.moves) {
      c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    }
    return c;
  }, [props.moves]);
  // 千日手と50手ルールは申告するまで続けられるので、止めるのは詰み・ステイルメイト・駒不足だけ。
  const ended = (() => {
    const kind = terminalKind(chess);
    return kind === "repetition" || kind === "fifty-move" ? null : kind;
  })();

  function change(moves: string[]) {
    setSelected(null);
    props.onChange(moves);
  }

  function tryMove(from: Square, to: Square): boolean {
    if (ended) return false;
    const next = new Chess(chess.fen());
    try {
      const m = next.move({ from, to, promotion: "q" });
      change([...props.moves, m.lan]);
      return true;
    } catch {
      return false;
    }
  }

  function onSquareClick(square: Square) {
    if (selected === square) {
      setSelected(null);
      return;
    }
    if (selected && tryMove(selected, square)) return;
    const piece = chess.get(square);
    setSelected(!ended && piece && piece.color === chess.turn() ? square : null);
  }

  const targets = selected ? chess.moves({ square: selected, verbose: true }).map((m) => m.to) : [];
  const squareStyles: Record<string, React.CSSProperties> = {};
  const last = chess.history({ verbose: true }).at(-1);
  if (last) {
    squareStyles[last.from] = { background: "rgba(227,163,59,0.3)" };
    squareStyles[last.to] = { background: "rgba(227,163,59,0.3)" };
  }
  if (selected) squareStyles[selected] = { background: "rgba(227,163,59,0.6)" };
  for (const sq of targets) {
    squareStyles[sq] = { background: "radial-gradient(circle, rgba(23,33,43,0.35) 22%, transparent 24%)" };
  }

  const sans = chess.history();
  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,560px)_1fr]">
      <Board
        options={{
          id: "entry",
          position: chess.fen(),
          boardOrientation: props.orientation,
          squareStyles,
          allowDragging: !ended,
          onSquareClick: ({ square }) => onSquareClick(square as Square),
          onPieceDrop: ({ sourceSquare, targetSquare }) =>
            targetSquare ? tryMove(sourceSquare as Square, targetSquare as Square) : false,
        }}
      />
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted">{t("new.manual.help")}</p>
        <p className="text-sm text-muted">{t("new.manual.promotion")}</p>
        {ended ? (
          <p role="status" className="rounded border border-amber bg-card px-3 py-2 text-sm">
            {t("new.manual.ended", { reason: t(`terminal.${ended}`) })}
          </p>
        ) : null}
        <div className="flex gap-2">
          <button
            type="button"
            className={BUTTON}
            disabled={props.moves.length === 0}
            onClick={() => change(props.moves.slice(0, -1))}
          >
            {t("new.manual.undo")}
          </button>
          <button type="button" className={BUTTON} disabled={props.moves.length === 0} onClick={() => change([])}>
            {t("new.manual.reset")}
          </button>
        </div>
        <div>
          <h3 className="text-sm font-bold">{t("new.manual.moves")}</h3>
          <ol className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm" data-testid="entered-moves">
            {sans.map((san, i) =>
              i % 2 === 0 ? (
                <li key={i}>
                  {i / 2 + 1}. {san} {sans[i + 1] ?? ""}
                </li>
              ) : null,
            )}
          </ol>
        </div>
      </div>
    </div>
  );
}
