import { data } from "react-router";
import type { Route } from "./+types/api.game-status";

/** 解析の進み具合（D39、D48）。ポーリングのたびに Worker の起動漏れも確かめる（D51）。 */
export async function loader({ params }: Route.LoaderArgs) {
  const { isGameId } = await import("@server/ids");
  const { getProgress } = await import("@server/status");
  const { wakeWorker } = await import("@server/worker-control");
  if (!isGameId(params.id)) throw data(null, { status: 404 });
  const progress = await getProgress(params.id);
  if (!progress) throw data(null, { status: 404 });
  if (progress.status === "queued" || progress.status === "running") void wakeWorker();
  return data(progress, { headers: { "Cache-Control": "no-store" } });
}
