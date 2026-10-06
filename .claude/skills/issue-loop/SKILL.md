---
name: issue-loop
description: GitHub の Issue を、実装・ローカルの検証・別エージェントのレビュー・修正・マージ・デプロイの確認・Issue への結果の記入まで進める。ユーザーが「#n をやって」「Issue を進めて」「ready なものを全部」と言ったとき。
---

# Issue のループ（D121）

ユーザーが指示した Issue だけを進める（D119）。同時に進める Issue は1つ。ユーザーはコードを読まない前提で、結果は Issue の本文で伝える（D93、D94）。

## 手順

1. **着手の確認**：`gh issue view <n>` を読む。完了条件（またはそれに当たること）が書かれているか、「依存: #m」の Issue が閉じているかを確かめる。足りなければ、ここでユーザーに聞く。開いている `incident` の Issue があれば、それを先に扱う。
2. **worktree**：`git fetch origin` のあと、`git worktree add ../chess-analyzer-wt/<n> -b <type>/<n>-<短い英語> origin/main`。
3. **実装**：`implementer` サブエージェントに、Issue の番号と worktree のパスを渡す。止まって返ってきたら、手順 9 へ。
4. **レビュー**：`reviewer` サブエージェントを新しく呼ぶ（実装の文脈を渡さない）。渡すのは Issue の番号、worktree のパス、2回目以降なら前回の指摘だけ。
5. **修正**：blocking が1件以上なら、指摘をそのまま `implementer` に渡して直させ、手順 4 に戻る。修正は最大2回。3回目のレビューでも blocking が残れば、手順 9 へ。
6. **PR**：worktree で `gh pr create --base main`。タイトルはコミットと同じ形、本文は次の「## 結果」と同じ中身に `Closes #<n>` を足す。
7. **マージ**：GitHub の CI（check、e2e）が緑になるのを `gh pr checks <PR> --watch` で待つ。ユーザーの確認が要るファイル（ADR・台帳・fly.toml・レビューの観点・Hooks）を変えている PR は、変更の中身を説明してこのセッションでユーザーの承認を得る。そのうえで `gh pr merge <PR> --squash --delete-branch --author-email yotarotsukada@gmail.com`。
8. **後片付けと結果**：
   - デプロイ（GitHub Actions）の結果を `gh run list --workflow Deploy` で確かめる。
   - Issue の本文の末尾に「## 結果」を追記する（下の形式。X11）。
   - `git worktree remove ../chess-analyzer-wt/<n>`。
   - ユーザーに3行で報告する。
9. **止まるとき**：Issue に理由と選択肢をコメントし、`needs-decision` ラベルを付け、このセッションでユーザーに聞く（AskUserQuestion）。止まる条件は implementer の「止まるとき」と同じ（D99）に加えて、修正が2回で収束しない、本番の確認が失敗した、のとき。

完了条件：PR がマージされ、デプロイの結果を確かめ、Issue に「## 結果」があり、worktree が消えている。または、needs-decision でユーザーに聞いている。

## 「## 結果」の形式（D102、10行以内）

```markdown
## 結果

<1行の要約>

- 変わったこと：<利用者から見て>
- 理由：<なぜ>
- 関連する判断：D◯、ADR ◯
- 確かめた方法：<ユニット・E2E・CI・本番の確認>
- 気になる点：<あれば。なければ「なし」>
- ユーザーがやること：<あれば。なければ「なし」>
- 費用・データ・移行への影響：<あれば。なければ「なし」>
- PR：#<番号>
```

## Dependabot の PR

ユーザーに「依存の更新も」と言われたときに扱う。patch / minor で、lockfile と package.json だけの変更なら、手順 4〜5 を省き、`scripts/verify.sh` と CI が通ればマージする（D105、D122）。それ以外は通常の手順で扱う。
