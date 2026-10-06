---
paths:
  - ".claude/**"
  - "scripts/**"
  - ".github/**"
  - "CLAUDE.md"
---

# ハーネス（Hooks・Skills・Agents・Rules・スクリプト）

- Hooks（`.claude/hooks/`）を変えたら、`tests/unit/hooks.test.ts` に許可・拒否・確認のケースを足す。誤って止めるケース（正しい作業を拒否する）も必ず入れる。
- 1つの手順や基準は1か所にだけ書く。進行は `issue-loop`、実装の手順は `implementer`、止まる条件は `issue-loop/stop-conditions.md`、レビューの基準は `review` スキル、パスごとの決まりは `.claude/rules/`。ほかの場所からはパスで指す。
- スキルとエージェントの手順には、完了条件を書く。
- シェルのスクリプトは `set -euo pipefail` で始める。
