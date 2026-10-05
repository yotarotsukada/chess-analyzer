---
status: accepted
---

# Next.js を使わず、React Router on Vite のモノリスにする

Web フレームワークに Next.js は使わない。React Router（Vite 上のフレームワークモード）で、フロントからサーバーまで TypeScript で書き、1つのモノリスにする。

React で SSR をするなら Next.js が普通の選択肢で、AI エージェントもまず Next.js を提案する。それでも採用しないのは、ユーザーが Next.js を強く嫌っているからだ。加えて、React Router on Vite でもサーバー側まで TypeScript で完結できるので、困ることがない。

今はマイクロサービスにも分けない。解析 Worker も同じコードベースの中で、実行するマシンを分けているだけである（ADR 0001）。
