import { execFileSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "../..");
const main = root; // テストはリポジトリの checkout で動く。ブランチ名は git に聞く。

function decide(hook: string, toolInput: Record<string, string>, cwd = root): string {
  const out = execFileSync("node", [path.join(root, ".claude/hooks", hook)], {
    input: JSON.stringify({ cwd, tool_input: toolInput }),
    env: { ...process.env, CLAUDE_PROJECT_DIR: root },
    encoding: "utf8",
  });
  return out ? JSON.parse(out).hookSpecificOutput.permissionDecision : "allow";
}
const bash = (command: string, cwd?: string) => decide("guard-bash.mjs", { command }, cwd);
const edit = (file_path: string) => decide("guard-protected-paths.mjs", { file_path });

const onMain = execFileSync("git", ["-C", main, "branch", "--show-current"], { encoding: "utf8" }).trim() === "main";

describe("guard-bash: マージ", () => {
  it.each([
    ["gh pr merge 5 --squash --delete-branch --author-email yotarotsukada@gmail.com", "allow"],
    ["gh pr merge 5 -s -A yotarotsukada@gmail.com", "allow"],
    ["gh pr merge 5 --squash --author-email=yotarotsukada@gmail.com", "allow"],
    ["gh pr merge 5 --squash", "deny"],
    ["gh pr merge 5 --merge --author-email yotarotsukada@gmail.com", "deny"],
    ["gh pr merge 5 --squash --author-email yotarotsukada@gmail.com.evil", "deny"],
  ])("%s → %s", (cmd, want) => expect(bash(cmd)).toBe(want));
});

describe("guard-bash: コミットの作者", () => {
  it.each([
    ["GIT_AUTHOR_EMAIL=a@example.com git commit -m x", "deny"],
    ['git commit --author "a <a@example.com>" -m x', "deny"],
    ["git -c user.email=a@example.com commit -m x", "deny"],
    ["export GIT_AUTHOR_EMAIL=a@example.com; git commit -m x", "deny"],
    ["git config user.email a@example.com", "deny"],
  ])("%s → %s", (cmd, want) => expect(bash(cmd)).toBe(want));
});

describe("guard-bash: main への push", () => {
  it.each([
    ["git push origin feature:main", "deny"],
    ["git push origin main:main", "deny"],
    ["git push --set-upstream origin HEAD:main", "deny"],
    ["git push -u origin fix/main-menu", "allow"],
    ['bash -c "git push origin main"', "ask"],
  ])("%s → %s", (cmd, want) => expect(bash(cmd)).toBe(want));
});

describe.runIf(onMain)("guard-bash: main の checkout（このテストは main の上でだけ動く）", () => {
  it.each([
    ["git commit -m x", "deny"],
    ["env git commit -m x", "deny"],
    ["git push", "deny"],
    ["git push origin HEAD", "deny"],
  ])("%s → %s", (cmd, want) => expect(bash(cmd, main)).toBe(want));
});

describe("guard-bash: 文章の中の語をコマンドと取り違えない", () => {
  it.each([
    ['git commit -m "fly.toml の値 > 0 を確かめる"', "allow"],
    ["git commit -F - <<EOF\nfly.toml には触れない -> 確認\ngit push origin main\nEOF", "allow"],
    ["cat fly.toml 2>/dev/null", "allow"],
  ])("%s → %s", (cmd, want) => expect(bash(cmd)).toBe(want));
});

describe("guard-bash / guard-protected-paths: 確認が要るファイル", () => {
  it.each([
    ["echo x > fly.toml", "ask"],
    ["sed -i '' s/a/b/ docs/decisions.md", "ask"],
    ["rm -rf .claude/hooks", "ask"],
  ])("%s → %s", (cmd, want) => expect(bash(cmd)).toBe(want));

  it.each([
    ["docs/adr/0001-x.md", "ask"],
    ["docs/decisions.md", "ask"],
    ["fly.toml", "ask"],
    [".claude/skills/review/SKILL.md", "ask"],
    [".claude/settings.json", "ask"],
    ["app/domain/review.ts", "allow"],
    [".claude/settings.local.json", "allow"],
  ])("Edit %s → %s", (file, want) => expect(edit(path.join(root, file))).toBe(want));
});
