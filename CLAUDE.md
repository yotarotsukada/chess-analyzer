# chess-analyzer

Duolingo などで指したチェスの対局を、1手ずつ「他の手ならどうなったか」と比べて振り返る日本語の Web アプリ。

## 先に読むもの

- `CONTEXT.md`：用語集。コード・UI・Issue でもこの用語を使う。
- `docs/decisions.md`：確定した判断（D1〜）。矛盾する変更をしない。覆す必要があるなら、番号を挙げてユーザーに聞く。
- `docs/adr/`：後から変えにくい判断。特に守ること：
  - Web フレームワークは React Router on Vite のモノリス（ADR 0006）
  - 盤面 UI や戦術判定は MIT / BSD のものか自作。GPL・AGPL のコードは持ち込まない（ADR 0003、0008）
  - 外部サービスからの取り込みは Lichess の API と、ユーザー本人の手入力・PGN だけ（ADR 0002）
  - ログインなし。所有は Edit Token（ADR 0005）
  - Key Moment は AI Commentary がなくても完結させる。会員の仕組みは AI を実装するまで作らない（ADR 0007）
- `.claude/rules/`：パスごとの決まり（app/domain、server、マイグレーション、画面、ハーネス）。

## 進め方

- ユーザーとは日本語で話す。ユーザーはコードを読まないので、報告は利用者から見た変化と判断の ID で書く（D93、D94）。
- 作業は Issue 単位。Issue を進めるときは `issue-loop` スキルに従う（worktree、実装役と別のレビュー役のサブエージェント、`scripts/verify.sh`、PR、マージ、Issue への「## 結果」）。
- 設計を決めるときは `design-grilling` スキル、保守の見直しは `weekly-review` スキル。
- コミットの作者は `yotarotsukada <yotarotsukada@gmail.com>`。main へ直接コミット・push しない。マージは `gh pr merge --squash --author-email yotarotsukada@gmail.com`。Hooks がこれを確かめる。
- ADR・台帳の既存の記述・fly.toml・レビューの観点・Hooks を変えるときは、ユーザーに確認する（D120）。PR になっていれば、PR のリンクを渡し、GitHub の画面でのレビューと「承認」のコメントを待つ。
- スコープ外の改善は、同じ PR に入れず「別 Issue の候補」として報告する。

## 構成

- `app/`：React Router（framework mode, Vite）。`app/domain/` はブラウザとサーバーで共有する純粋なロジック。
- `server/`：Node 専用（DB、キュー、Stockfish）。`server/worker/main.ts` が解析 Worker（ADR 0001）。
- 検証：`scripts/verify.sh`（lint・型・ユニット・Docker 上の E2E。E2E の Stockfish は depth 6）。
