---
paths:
  - "app/domain/**"
  - "tests/unit/**"
---

# app/domain（共有のドメインロジック）

- ブラウザとサーバーの両方に入る純粋な関数だけを置く。`server/`、DB、Stockfish、Node 専用のモジュールは import しない。
- 名前は CONTEXT.md の用語に合わせる（Candidate Move、Played Move、Key Moment、Moment Facts など）。CONTEXT.md にない概念を足すときは、用語集にも足す。
- 新しいロジックには `tests/unit/` にユニットテストを書く。エンジンが要るものは `Engine` インターフェースのスタブで確かめる。
- 勝率・しきい値・駒の価値などの数値は定数にまとめ、台帳の ID（D27、D83 など）をコメントに書く。
