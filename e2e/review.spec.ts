import { expect, type Page, test } from "@playwright/test";

const SCHOLARS_MATE = `[Event "Casual"]
[White "SomeRealName"]
[Black "Another"]
[Result "1-0"]

1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0`;

async function waitForAnalysis(page: Page) {
  await expect(page.getByTestId("analysis-status")).toBeHidden({ timeout: 90_000 });
}

test("PGN を貼り付けると Game Review が表示され、悪手が強調される", async ({ page }) => {
  await page.goto("/new");
  await page.getByRole("button", { name: "PGN を貼り付け" }).click();
  await page.getByLabel("PGN を貼り付け").fill(SCHOLARS_MATE);
  await page.getByLabel("黒").check();
  await page.getByRole("button", { name: "解析する" }).click();

  await page.waitForURL(/\/g\/[0-9A-Za-z]{12}$/);
  await waitForAnalysis(page);

  // 3... Nf6?? は黒（Player）の大悪手。
  const nf6 = page.getByTestId("move-6");
  await expect(nf6).toContainText("Nf6");
  await expect(nf6).toContainText("大悪手");
  await nf6.click();
  await expect(page.getByTestId("move-detail")).toContainText("候補手");
  await expect(page.getByTestId("move-detail")).toContainText("Qxf7#");

  // 名前は保存されない（D40）。
  await expect(page.locator("body")).not.toContainText("SomeRealName");
  // 検索エンジンに載せない（D30）。
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("盤をクリックして手入力し、自分の対局一覧と管理用リンクから削除できる", async ({ page }) => {
  await page.goto("/new");
  const board = page.getByTestId("board");
  for (const [from, to] of [
    ["e2", "e4"],
    ["e7", "e5"],
    ["g1", "f3"],
  ]) {
    await board.locator(`[data-square="${from}"]`).click();
    await board.locator(`[data-square="${to}"]`).click();
  }
  await expect(page.getByTestId("entered-moves")).toContainText("1. e4 e5");
  await expect(page.getByTestId("entered-moves")).toContainText("2. Nf3");
  await page.getByRole("button", { name: "解析する" }).click();
  await page.waitForURL(/\/g\/[0-9A-Za-z]{12}$/);
  const gameUrl = page.url();
  await waitForAnalysis(page);

  await page.goto("/");
  await expect(page.getByTestId("my-games")).toBeVisible();

  await page.goto(gameUrl);
  await page.getByRole("link", { name: "対局の管理" }).click();
  await page.waitForURL(/\/manage$/);
  await page.getByRole("button", { name: "削除する" }).click();
  await page.getByRole("button", { name: "本当に削除する" }).click();
  await page.waitForURL((u) => u.pathname === "/");
  const res = await page.goto(gameUrl);
  expect(res?.status()).toBe(404);
});

test("管理用リンクのトークンが違えば削除できない", async ({ page }) => {
  await page.goto("/new");
  await page.getByRole("button", { name: "PGN を貼り付け" }).click();
  await page.getByLabel("PGN を貼り付け").fill("1. d4 d5 2. c4 *");
  await page.getByRole("button", { name: "解析する" }).click();
  await page.waitForURL(/\/g\/[0-9A-Za-z]{12}$/);
  const id = new URL(page.url()).pathname.split("/")[2];

  await page.evaluate(() => window.localStorage.clear());
  await page.goto(`/g/${id}/manage#t=wrong-token`);
  await expect(page).toHaveURL(new RegExp(`/g/${id}/manage$`));
  await page.getByRole("button", { name: "削除する" }).click();
  await page.getByRole("button", { name: "本当に削除する" }).click();
  await expect(page.getByRole("alert")).toContainText("管理用リンクが正しくありません");
});
