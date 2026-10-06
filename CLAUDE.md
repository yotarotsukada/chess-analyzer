# chess-analyzer

Duolingo などで指したチェスの対局を、1手ずつ「他の手ならどうなったか」と比べて振り返る日本語の Web アプリ。

## 先に読むもの

- `CONTEXT.md`：用語集。コード・UI・Issue でもこの用語を使う（Game, Game Review, Candidate Move, Variation, Played Move, Player, Visitor など）。
- `docs/decisions.md`：確定した判断（D1〜）。矛盾する変更をしない。覆す必要があるなら、PR で番号を挙げて理由を書く。
- `docs/adr/`：後から変えにくい判断。特に、次のことはしない。
  - Next.js を使う（ADR 0006）
  - chessground など GPL の盤面 UI を使う（ADR 0003）
  - Chess.com からの取り込み、Duolingo のスクレイピングや拡張機能（ADR 0002）
  - ログインを足す（ADR 0005）
  - GPL や AGPL のリポジトリ（chessops、lichess-puzzler など）からコードを持ってくる・移植する（ADR 0008）
- 重要局面（Key Moment）の機能は、AI Commentary がなくても完結させる。会員を前提にしたテーブルや分岐を先回りして作らない（ADR 0007）。

## 進め方

- MVP は main に直接コミットした（R1）。それ以降の作業は必ず Issue 単位で行う。`main` から作業ブランチを切り、その Issue のスコープだけを変更して、`main` への PR を出す。PR の本文に `Closes #<番号>` を書く。
- スコープ外の改善を見つけたら、同じ PR には入れず、PR の本文に「別 Issue の候補」として書く。
- マージは人が行う。自分でマージしない。
- コミットの作者は `yotarotsukada <yotarotsukada@gmail.com>`。

## 構成

- `app/`：React Router（framework mode, Vite）。`app/domain/` はブラウザとサーバーで共有する純粋なロジック（勝率の換算、Move Classification、Game Review の組み立て）。
- `server/`：Node 専用（DB、キュー、Stockfish）。ルートからは loader / action の中で `await import("@server/...")` する。
- `server/worker/main.ts`：解析 Worker。Stockfish を子プロセスで動かす。Fly では別の process group で、ジョブがある間だけ起動する（ADR 0001）。
- DB は Postgres（Drizzle）。スキーマを変えたら `pnpm db:generate` でマイグレーションを作る。
- UI の文言は `app/i18n/ja.ts` に置く（直書きしない）。

## コマンド

```sh
pnpm lint && pnpm typecheck && pnpm test   # PR 前に必ず通す
docker compose up -d --build               # db / web / worker（E2E 用。depth 6）
pnpm test:e2e                              # docker compose の上で Playwright
```

テストの方針：ドメインのロジックは `tests/unit/` にユニットテスト、エンジンは `Engine` インターフェースのスタブに差し替える。画面を通した確認は `e2e/` に書く。
