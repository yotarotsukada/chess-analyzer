# Chess Analyzer（仮称）

対局を、言葉と色で振り返る。

Duolingo などで指したチェスの対局を取り込み、1手ずつ「候補手3つ」と「5手先までの展開」を比べて振り返れる、日本語の Game Review ツールです。

- 手入力（盤をクリック）と PGN の貼り付けで取り込めます
- 評価は「優勢・互角・劣勢」の言葉と色で示し、疑問手・悪手・大悪手を判定します
- ログイン不要。共有 URL と管理用リンクで管理します

非公式のツールです。Duolingo、Lichess、Chess.com とは提携していません。

## 開発

必要なもの：Node 22.22 以上（CI と本番は 24）、pnpm 10、Docker。

```sh
pnpm install
docker compose up -d --build   # Postgres、Web（:3000）、解析 Worker
pnpm test                      # ユニットテスト
pnpm test:e2e                  # E2E（docker compose の上で実行）
```

`docker compose` を使わずに Web を動かす場合は、`docker compose up -d db` で DB だけを立ち上げ、`pnpm db:migrate`、`pnpm dev`、`pnpm worker` を実行します（Stockfish が `PATH` にあること）。

## デプロイ

Fly.io（`fly.toml`）。Web は常時起動の小さなマシンで、解析 Worker はジョブがあるときだけ起動します。設計の経緯は `docs/` を参照してください。

## ライセンスと出典

- オープニング名：[lichess-org/chess-openings](https://github.com/lichess-org/chess-openings)（CC0）
- 盤面 UI：[react-chessboard](https://github.com/Clariity/react-chessboard)（MIT）
- 解析エンジン：[Stockfish](https://stockfishchess.org/)（GPL-3.0。サーバー上でのみ実行し、配布はしていません）
