---
paths:
  - "server/**"
  - "app/routes/api.*"
---

# server（Node 専用）

- ルートからは loader / action の中で `await import("@server/...")` する（クライアントのバンドルに入れない）。
- DB を定期的に叩く処理を足さない。Neon の自動休止が効かなくなる（D51）。確認や回収は、リクエストか Worker の起動をきっかけにする。
- 解析のジョブは pg-boss の1つのキューで、Worker の同時実行は1つ（D26、D80）。キューを増やさない。
- Worker の起動判定（`worker-control.ts`）と終了判定（`pendingCount`）は、新しい種類のジョブを足したら両方に含める（D81）。
