#!/usr/bin/env node
// ユーザーの確認が要るファイル（D120）の編集を止め、確認を求める。
// 判断の記録（ADR・台帳）、費用（fly.toml）、関門（レビューの観点）は、エージェントだけで変えない。
import path from "node:path";

const PROTECTED = [
  { test: (p) => p.startsWith("docs/adr/"), why: "ADR（判断の記録）" },
  { test: (p) => p === "docs/decisions.md", why: "台帳（判断の記録）" },
  { test: (p) => p === "fly.toml", why: "fly.toml（費用に直結）" },
  { test: (p) => p.startsWith(".claude/skills/review/"), why: "レビューの観点（マージの関門）" },
  { test: (p) => p.startsWith(".claude/hooks/") || p === ".claude/settings.json", why: "ハーネスの約束事（Hooks）" },
];

let data = "";
for await (const chunk of process.stdin) data += chunk;
const input = JSON.parse(data || "{}");
const file = input.tool_input?.file_path ?? input.tool_input?.notebook_path;
if (!file) process.exit(0);

// worktree の中のパスも、リポジトリの根からの相対パスで判定する。
const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
let rel = path
  .relative(root, path.resolve(input.cwd || root, file))
  .split(path.sep)
  .join("/");
const wt = rel.match(/^(?:\.\.\/)*chess-analyzer-wt\/[^/]+\/(.*)$/);
if (wt) rel = wt[1];

const hit = PROTECTED.find((p) => p.test(rel));
if (!hit) process.exit(0);

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "ask",
      permissionDecisionReason: `${rel} は ${hit.why} なので、ユーザーの確認が要る（D120）。変更の中身と理由をユーザーに説明し、このセッションで承認を得てから編集する。`,
    },
  }),
);
