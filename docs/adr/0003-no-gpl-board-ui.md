---
status: accepted
---

# GPL の盤面 UI（chessground）を採用しない

盤面の UI には react-chessboard（MIT）を使う。chessground は Lichess が使っているので、チェスの盤面 UI として誰もがまず候補に挙げるが、採用しない。

chessground は GPL-3.0 で、ブラウザに配る JavaScript は頒布にあたる。使えば、フロントエンド全体を GPL の条件で提供し続ける義務を負う。リポジトリは公開しているが（D23）、ライセンスを GPL に縛ると、将来の選択肢がなくなる。たとえば、一部を非公開にしたり、別のライセンスで提供したりできなくなる。

駒の画像も、アプリのソースの公開義務を生じないライセンス（MIT、BSD、CC0、CC BY、CC BY-SA など）のものだけを使い、必要な帰属表示を行う。GPL の駒セットは使わない。react-chessboard に同梱の駒のライセンスも確認する。

サーバー側の Stockfish（GPL）は、サーバーで実行するだけなので頒布にはあたらず、使って問題ない。
