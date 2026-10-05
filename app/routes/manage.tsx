import { useEffect, useState } from "react";
import { data, Link, useFetcher, useNavigate } from "react-router";
import { t } from "~/i18n";
import { removeMyGame, saveMyGame, tokenFor } from "~/lib/my-games";
import type { Route } from "./+types/manage";

export function meta() {
  return [{ title: `${t("manage.title")} | ${t("app.name")}` }, { name: "robots", content: "noindex, nofollow" }];
}

export async function loader({ params }: Route.LoaderArgs) {
  const { isGameId } = await import("@server/ids");
  const { getGame } = await import("@server/games");
  if (!isGameId(params.id)) throw data(null, { status: 404 });
  const row = await getGame(params.id);
  if (!row) throw data(null, { status: 404 });
  return { id: row.games.id, playerColor: row.games.playerColor };
}

/** トークンは URL ではなくフォームの本文で送る（D49）。 */
export async function action({ params, request }: Route.ActionArgs) {
  const { deleteGame, updatePlayerColor } = await import("@server/games");
  const form = await request.formData();
  const token = String(form.get("token") ?? "");
  const intent = form.get("intent");
  if (intent === "delete") {
    return (await deleteGame(params.id, token)) ? { ok: true as const, intent } : { ok: false as const };
  }
  if (intent === "color") {
    const color = form.get("playerColor") === "black" ? "black" : "white";
    return (await updatePlayerColor(params.id, token, color)) ? { ok: true as const, intent } : { ok: false as const };
  }
  throw data(null, { status: 400 });
}

export default function Manage({ loaderData }: Route.ComponentProps) {
  const { id } = loaderData;
  // undefined は読み込み前。SSR と初回描画で「リンクから開いてください」を出さないため。
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [confirming, setConfirming] = useState(false);
  const fetcher = useFetcher<typeof action>();
  const navigate = useNavigate();

  useEffect(() => {
    // 管理用リンクのトークンを URL から消す（D49）。保存済みのトークンは、照合に成功するまで上書きしない。
    const m = window.location.hash.match(/t=([A-Za-z0-9_-]+)/);
    if (m) window.history.replaceState(null, "", window.location.pathname);
    const stored = tokenFor(id);
    if (m && !stored) saveMyGame({ gameId: id, token: m[1], createdAt: new Date().toISOString() });
    setToken(m?.[1] ?? stored);
  }, [id]);

  useEffect(() => {
    if (!fetcher.data?.ok || !token) return;
    if (fetcher.data.intent === "delete") {
      removeMyGame(id);
      navigate("/");
    } else if (tokenFor(id) !== token) {
      saveMyGame({ gameId: id, token, createdAt: new Date().toISOString() });
    }
  }, [fetcher.data, id, navigate, token]);

  return (
    <main className="flex max-w-xl flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("manage.title")}</h1>
      {token === undefined ? (
        <p className="text-muted">{t("manage.loading")}</p>
      ) : !token ? (
        <p>{t("manage.noToken")}</p>
      ) : (
        <>
          <fetcher.Form method="post" className="flex flex-col gap-3 rounded-lg border border-line bg-card p-4">
            <h2 className="font-bold">{t("manage.colorTitle")}</h2>
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="intent" value="color" />
            <div className="flex gap-4">
              {(["white", "black"] as const).map((c) => (
                <label key={c} className="flex items-center gap-1">
                  <input type="radio" name="playerColor" value={c} defaultChecked={loaderData.playerColor === c} />
                  {t(c === "white" ? "new.white" : "new.black")}
                </label>
              ))}
            </div>
            <button type="submit" className="self-start rounded-full bg-ink px-4 py-1.5 text-sm font-bold text-paper">
              {t("manage.colorSave")}
            </button>
            {fetcher.data?.ok && fetcher.data.intent === "color" ? (
              <p className="text-sm text-green">{t("manage.colorSaved")}</p>
            ) : null}
          </fetcher.Form>

          <div className="flex flex-col gap-3 rounded-lg border border-line bg-card p-4">
            <h2 className="font-bold">{t("manage.deleteTitle")}</h2>
            {confirming ? (
              <fetcher.Form method="post" className="flex gap-2">
                <input type="hidden" name="token" value={token} />
                <input type="hidden" name="intent" value="delete" />
                <button type="submit" className="rounded-full bg-red px-4 py-1.5 text-sm font-bold text-paper">
                  {t("manage.deleteConfirm")}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="rounded-full border border-line-strong px-4 py-1.5 text-sm"
                >
                  {t("manage.deleteCancel")}
                </button>
              </fetcher.Form>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="self-start rounded-full border border-red px-4 py-1.5 text-sm text-red"
              >
                {t("manage.delete")}
              </button>
            )}
          </div>
          {fetcher.data && !fetcher.data.ok ? (
            <p role="alert" className="text-red">
              {t("manage.forbidden")}
            </p>
          ) : null}
          <p className="text-sm text-muted">{t("manage.storageNote")}</p>
        </>
      )}
      <Link to={`/g/${id}`} className="underline">
        {t("manage.back")}
      </Link>
    </main>
  );
}
