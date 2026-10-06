---
name: issue-loop
description: GitHub の Issue を、実装・レビュー・マージ・デプロイの確認・Issue への結果の記入まで進める進行役の手順。ユーザーが「#n をやって」「Issue を進めて」「ready なものを全部」と言ったとき。
---

# Issue のループ（D121）

このセッションは進行役。実装は `implementer`、審査は `reviewer` のサブエージェントに任せ、関門を通ったものだけをマージする。ユーザーが指示した Issue だけを、1つずつ進める（D119）。ユーザーはコードを読まないので、結果は Issue の本文で伝える（D93、D94）。

## 手順

1. **着手の確認**：`gh issue view <n>` を読み、完了条件があるか、「依存: #m」が閉じているかを確かめる。足りなければユーザーに聞く。開いている `incident` の Issue があれば、それを先に扱う。
2. **worktree**：`git fetch origin` のあと、`git worktree add ../chess-analyzer-wt/<n> -b <type>/<n>-<短い英語> origin/main`。
3. **実装**：`implementer` に Issue の番号と worktree の絶対パスだけを渡す。止まって返ってきたら手順 9。
4. **レビュー**：`reviewer` を毎回新しく呼び、渡すのは Issue の番号、worktree の絶対パス、2回目以降なら前回の JSON だけにする。観点を書き足さない（基準は review スキルだけが持つ）。
5. **判定**：返ってきた JSON の `findings` のうち `severity` が blocking のものが0件なら手順 6。1件以上なら、その JSON を `implementer` に渡して直させ、手順 4 に戻る。修正は最大2回で、それでも残れば手順 9。
6. **PR**：`gh pr create --base main`。タイトルはコミットと同じ形、本文は「## 結果」の形式に `Closes #<n>` を足す。
7. **マージ**：
   - `gh pr checks <PR> --watch` で CI（check、e2e）が緑になるのを待つ。
   - レビューの `rubric` で P1 が該当した PR（ユーザーの確認が要るファイルを変えている）は、要約と PR のリンクを渡して、ユーザーが PR に「承認」とコメントするのを待つ（D123。`gh pr view <PR> --json comments` で owner のコメントを確かめる）。
   - `git worktree remove ../chess-analyzer-wt/<n>` で worktree を消し、本体の checkout で `gh pr merge <PR> --squash --delete-branch --author-email yotarotsukada@gmail.com`、`git pull --ff-only`。
8. **結果**：デプロイの結果を `gh run list --workflow Deploy` で確かめ、Issue の本文の末尾に「## 結果」を追記し（X11）、ユーザーに3行で報告する。
9. **止まるとき**：`stop-conditions.md` のどれかに当たったら、Issue に理由と選択肢をコメントして `needs-decision` ラベルを付け、このセッションでユーザーに聞く（AskUserQuestion）。

完了条件：PR がマージされ、worktree が消え、デプロイの結果を確かめ、Issue に「## 結果」がある。または、needs-decision でユーザーに聞いている。

## 「## 結果」の形式（D102、10行以内）

```markdown
## 結果

<1行の要約>

- 変わったこと：<利用者から見て>
- 理由：<なぜ>
- 関連する判断：D◯、ADR ◯
- 確かめた方法：<ユニット・E2E・CI・レビューの回数・本番の確認>
- 気になる点：<レビューの non_blocking のうち伝えるべきもの。なければ「なし」>
- ユーザーがやること：<あれば。なければ「なし」>
- 費用・データ・移行への影響：<あれば。なければ「なし」>
- PR：#<番号>
```

## Dependabot の PR

ユーザーに「依存の更新も」と言われたときだけ扱う。patch / minor で lockfile と package.json だけの変更なら、手順 3〜5 を省き、`scripts/verify.sh` と CI が通ればマージする（D105、D122）。それ以外は通常の手順で扱う。
