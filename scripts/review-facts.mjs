#!/usr/bin/env node
// レビューの前に、差分から機械的に分かる事実を集めて JSON で出す（review スキルの入力）。
// 判断はしない。レビュー役が毎回同じ事実から出発できるようにするためのもの。
// 使い方: node scripts/review-facts.mjs [base]   （base の既定は origin/main）
import { execFileSync } from "node:child_process";

const base = process.argv[2] ?? "origin/main";
const sh = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const range = `${base}...HEAD`;

const files = sh("diff", "--name-status", range)
  .trim()
  .split("\n")
  .filter(Boolean)
  .map((l) => {
    const [status, ...rest] = l.split("\t");
    return { status: status[0], path: rest.at(-1) };
  });

// `.claude/rules/*.md` の paths と同じ区分。どの決まりに照らすかを決める。
const AREAS = [
  ["domain", /^(app\/domain\/|tests\/unit\/)/],
  ["server", /^(server\/|app\/routes\/api\.)/],
  ["migrations", /^(server\/db\/|drizzle\.config\.ts)/],
  ["ui", /^(app\/routes\/|app\/components\/|app\/i18n\/|e2e\/)/],
  ["harness", /^(\.claude\/|scripts\/|\.github\/|CLAUDE\.md)/],
  ["infra", /^(Dockerfile|docker-compose\.yml|fly\.toml|package\.json|pnpm-lock\.yaml)/],
  ["docs", /^(docs\/|CONTEXT\.md|README\.md)/],
];
const PROTECTED =
  /^(docs\/adr\/|docs\/decisions\.md$|fly\.toml$|\.claude\/skills\/review\/|\.claude\/hooks\/|\.claude\/settings\.json$)/;

const diffOf = (p) => sh("diff", "-U0", range, "--", p);
const added = (d) => d.split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++"));
const removed = (d) => d.split("\n").filter((l) => l.startsWith("-") && !l.startsWith("---"));

const facts = {
  base,
  files: files.map((f) => ({
    ...f,
    areas: AREAS.filter(([, re]) => re.test(f.path)).map(([a]) => a),
    needsUserApproval: PROTECTED.test(f.path),
  })),
  removedTests: [],
  skippedOrFocusedTests: [],
  migrationsAdded: [],
  stockfishVersionChanged: false,
  domainFilesWithoutTestChange: [],
  hardcodedJapaneseInUi: [],
};

const testFileChanged = files.some((f) => /^tests\/unit\//.test(f.path));
for (const f of files) {
  if (f.status === "D") {
    if (/\.(test|spec)\.(ts|tsx|js|mjs)$/.test(f.path))
      facts.removedTests.push({ path: f.path, line: "(ファイルごと削除)" });
    continue;
  }
  const d = diffOf(f.path);
  if (/\.(test|spec)\.(ts|tsx|js|mjs)$/.test(f.path)) {
    for (const l of removed(d))
      if (/\b(it|test)(\.each)?\s*\(/.test(l)) facts.removedTests.push({ path: f.path, line: l.slice(1).trim() });
    for (const l of added(d))
      if (/\.(skip|only|todo)\s*\(|\bxit\s*\(/.test(l))
        facts.skippedOrFocusedTests.push({ path: f.path, line: l.slice(1).trim() });
  }
  if (/^server\/db\/migrations\/.*\.sql$/.test(f.path) && f.status === "A") facts.migrationsAdded.push(f.path);
  if (f.path === "Dockerfile" && [...added(d), ...removed(d)].some((l) => /stockfish/i.test(l)))
    facts.stockfishVersionChanged = true;
  if (/^app\/domain\/.*\.ts$/.test(f.path) && !testFileChanged) facts.domainFilesWithoutTestChange.push(f.path);
  if (/^app\/(routes|components)\/.*\.tsx$/.test(f.path)) {
    for (const l of added(d)) {
      // コメント以外で、日本語を含む文字列やテキストを足した行。
      if (/[぀-ヿ一-鿿]/.test(l) && !/^\+\s*(\/\/|\/\*|\*|\{\/\*)/.test(l)) {
        facts.hardcodedJapaneseInUi.push({ path: f.path, line: l.slice(1).trim() });
      }
    }
  }
}

process.stdout.write(`${JSON.stringify(facts, null, 2)}\n`);
