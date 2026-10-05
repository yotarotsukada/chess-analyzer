import type { Score } from "../../app/domain/types";

export type EngineLine = { multipv: number; score: Score; pv: string[] };

export type EngineSearch = {
  /** 開始局面と、そこからの手順（千日手の判定のため履歴ごと渡す。D46）。 */
  startFen: string;
  moves: string[];
  depth: number;
  multiPv: number;
  /** ジョブのタイムアウトなどで中断する。 */
  signal?: AbortSignal;
};

/** 解析エンジン。テストではスタブに差し替える（D34）。 */
export interface Engine {
  readonly name: string;
  analyze(search: EngineSearch): Promise<EngineLine[]>;
  newGame(): Promise<void>;
  close(): Promise<void>;
}
