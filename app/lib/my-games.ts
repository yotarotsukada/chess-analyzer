/**
 * Visitor の「自分の対局一覧」と編集トークン（D49）。
 * localStorage は使えないことがある（プライベートブラウズなど）ので、失敗しても動くようにする。
 */
export type MyGame = { gameId: string; token: string; createdAt: string };

const KEY = "ca:v1:games";

export function loadMyGames(): MyGame[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(games: MyGame[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(games));
  } catch {
    // 保存できなくても、管理用リンクがあれば戻れる。
  }
}

export function saveMyGame(game: MyGame) {
  save([game, ...loadMyGames().filter((g) => g.gameId !== game.gameId)]);
}

export function removeMyGame(gameId: string) {
  save(loadMyGames().filter((g) => g.gameId !== gameId));
}

export function tokenFor(gameId: string): string | null {
  return loadMyGames().find((g) => g.gameId === gameId)?.token ?? null;
}

/** 管理用リンク。トークンはフラグメントに入れ、サーバーやログに送られないようにする（D49）。 */
export function manageUrl(origin: string, gameId: string, token: string): string {
  return `${origin}/g/${gameId}/manage#t=${token}`;
}
