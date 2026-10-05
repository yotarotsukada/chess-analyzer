import { useEffect, useState } from "react";
import { Chessboard, type ChessboardOptions } from "react-chessboard";

/**
 * 盤面（react-chessboard, MIT。ADR 0003）。
 * サーバーでは描画せず、同じ大きさの枠だけを出す。
 */
export function Board(props: { options: ChessboardOptions }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <div className="aspect-square w-full max-w-[560px] overflow-hidden rounded-lg bg-paper-2" data-testid="board">
      {mounted ? <Chessboard options={props.options} /> : null}
    </div>
  );
}
