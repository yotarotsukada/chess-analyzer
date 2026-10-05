# Web と解析 Worker で共通のイメージ（ADR 0001）。Fly の process group で役割を分ける。
FROM node:24-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable && corepack prepare pnpm@10.4.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm build

FROM base AS runtime
# Stockfish はバージョンを固定する（D27）。bookworm の stockfish パッケージは 15.1。
RUN apt-get update \
  && apt-get install -y --no-install-recommends stockfish=15.1-4 \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production STOCKFISH_PATH=/usr/games/stockfish
COPY package.json pnpm-lock.yaml ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY app ./app
COPY server ./server
COPY tsconfig.json ./
EXPOSE 3000
CMD ["pnpm", "start"]
