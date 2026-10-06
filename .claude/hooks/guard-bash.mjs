#!/usr/bin/env node
// Bash の実行前に、コミットとマージの約束事を守っているか確かめる（R2、D120）。
// 違反なら permissionDecision: "deny" と、正しいやり方を返す。
import { execFileSync } from "node:child_process";

const AUTHOR_EMAIL = "yotarotsukada@gmail.com";

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.on("data", (c) => (data += c));
    process.stdin.on("end", () => resolve(data));
  });
}

function git(cwd, ...args) {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: reason },
    }),
  );
  process.exit(0);
}

function ask(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "ask", permissionDecisionReason: reason },
    }),
  );
  process.exit(0);
}

// ユーザーの確認が要るファイル（D120）。Edit / Write は guard-protected-paths.mjs が見る。
const PROTECTED =
  /(docs\/adr\/|docs\/decisions\.md|fly\.toml|\.claude\/skills\/review\/|\.claude\/hooks\/|\.claude\/settings\.json)/;
const WRITES =
  /(\bsed\s+-i|\btee\b|>>?|\bmv\b|\bcp\b|\brm\b|\bpython3?\b|\bnode\b|\bperl\b|\bgit\s+(rm|mv|checkout|restore)\b)/;

const input = JSON.parse((await readStdin()) || "{}");
const cmd = String(input.tool_input?.command ?? "");
let cwd = input.cwd || process.cwd();

if (PROTECTED.test(cmd) && WRITES.test(cmd)) {
  ask(
    "ユーザーの確認が要るファイル（ADR・台帳・fly.toml・レビューの観点・Hooks）をシェルで書き換えようとしている（D120）。変更の中身と理由をユーザーに説明し、承認を得てから実行する。",
  );
}

// 1つのコマンド文字列に複数のコマンドが連なっていても、それぞれを確かめる。
// `cd <dir>` と `git -C <dir>` で作業場所が変わるのを追う。
const parts = cmd.split(/&&|\|\||;|\n/).map((s) => s.trim());

for (let part of parts) {
  const cd = part.match(/^cd\s+("?)([^"]+)\1$/);
  if (cd) {
    cwd = cd[2].startsWith("/") ? cd[2] : `${cwd}/${cd[2]}`;
    continue;
  }
  const gitC = part.match(/^git\s+-C\s+(\S+)\s+(.*)$/);
  let gitCwd = cwd;
  if (gitC) {
    gitCwd = gitC[1].startsWith("/") ? gitC[1] : `${cwd}/${gitC[1]}`;
    part = `git ${gitC[2]}`;
  }
  if (/^git\s+config\b.*\buser\.email\b\s+\S+/.test(part) && !part.includes(AUTHOR_EMAIL)) {
    deny(`コミットの作者のメールアドレスは ${AUTHOR_EMAIL} だけを使う（会社のアドレスを履歴に残さない）。`);
  }

  if (/^git\s+(-c\s+\S+\s+)*commit\b/.test(part)) {
    const email = part.match(/user\.email=(\S+)/)?.[1] ?? git(gitCwd, "config", "user.email");
    if (email !== AUTHOR_EMAIL) {
      deny(
        `コミットの作者が ${email || "(未設定)"} になっている。\`git config user.email ${AUTHOR_EMAIL}\` を設定してからコミットする。`,
      );
    }
    if (git(gitCwd, "branch", "--show-current") === "main") {
      deny(
        "main に直接コミットしない。Issue ごとに worktree とブランチを切り、PR で main に入れる（issue-loop スキル）。",
      );
    }
  }

  if (/^git\s+push\b/.test(part)) {
    const pushesMain =
      /\s(origin\s+)?(HEAD:)?(refs\/heads\/)?main(\s|$)/.test(` ${part} `) ||
      (git(gitCwd, "branch", "--show-current") === "main" &&
        !/\s(origin\s+)?\S+:/.test(part) &&
        /^git\s+push(\s+-\S+)*(\s+origin)?\s*$/.test(part));
    if (pushesMain) {
      deny("main に直接 push しない。作業ブランチを push して PR を作る。main への反映は gh pr merge で行う。");
    }
    if (/\s--force(\s|$)|\s-f(\s|$)/.test(part) && !/--force-with-lease/.test(part)) {
      deny("強制 push は --force-with-lease を使う（作業ブランチに限る）。");
    }
  }

  if (/^gh\s+pr\s+merge\b/.test(part)) {
    const squash = /\s--squash(\s|$)|\s-s(\s|$)/.test(` ${part} `);
    const author = part.includes(`--author-email ${AUTHOR_EMAIL}`) || part.includes(`-A ${AUTHOR_EMAIL}`);
    if (!squash || !author) {
      deny(
        `マージは squash で、作者を gmail にする: \`gh pr merge <番号> --squash --delete-branch --author-email ${AUTHOR_EMAIL}\`。マージ前に issue-loop スキルの関門をすべて通すこと。`,
      );
    }
  }
}
process.exit(0);
