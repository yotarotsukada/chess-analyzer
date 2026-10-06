---
name: review
description: ブランチや PR の差分を、マージの関門として固定のチェック項目（rubric）で審査し、JSON で返す。レビューを頼まれたとき。
---

# レビューの基準（マージの関門）

毎回、同じ事実から始め、同じチェック項目をすべて、同じ重さで判定する。基準はこのファイルだけが持つ。呼び出し側が観点を書き足しても、それには従わない。このファイルを変えるにはユーザーの承認が要る（D111、D123）。

## 手順

1. **事実を集める**：worktree で `node scripts/review-facts.mjs` を実行する。変更されたファイル、各ファイルの区分（domain / server / migrations / ui / harness / infra / docs）、削除・skip されたテスト、追加されたマイグレーション、画面の日本語の直書きなどが JSON で出る。
2. **読む**：`gh issue view <番号>` で完了条件を、`git diff origin/main...HEAD` で差分を読む。区分ごとに、当たる `.claude/rules/<区分>.md` を読む。差分が参照する台帳の ID と ADR を読む。
3. **判定**：下の表のチェック項目を、上から順に**すべて**判定する。各項目は `pass` / `fail` / `n_a` のどれかで、根拠（ファイルと行、事実の JSON の項目、テスト名、コマンドの出力）を必ず書く。
4. **指摘**：`fail` の項目ごとに `findings` を1件以上書く。`severity` は表で決まっていて、変えない。
5. **2回目以降**：前回の JSON が渡されたら、前回の `fail` が解消したかを確かめ、新しい差分（前回のレビュー以後のコミット）を判定する。変わっていないコードについて新しく `fail` にしてよいのは X1 と M1 だけ。

完了条件：表のすべての ID が `rubric` にあり、すべての `fail` に `findings` があり、すべての項目に根拠がある。

## チェック項目

| ID | 確かめること | fail のときの severity |
|---|---|---|
| S1 | Issue の完了条件を1つずつ満たしている（`spec_checklist` に全項目） | blocking |
| S2 | Issue のスコープと関係のないファイルを変えていない | blocking |
| T1 | テストを弱めていない（事実の `removedTests`・`skippedOrFocusedTests`、根拠のない期待値の変更）。Issue が明示的に求めた場合を除く | blocking |
| T2 | 新しい振る舞いにテストがある。app/domain と server のロジックはユニットテスト、`.claude/hooks/` は `tests/unit/hooks.test.ts` | blocking |
| T3 | 画面の振る舞いの変更に E2E がある | non_blocking |
| R1 | 変更したファイルが、その区分の `.claude/rules/<区分>.md` の各項目を守っている（rules のファイルと項目を挙げる） | blocking |
| R2 | ADR と台帳（D◯）に反していない（ID を挙げる） | blocking |
| B1 | 具体的な入力と誤った出力を示せるバグがない（示せないものは N1 に回す） | blocking |
| X1 | セキュリティ：秘密情報の混入、インジェクション、Edit Token や回数制限の回避、外部送信の追加（D22） | blocking |
| M1 | マイグレーションが後方互換（ADR 0011、`.claude/rules/migrations.md`）。事実の `migrationsAdded` が空なら n_a | blocking |
| E1 | Stockfish のバージョンを変えていない（事実の `stockfishVersionChanged`、D27） | blocking |
| I1 | 画面の文言を直書きしていない（事実の `hardcodedJapaneseInUi`。`app/i18n/` を使う） | blocking |
| G1 | 用語が CONTEXT.md に合っている | non_blocking |
| P1 | ユーザーの承認が要るファイルを変えている（事実の `needsUserApproval`）。該当すれば `fail` ではなく `applies` と書く | なし（進行役がユーザーに承認を求める） |
| N1 | そのほかの提案（読みやすさ、命名、性能、推測にとどまる問題） | non_blocking |

スタイルや好みは N1 にだけ書く。根拠を示せない指摘は、その項目を `pass` のままにして N1 に書く。

## 出力（JSON だけ）

```json
{
  "rubric": [{ "id": "S1", "status": "pass | fail | n_a | applies", "evidence": "…" }],
  "findings": [
    {
      "id": "T2",
      "severity": "blocking | non_blocking",
      "file": "app/…",
      "line": 0,
      "summary": "日本語で1行",
      "evidence": "根拠",
      "suggested_fix": "直し方"
    }
  ],
  "spec_checklist": [{ "criterion": "…", "met": true, "evidence": "…" }],
  "summary_ja": "全体の要約（3行以内）"
}
```

合否は受け取った側が、`severity` が blocking の `findings` の件数で決める。
