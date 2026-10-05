import { useEffect, useRef, useState } from "react";
import { data, Form, Link, useRevalidator } from "react-router";
import { ReviewView } from "~/components/ReviewView";
import { MAX_MANUAL_RETRIES } from "~/domain/limits";
import { t } from "~/i18n";
import { manageUrl, tokenFor } from "~/lib/my-games";
import type { Route } from "./+types/game";

export function meta() {
  // Game Review は検索エンジンに載せない（D30）。
  return [{ title: `${t("review.title.page")} | ${t("app.name")}` }, { name: "robots", content: "noindex, nofollow" }];
}

export async function loader({ params }: Route.LoaderArgs) {
  const { isGameId } = await import("@server/ids");
  const { getGame, getEvaluations } = await import("@server/games");
  const { getProgress } = await import("@server/status");
  const { lookupOpening } = await import("@server/openings/lookup");
  const { buildReview } = await import("~/domain/review");
  if (!isGameId(params.id)) throw data(null, { status: 404 });
  const row = await getGame(params.id);
  if (!row) throw data(null, { status: 404 });
  const [evaluations, progress] = await Promise.all([getEvaluations(params.id), getProgress(params.id)]);
  if (!progress) throw data(null, { status: 404 });
  const review = buildReview({
    startFen: row.games.startFen,
    moves: row.games.moves,
    playerColor: row.games.playerColor,
    evaluations,
    openingLookup: lookupOpening,
  });
  return {
    id: row.games.id,
    moves: row.games.moves,
    review,
    progress,
    result: row.games.result,
    termination: row.games.termination,
    canRetry: row.games.manualRetries < MAX_MANUAL_RETRIES,
  };
}

export async function action({ params, request }: Route.ActionArgs) {
  const { retryAnalysis } = await import("@server/games");
  const form = await request.formData();
  if (form.get("intent") === "retry") {
    return { retried: await retryAnalysis(params.id) };
  }
  throw data(null, { status: 400 });
}

type Progress = Route.ComponentProps["loaderData"]["progress"];

/** 3秒ごとに進み具合を確かめ、局面が増えたら読み直す（D39）。画面が隠れている間は止める。 */
function usePolling(id: string, initial: Progress) {
  const [progress, setProgress] = useState(initial);
  const revalidator = useRevalidator();
  const revalidate = useRef(revalidator.revalidate);
  revalidate.current = revalidator.revalidate;
  const latest = useRef(initial);
  useEffect(() => {
    latest.current = initial;
    setProgress(initial);
  }, [initial]);
  useEffect(() => {
    if (progress.status === "done" || progress.status === "failed") return;
    const controller = new AbortController();
    let inFlight = false;
    const timer = setInterval(async () => {
      if (inFlight || document.hidden) return;
      inFlight = true;
      try {
        const res = await fetch(`/api/games/${id}/status`, { signal: controller.signal });
        if (!res.ok) return;
        const next = (await res.json()) as Progress;
        const prev = latest.current;
        latest.current = next;
        setProgress(next);
        if (next.done !== prev.done || next.status !== prev.status) void revalidate.current();
      } catch {
        // 通信に失敗したら次の回に任せる。
      } finally {
        inFlight = false;
      }
    }, 3000);
    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, [id, progress.status]);
  return progress;
}

function StatusBanner({ progress, canRetry }: { progress: Progress; canRetry: boolean }) {
  if (progress.status === "done") return null;
  if (progress.status === "failed") {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-red bg-card p-3">
        <span className="text-red">{t("status.failed")}</span>
        {canRetry ? (
          <Form method="post">
            <input type="hidden" name="intent" value="retry" />
            <button type="submit" className="rounded-full bg-ink px-4 py-1 text-sm font-bold text-paper">
              {t("status.retry")}
            </button>
          </Form>
        ) : (
          <span className="text-sm text-muted">{t("status.retryExhausted")}</span>
        )}
      </div>
    );
  }
  const text =
    progress.status === "queued"
      ? t("status.queued", { ahead: progress.ahead, eta: progress.etaMinutes ?? 1 })
      : progress.done === 0
        ? t("status.preparing")
        : t("status.running", { done: progress.done, total: progress.total, eta: progress.etaMinutes ?? 1 });
  const percent = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-ink p-3 text-paper" data-testid="analysis-status">
      <span className="font-bold">{text}</span>
      {progress.done > 0 ? <span className="text-sm opacity-80">{t("status.partial")}</span> : null}
      <div
        className="h-1.5 overflow-hidden rounded bg-ink-2"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={text}
      >
        <div className="h-full bg-amber" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function OwnerPanel({ id }: { id: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");
  useEffect(() => setToken(tokenFor(id)), [id]);
  if (!token) return null;
  const url = manageUrl(window.location.origin, id, token);
  return (
    <aside className="flex flex-col gap-2 rounded-lg border border-line bg-card p-4 text-sm">
      <p className="font-bold">{t("review.owner")}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded border border-line-strong px-3 py-1"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopy("copied");
            } catch {
              setCopy("failed");
            }
          }}
        >
          {copy === "copied" ? t("review.copied") : t("review.manageLink")}
        </button>
        {/* トークンは URL に載せない。管理ページはブラウザに保存したトークンを使う（D49）。 */}
        <Link to={`/g/${id}/manage`} className="rounded border border-line-strong px-3 py-1">
          {t("manage.title")}
        </Link>
      </div>
      {copy === "failed" ? (
        <p>
          {t("review.copyFailed")} <span className="break-all font-mono text-xs select-all">{url}</span>
        </p>
      ) : null}
      <p className="text-muted">{t("review.manageNote")}</p>
    </aside>
  );
}

export default function Game({ loaderData }: Route.ComponentProps) {
  const progress = usePolling(loaderData.id, loaderData.progress);
  const { engine } = progress;
  return (
    <main className="flex flex-col gap-6">
      <StatusBanner progress={progress} canRetry={loaderData.canRetry} />
      <ReviewView
        review={loaderData.review}
        moves={loaderData.moves}
        result={loaderData.result}
        termination={loaderData.termination}
        analysisFailed={progress.status === "failed"}
      />
      {engine.name ? (
        <p className="text-xs text-muted">
          {t("status.engine", { engine: engine.name, depth: engine.depth, multiPv: engine.multiPv })}
        </p>
      ) : null}
      <OwnerPanel id={loaderData.id} />
    </main>
  );
}
