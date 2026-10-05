import { env } from "./env";

const MACHINES_API = "https://api.machines.dev/v1";
const THROTTLE_MS = 15_000;
let lastWake = 0;

type Machine = { id: string; state: string; config?: { metadata?: Record<string, string> } };

async function flyFetch(path: string, init?: RequestInit) {
  return fetch(`${MACHINES_API}/apps/${env.fly.appName}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${env.fly.apiToken}`, "Content-Type": "application/json" },
  });
}

/**
 * 解析 Worker を起こす（ADR 0001、D42、D51）。
 * ジョブ登録と状態のポーリングのたびに呼ばれるので、短い間隔では間引く。
 * Fly の設定がない環境（ローカル、CI）では何もしない。Worker は別途起動しておく。
 */
export async function wakeWorker(): Promise<void> {
  if (!env.fly.apiToken || !env.fly.appName) return;
  const now = Date.now();
  if (now - lastWake < THROTTLE_MS) return;
  lastWake = now;
  try {
    const res = await flyFetch("/machines");
    if (!res.ok) throw new Error(`list machines: ${res.status}`);
    const machines = (await res.json()) as Machine[];
    const workers = machines.filter((m) => m.config?.metadata?.fly_process_group === "worker");
    if (workers.some((m) => m.state === "started" || m.state === "starting")) return;
    const target = workers.find((m) => m.state === "stopped" || m.state === "suspended");
    if (!target) return;
    const start = await flyFetch(`/machines/${target.id}/start`, { method: "POST" });
    if (!start.ok) throw new Error(`start machine: ${start.status}`);
  } catch (e) {
    console.error("[wakeWorker]", e);
  }
}
