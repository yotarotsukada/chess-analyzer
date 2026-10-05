import os from "node:os";

function int(name: string, fallback: number): number {
  const v = process.env[name];
  const n = v ? Number.parseInt(v, 10) : Number.NaN;
  return Number.isFinite(n) ? n : fallback;
}

export const env = {
  databaseUrl: process.env.DATABASE_URL ?? "postgres://chess:chess@localhost:5432/chess",
  engine: {
    path: process.env.STOCKFISH_PATH ?? "stockfish",
    depth: int("ENGINE_DEPTH", 18),
    multiPv: int("ENGINE_MULTIPV", 3),
    threads: int("ENGINE_THREADS", os.cpus().length),
    hashMb: int("ENGINE_HASH_MB", 128),
  },
  limits: {
    perBrowserDaily: int("LIMIT_PER_BROWSER_DAILY", 10),
    perIpDaily: int("LIMIT_PER_IP_DAILY", 30),
    queueLength: int("LIMIT_QUEUE_LENGTH", 50),
    /** 月 $10 に収まる値（D53）。実測の時給で見直す。 */
    globalDaily: int("LIMIT_GLOBAL_DAILY", 100),
  },
  worker: {
    idleExitMs: int("WORKER_IDLE_EXIT_MS", 2 * 60 * 1000),
    jobTimeoutSeconds: int("JOB_TIMEOUT_SECONDS", 600),
    retryLimit: int("JOB_RETRY_LIMIT", 2),
  },
  fly: {
    apiToken: process.env.FLY_API_TOKEN ?? null,
    appName: process.env.FLY_APP_NAME ?? null,
  },
  analyticsToken: process.env.CF_BEACON_TOKEN ?? null,
};
