import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import readline from "node:readline";
import type { Engine, EngineLine, EngineSearch } from "./types";
import { parseInfoLine } from "./uci";

type Waiter = { match: (line: string) => boolean; resolve: (line: string) => void; reject: (e: Error) => void };

export class EngineExitedError extends Error {}

export class StockfishEngine implements Engine {
  name = "Stockfish";
  private proc: ChildProcessWithoutNullStreams;
  private waiters: Waiter[] = [];
  private listeners: ((line: string) => void)[] = [];
  private exitError: Error | null = null;
  /** プロセスが落ちたときに呼ばれる。Worker はこれで終了する。 */
  onExit: ((e: Error) => void) | null = null;

  private constructor(path: string) {
    this.proc = spawn(path, [], { stdio: "pipe" });
    const rl = readline.createInterface({ input: this.proc.stdout });
    rl.on("line", (line) => {
      for (const l of this.listeners) l(line);
      const idx = this.waiters.findIndex((w) => w.match(line));
      if (idx >= 0) this.waiters.splice(idx, 1)[0].resolve(line);
    });
    const die = (e: Error) => {
      if (this.exitError) return;
      this.exitError = e;
      for (const w of this.waiters.splice(0)) w.reject(e);
      this.onExit?.(e);
    };
    this.proc.on("error", (e) => die(new EngineExitedError(`stockfish error: ${e.message}`)));
    this.proc.on("exit", (code, signal) => die(new EngineExitedError(`stockfish exited: ${code ?? signal}`)));
    this.proc.stdin.on("error", (e) => die(new EngineExitedError(`stockfish stdin: ${e.message}`)));
  }

  static async start(opts: { path: string; threads: number; hashMb: number }): Promise<StockfishEngine> {
    const engine = new StockfishEngine(opts.path);
    const idLines: string[] = [];
    engine.listeners.push((l) => {
      if (l.startsWith("id name ")) idLines.push(l.slice("id name ".length));
    });
    engine.send("uci");
    await engine.waitFor((l) => l === "uciok");
    engine.name = idLines[0] ?? "Stockfish";
    engine.send(`setoption name Threads value ${opts.threads}`);
    engine.send(`setoption name Hash value ${opts.hashMb}`);
    engine.send("isready");
    await engine.waitFor((l) => l === "readyok");
    return engine;
  }

  private send(cmd: string) {
    if (this.exitError) throw this.exitError;
    this.proc.stdin.write(`${cmd}\n`);
  }

  private waitFor(match: (line: string) => boolean): Promise<string> {
    if (this.exitError) return Promise.reject(this.exitError);
    return new Promise((resolve, reject) => this.waiters.push({ match, resolve, reject }));
  }

  async newGame() {
    this.send("ucinewgame");
    this.send("isready");
    await this.waitFor((l) => l === "readyok");
  }

  async analyze(search: EngineSearch): Promise<EngineLine[]> {
    search.signal?.throwIfAborted();
    const lines = new Map<number, EngineLine & { depth: number }>();
    const onLine = (l: string) => {
      const info = parseInfoLine(l);
      if (info) lines.set(info.multipv, info);
    };
    // 中断されたら探索を止める。bestmove が返ってから例外にする。
    const onAbort = () => {
      if (!this.exitError) this.proc.stdin.write("stop\n");
    };
    this.listeners.push(onLine);
    search.signal?.addEventListener("abort", onAbort, { once: true });
    try {
      this.send(`setoption name MultiPV value ${search.multiPv}`);
      const moves = search.moves.length ? ` moves ${search.moves.join(" ")}` : "";
      this.send(`position fen ${search.startFen}${moves}`);
      this.send(`go depth ${search.depth}`);
      await this.waitFor((l) => l.startsWith("bestmove"));
    } finally {
      this.listeners = this.listeners.filter((l) => l !== onLine);
      search.signal?.removeEventListener("abort", onAbort);
    }
    search.signal?.throwIfAborted();
    return [...lines.values()]
      .sort((a, b) => a.multipv - b.multipv)
      .map(({ multipv, score, pv }) => ({ multipv, score, pv }));
  }

  async close() {
    if (this.exitError) return;
    this.onExit = null;
    this.send("quit");
    await new Promise((r) => {
      this.proc.once("exit", r);
      setTimeout(() => {
        this.proc.kill();
        r(null);
      }, 2000);
    });
  }
}
