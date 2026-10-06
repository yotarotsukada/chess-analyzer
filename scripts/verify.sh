#!/usr/bin/env bash
# マージ前のローカルの関門（D121 の (3)）。lint・型・ユニット・Docker 上の E2E をまとめて回す。
# 使い方: scripts/verify.sh          すべて
#         SKIP_E2E=1 scripts/verify.sh  E2E を省く（途中の確認用。マージ前は必ずすべて）
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

pnpm install --frozen-lockfile --silent
pnpm lint
pnpm typecheck
pnpm test

if [[ "${SKIP_E2E:-}" == "1" ]]; then
  echo "verify: E2E を省いた（SKIP_E2E=1）"
  exit 0
fi

# worktree が違っても同じ名前のスタックを使い、ポートを取り合わないようにする。
export COMPOSE_PROJECT_NAME=chess-analyzer
docker compose up -d --build --wait web worker
# 不安定なテストでループを止めないよう、1回だけ再試行する（D107）。
pnpm test:e2e --retries=1
echo "verify: すべて通った"
