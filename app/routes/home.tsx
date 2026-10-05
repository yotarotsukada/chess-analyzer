import { useEffect, useState } from "react";
import { Link } from "react-router";
import { t } from "~/i18n";
import { loadMyGames, type MyGame } from "~/lib/my-games";

export function meta() {
  return [{ title: `${t("app.name")} | ${t("app.tagline")}` }, { name: "description", content: t("app.description") }];
}

export default function Home() {
  const [games, setGames] = useState<MyGame[] | null>(null);
  useEffect(() => setGames(loadMyGames()), []);
  return (
    <main className="flex flex-col gap-10">
      <section className="flex flex-col gap-4 rounded-2xl bg-ink px-6 py-12 text-paper sm:px-10">
        <h1 className="text-4xl font-bold leading-tight sm:text-5xl">{t("app.tagline")}</h1>
        <p className="max-w-2xl text-lg opacity-85">{t("app.description")}</p>
        <Link to="/new" className="self-start rounded-full bg-amber px-6 py-2.5 font-bold text-ink">
          {t("home.cta")}
        </Link>
      </section>

      <ol className="grid gap-4 sm:grid-cols-3">
        {(["home.how.1", "home.how.2", "home.how.3"] as const).map((k, i) => (
          <li key={k} className="flex flex-col gap-2 rounded-xl border border-line bg-card p-5">
            <span className="text-2xl font-bold text-green">{i + 1}</span>
            <p>{t(k)}</p>
          </li>
        ))}
      </ol>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">{t("home.myGames")}</h2>
        {games === null ? null : games.length === 0 ? (
          <p className="text-muted">{t("home.myGames.empty")}</p>
        ) : (
          <ul className="flex flex-col gap-2" data-testid="my-games">
            {games.map((g) => (
              <li key={g.gameId}>
                <Link
                  to={`/g/${g.gameId}`}
                  className="flex justify-between rounded-lg border border-line bg-card px-4 py-3 hover:bg-paper-2"
                >
                  <span className="font-mono text-sm">{g.gameId}</span>
                  <span className="text-sm text-muted">{new Date(g.createdAt).toLocaleString("ja-JP")}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className="text-sm text-muted">{t("home.myGames.note")}</p>
      </section>
    </main>
  );
}
