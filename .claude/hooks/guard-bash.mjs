#!/usr/bin/env node
// Bash の実行前に、コミットとマージの約束事を守っているか確かめる（R2、D120）。
// 違反なら deny と正しいやり方を返す。ユーザーの確認が要るファイルの書き換えは ask を返す。
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

const AUTHOR_EMAIL = "yotarotsukada@gmail.com";
const PROTECTED =
  /(^|[\s/"'=])(docs\/adr(\/\S*)?|docs\/decisions\.md|fly\.toml|\.claude\/skills\/review(\/\S*)?|\.claude\/hooks(\/\S*)?|\.claude\/settings\.json)/;

function decide(permissionDecision, reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision, permissionDecisionReason: reason },
    }),
  );
  process.exit(0);
}
const deny = (reason) => decide("deny", reason);
const ask = (reason) => decide("ask", reason);

function git(cwd, ...args) {
  try {
    return execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

function unquote(s) {
  return s.replace(/^(["'])(.*)\1$/, "$2");
}

function resolveDir(base, raw) {
  let p = unquote(raw);
  if (p === "~" || p.startsWith("~/")) p = path.join(os.homedir(), p.slice(1));
  return path.resolve(base, p);
}

/** ヒアドキュメントの本文と、引用符の中身を空にする（文章の中の語をコマンドと取り違えないため）。 */
function stripText(cmd) {
  let s = cmd.replace(/<<-?\s*(['"]?)(\w+)\1[^\n]*\n[\s\S]*?\n\s*\2(?=\n|$)/g, "<<HEREDOC");
  s = s.replace(/"(?:[^"\\]|\\.)*"/g, '""').replace(/'[^']*'/g, "''");
  return s;
}

let data = "";
for await (const chunk of process.stdin) data += chunk;
const input = JSON.parse(data || "{}");
const raw = String(input.tool_input?.command ?? "");
let cwd = input.cwd || process.cwd();

// 保護したファイルへの書き込み（リダイレクト先、または書き換えるコマンドの引数）を ask にする。
const structural = raw.replace(/<<-?\s*(['"]?)(\w+)\1[^\n]*\n[\s\S]*?\n\s*\2(?=\n|$)/g, "<<HEREDOC");
const redirectToProtected = new RegExp(`>>?\\s*["']?\\S*?${PROTECTED.source.slice(PROTECTED.source.indexOf("(docs"))}`);
const writerOnProtected =
  /\b(sed\s+-i|tee|mv|cp|rm|git\s+(rm|mv|checkout|restore))\b[^|;&]*/.exec(structural)?.[0]?.match(PROTECTED) ?? null;
const scriptWritesProtected =
  /\b(python3?|node|perl)\b/.test(structural) && /\b(write|open\(|writeFile)/.test(raw) && PROTECTED.test(raw);
if (redirectToProtected.test(structural) || writerOnProtected || scriptWritesProtected) {
  ask(
    "ユーザーの確認が要るファイル（ADR・台帳・fly.toml・レビューの観点・Hooks）をシェルで書き換えようとしている（D120）。変更の中身と理由をユーザーに説明し、承認を得てから実行する。",
  );
}

// 1つのコマンド文字列に複数のコマンドが連なっていても、それぞれを確かめる。
const parts = stripText(raw)
  .split(/&&|\|\||;|\n|\|/)
  .map((s) =>
    s
      .trim()
      .replace(/^\(+\s*/, "")
      .replace(/\s*\)+$/, ""),
  );
const originals = raw
  .replace(/<<-?\s*(['"]?)(\w+)\1[^\n]*\n[\s\S]*?\n\s*\2(?=\n|$)/g, "<<HEREDOC")
  .split(/&&|\|\||;|\n|\|/)
  .map((s) =>
    s
      .trim()
      .replace(/^\(+\s*/, "")
      .replace(/\s*\)+$/, ""),
  );

for (let i = 0; i < parts.length; i++) {
  let part = parts[i];
  let orig = originals[i] ?? part;

  const cd = orig.match(/^cd\s+(.+)$/);
  if (cd) {
    cwd = resolveDir(cwd, cd[1].trim());
    continue;
  }

  // `bash -c` / `sh -c` の中身は追えないので、git の操作を含むなら確認に回す。
  if (/^(ba|z)?sh\s+-c\b/.test(orig) && /\bgit\b|\bgh\s+pr\b/.test(orig)) {
    ask("シェルを入れ子にした git / gh の操作は、ガードで確かめられない。`git -C <パス> ...` の形で直接実行する。");
  }
  if (/^export\s+GIT_(AUTHOR|COMMITTER)_EMAIL=/.test(orig) && !orig.includes(AUTHOR_EMAIL)) {
    deny(`コミットの作者のメールアドレスは ${AUTHOR_EMAIL} だけを使う。`);
  }
  // `env` や `command`、絶対パスの git を、ふつうの git として扱う。
  orig = orig.replace(/^(env|command)\s+/, "").replace(/^\S*\/git\s/, "git ");
  part = part.replace(/^(env|command)\s+/, "").replace(/^\S*\/git\s/, "git ");

  // 先頭の環境変数（VAR=value）を外す。作者を変える変数は確かめる。
  const envs = [];
  while (/^[A-Za-z_][A-Za-z0-9_]*=\S*\s+/.test(orig)) {
    envs.push(orig.match(/^([A-Za-z_][A-Za-z0-9_]*)=(\S*)/));
    orig = orig.replace(/^[A-Za-z_][A-Za-z0-9_]*=\S*\s+/, "");
    part = part.replace(/^[A-Za-z_][A-Za-z0-9_]*=\S*\s+/, "");
  }

  let gitCwd = cwd;
  const gitC = orig.match(/^git\s+-C\s+("[^"]+"|'[^']+'|\S+)\s+(.*)$/);
  if (gitC) {
    gitCwd = resolveDir(cwd, gitC[1]);
    orig = `git ${gitC[2]}`;
    part = `git ${part.replace(/^git\s+-C\s+\S+\s+/, "")}`;
  }

  if (/^git\s+config\b.*\buser\.email\b\s+\S+/.test(orig) && !orig.includes(AUTHOR_EMAIL)) {
    deny(`コミットの作者のメールアドレスは ${AUTHOR_EMAIL} だけを使う（会社のアドレスを履歴に残さない）。`);
  }

  if (/^git\s+(-c\s+\S+\s+)*commit\b/.test(part)) {
    const branch = git(gitCwd, "branch", "--show-current");
    if (branch === null) {
      deny(`作業場所（${gitCwd}）を解決できない。\`git -C <worktree の絶対パス> commit ...\` の形で実行する。`);
    }
    const overrides = [
      orig.match(/user\.email=(\S+)/)?.[1],
      orig.match(/--author[=\s]+["']?[^<]*<([^>]+)>/)?.[1],
      ...envs.filter((e) => /^GIT_(AUTHOR|COMMITTER)_EMAIL$/.test(e[1])).map((e) => unquote(e[2])),
    ].filter(Boolean);
    const email = git(gitCwd, "config", "user.email");
    for (const e of [email, ...overrides]) {
      if (e !== AUTHOR_EMAIL) {
        deny(
          `コミットの作者が ${e || "(未設定)"} になる。作者は ${AUTHOR_EMAIL} だけを使う（\`git -C <worktree> config user.email ${AUTHOR_EMAIL}\`）。`,
        );
      }
    }
    if (branch === "main") {
      deny(
        "main に直接コミットしない。Issue ごとに worktree とブランチを切り、PR で main に入れる（issue-loop スキル）。",
      );
    }
  }

  if (/^git\s+push\b/.test(part)) {
    const args = part
      .split(/\s+/)
      .slice(2)
      .filter((a) => !a.startsWith("-"));
    const refspecs = args.slice(1); // 最初の引数はリモート
    const targetsMain = refspecs.some((r) => /(^|:)\+?(refs\/heads\/)?main$/.test(r));
    const onMain = git(gitCwd, "branch", "--show-current") === "main";
    const implicit = refspecs.length === 0 || refspecs.some((r) => r === "HEAD" || r === "@");
    if (targetsMain || (onMain && implicit)) {
      deny("main に直接 push しない。作業ブランチを push して PR を作る。main への反映は gh pr merge で行う。");
    }
    if (/\s(--force|-f)(\s|$)/.test(` ${part} `) && !part.includes("--force-with-lease")) {
      deny("強制 push は --force-with-lease を使う（作業ブランチに限る）。");
    }
  }

  if (/^gh\s+pr\s+merge\b/.test(part)) {
    const squash = /\s(--squash|-s)(\s|$)/.test(` ${orig} `);
    const escaped = AUTHOR_EMAIL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const author = new RegExp(`(--author-email|-A)[=\\s]+["']?${escaped}["']?(\\s|$)`).test(orig);
    if (!squash || !author) {
      deny(
        `マージは squash で、作者を gmail にする: \`gh pr merge <番号> --squash --delete-branch --author-email ${AUTHOR_EMAIL}\`。マージ前に issue-loop スキルの関門をすべて通すこと。`,
      );
    }
  }
}
process.exit(0);
