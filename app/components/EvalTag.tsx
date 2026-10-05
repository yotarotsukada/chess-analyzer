import { evalLevel, formatScore } from "~/domain/eval-label";
import type { MoveClassification, Score } from "~/domain/types";
import { t } from "~/i18n";

const LEVEL_STYLE = {
  winning: "bg-green text-paper",
  better: "bg-green/15 text-green",
  equal: "bg-paper-2 text-ink",
  worse: "bg-orange/15 text-orange",
  losing: "bg-red text-paper",
} as const;

/** 評価は言葉と色が主、数値は小さく添える（D9）。 */
export function EvalTag({ score }: { score: Score }) {
  const level = evalLevel(score);
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className={`rounded px-2 py-0.5 text-sm font-bold ${LEVEL_STYLE[level]}`}>{t(`eval.${level}`)}</span>
      <span className="text-xs text-muted tabular-nums">{formatScore(score)}</span>
    </span>
  );
}

const CLASS_STYLE = {
  inaccuracy: "bg-amber/25 text-amber-ink",
  mistake: "bg-orange/20 text-orange",
  blunder: "bg-red text-paper",
} as const;

export function ClassTag({ value }: { value: MoveClassification }) {
  return <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${CLASS_STYLE[value]}`}>{t(`class.${value}`)}</span>;
}
