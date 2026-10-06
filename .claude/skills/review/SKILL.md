---
name: review
description: ブランチや PR の差分を、マージの関門としてレビューする。Issue の完了条件と、CLAUDE.md・ADR・台帳の決まりに照らして blocking / non_blocking の指摘を JSON で返す。
---

# レビューの観点（マージの関門）

このスキルはマージの関門そのもの。変えるときはユーザーの確認が要る（D111、D120）。

## 手順

1. `gh issue view <番号>` で完了条件を読む。差分は `git diff origin/main...HEAD` で取る。
2. **Spec 軸**：完了条件を1つずつ `spec_checklist` に並べ、満たしたかどうかと根拠（ファイルと行、またはテスト名）を書く。
3. **Standards 軸**：差分のすべてのファイルを、下の blocking の基準と、CLAUDE.md・`.claude/rules/`・ADR・`docs/decisions.md` の該当する ID に照らす。
4. 2回目以降のレビューでは、前回の blocking の指摘が解消されたかと、新しい差分だけを見る。変わっていないコードに新しく blocking を出すのは、セキュリティとマイグレーション（下の 5 と 6）だけ。

完了条件：完了条件のすべてが `spec_checklist` にあり、差分のすべてのファイルを基準に照らしている。

## blocking の基準

客観的に確かめられるものだけを blocking にする（D110）。

1. 完了条件を満たしていない
2. ADR・台帳・CLAUDE.md・rules の決まりに反している（ID を挙げる）
3. テストを弱めている（削除、skip、根拠のない期待値の変更）。app/domain の新しいロジックにユニットテストがない
4. 具体的な入力と誤った出力を示せるバグ
5. セキュリティ：秘密情報の混入、インジェクション、Edit Token や回数制限の回避、外部送信の追加（D22）
6. 後方互換でないマイグレーション（ADR 0011）、Stockfish のバージョンの変更（D27）
7. Issue と関係のない変更
8. UI の文言の直書き（`app/i18n/ja.ts` を使う）

スタイル、命名、リファクタリングの提案、計測していない性能、推測にとどまるバグ、文書の言い回しは non_blocking にする。根拠（ファイルと行、理由）を示せない指摘は、non_blocking に下げる。

## 出力（JSON だけ）

```json
{
  "findings": [
    {
      "severity": "blocking | non_blocking",
      "axis": "spec | standards",
      "rule": "spec-unmet | D40 | ADR-0003 | test-weakening | bug | security | migration | out-of-scope | i18n | …",
      "file": "app/…",
      "line": 0,
      "summary": "日本語で1行",
      "evidence": "根拠",
      "suggested_fix": "直し方"
    }
  ],
  "spec_checklist": [{ "criterion": "…", "met": true, "evidence": "…" }],
  "summary_ja": "レビュー全体の要約（3行以内）"
}
```

合否はこの JSON を受け取った側が、`severity` が blocking の件数で決める。
