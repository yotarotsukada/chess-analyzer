/** 実測がまだないときの1局面あたりの秒数（D48）。 */
export const DEFAULT_SECONDS_PER_POSITION = 2;
/** Worker が止まっているときに足す起動時間。 */
export const WORKER_BOOT_SECONDS = 10;

/** 「あと約◯分」の見積もり。1分単位に切り上げる（D48）。 */
export function estimateEtaMinutes(input: {
  positionsAhead: number;
  ownRemaining: number;
  secondsPerPosition: number | null;
  workerRunning: boolean;
}): number {
  const spp = input.secondsPerPosition ?? DEFAULT_SECONDS_PER_POSITION;
  const seconds = (input.positionsAhead + input.ownRemaining) * spp + (input.workerRunning ? 0 : WORKER_BOOT_SECONDS);
  return Math.max(1, Math.ceil(seconds / 60));
}
