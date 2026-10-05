import { useEffect, useState } from "react";
import { data, Form, useActionData, useNavigate, useNavigation } from "react-router";
import { MoveEntry } from "~/components/MoveEntry";
import { GAME_SOURCES, type GameResult, OPPONENT_TYPES, TERMINATIONS, type Termination } from "~/domain/types";
import { type MessageKey, t } from "~/i18n";
import { saveMyGame } from "~/lib/my-games";
import type { Route } from "./+types/new";

export function meta() {
  return [{ title: `${t("new.title")} | ${t("app.name")}` }];
}

type ActionResult = { ok: true; id: string; token: string } | { ok: false; error: MessageKey };

function toResult(raw: string, player: "white" | "black"): GameResult | null {
  if (raw === "draw") return "1/2-1/2";
  if (raw === "win") return player === "white" ? "1-0" : "0-1";
  if (raw === "loss") return player === "white" ? "0-1" : "1-0";
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const { createGame, InvalidGameError } = await import("@server/games");
  const { parsePgn, PgnParseError } = await import("~/domain/pgn");
  const { RateLimitError, clientIp, ipKey } = await import("@server/rate-limit");
  const { browserIdCookie, getBrowserId } = await import("@server/cookies");

  const form = await request.formData();
  const str = (k: string) => String(form.get(k) ?? "");
  const playerColor = str("playerColor") === "black" ? "black" : "white";
  const gameSource = (GAME_SOURCES as readonly string[]).includes(str("gameSource"))
    ? (str("gameSource") as (typeof GAME_SOURCES)[number])
    : "other";
  const opponentType = (OPPONENT_TYPES as readonly string[]).includes(str("opponentType"))
    ? (str("opponentType") as (typeof OPPONENT_TYPES)[number])
    : "unknown";
  const playedOn = /^\d{4}-\d{2}-\d{2}$/.test(str("playedOn")) ? str("playedOn") : null;
  const browser = await getBrowserId(request);
  const headers = browser.isNew ? { "Set-Cookie": await browserIdCookie.serialize(browser.id) } : undefined;
  const fail = (error: MessageKey, status = 400) => data<ActionResult>({ ok: false, error }, { status, headers });

  let base: {
    startFen: string | null;
    moves: string[];
    result: GameResult | null;
    termination: Termination | null;
    playedOn: string | null;
  };
  const importMethod = str("importMethod") === "pgn" ? "pgn" : "manual";
  if (importMethod === "pgn") {
    try {
      const parsed = parsePgn(str("pgn"));
      base = { ...parsed, playedOn: playedOn ?? parsed.date };
    } catch (e) {
      if (e instanceof PgnParseError) return fail("error.pgn");
      throw e;
    }
  } else {
    const term = str("termination");
    base = {
      startFen: null,
      moves: str("moves").split(" ").filter(Boolean),
      result: toResult(str("result"), playerColor),
      termination: (TERMINATIONS as readonly string[]).includes(term) ? (term as Termination) : null,
      playedOn,
    };
  }
  if (importMethod === "pgn" && str("result")) {
    base.result = toResult(str("result"), playerColor) ?? base.result;
  }

  try {
    const { id, token } = await createGame(
      { ...base, playerColor, gameSource, opponentType, importMethod },
      { browserId: browser.id, ip: ipKey(clientIp(request)) },
    );
    return data<ActionResult>({ ok: true, id, token }, { headers });
  } catch (e) {
    if (e instanceof InvalidGameError) return fail(`error.${e.message}` as MessageKey);
    if (e instanceof RateLimitError) return fail(`error.limit.${e.scope}` as MessageKey, 429);
    throw e;
  }
}

const field = "flex flex-col gap-1 text-sm";
const input = "rounded border border-line-strong bg-card px-3 py-2";

export default function NewGame() {
  const result = useActionData<typeof action>();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"manual" | "pgn">("manual");
  const [moves, setMoves] = useState<string[]>([]);
  const [playerColor, setPlayerColor] = useState<"white" | "black">("white");

  useEffect(() => {
    if (result?.ok) {
      saveMyGame({ gameId: result.id, token: result.token, createdAt: new Date().toISOString() });
      navigate(`/g/${result.id}`);
    }
  }, [result, navigate]);

  const submitting = navigation.state === "submitting";
  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("new.title")}</h1>
      <div className="flex gap-2">
        {(["manual", "pgn"] as const).map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={tab === k}
            onClick={() => setTab(k)}
            className={`rounded-full px-4 py-1.5 text-sm font-bold ${tab === k ? "bg-ink text-paper" : "border border-line-strong bg-card"}`}
          >
            {t(k === "manual" ? "new.tab.manual" : "new.tab.pgn")}
          </button>
        ))}
      </div>

      <Form method="post" className="flex flex-col gap-6">
        <input type="hidden" name="importMethod" value={tab} />
        <fieldset className="flex flex-wrap items-center gap-4">
          <legend className="sr-only">{t("new.playerColor")}</legend>
          <span className="font-bold" aria-hidden>
            {t("new.playerColor")}
          </span>
          {(["white", "black"] as const).map((c) => (
            <label key={c} className="flex items-center gap-1">
              <input
                type="radio"
                name="playerColor"
                value={c}
                checked={playerColor === c}
                onChange={() => setPlayerColor(c)}
              />
              {t(c === "white" ? "new.white" : "new.black")}
            </label>
          ))}
        </fieldset>
        {tab === "manual" ? (
          <>
            <MoveEntry moves={moves} onChange={setMoves} orientation={playerColor} />
            <input type="hidden" name="moves" value={moves.join(" ")} />
          </>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted">{t("new.pgn.help")}</p>
            <textarea
              name="pgn"
              required
              rows={10}
              className={`${input} font-mono`}
              placeholder={t("new.pgn.placeholder")}
              aria-label={t("new.tab.pgn")}
            />
          </div>
        )}

        <fieldset className="grid gap-4 rounded-lg border border-line bg-card p-4 sm:grid-cols-2">
          <legend className="sr-only">{t("new.title")}</legend>
          <label className={field}>
            <span className="font-bold">{t("new.gameSource")}</span>
            <select name="gameSource" defaultValue="duolingo" className={input}>
              {GAME_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {t(`source.${s}`)}
                </option>
              ))}
            </select>
          </label>
          <label className={field}>
            <span>{t("new.opponentType")}</span>
            <select name="opponentType" defaultValue="unknown" className={input}>
              {OPPONENT_TYPES.map((s) => (
                <option key={s} value={s}>
                  {t(`opponent.${s}`)}
                </option>
              ))}
            </select>
          </label>
          <label className={field}>
            <span>{t("new.result")}</span>
            <select name="result" defaultValue="" className={input}>
              <option value="">{t("result.unknown")}</option>
              <option value="win">{t("result.win")}</option>
              <option value="loss">{t("result.loss")}</option>
              <option value="draw">{t("result.draw")}</option>
            </select>
          </label>
          {tab === "manual" ? (
            <label className={field}>
              <span>{t("new.termination")}</span>
              <select name="termination" defaultValue="" className={input}>
                <option value="">{t("termination.unknown")}</option>
                {TERMINATIONS.map((s) => (
                  <option key={s} value={s}>
                    {t(`termination.${s}`)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className={field}>
            <span>{t("new.playedOn")}</span>
            <input type="date" name="playedOn" className={input} />
          </label>
        </fieldset>

        <p className="text-sm text-muted">{t("new.privacyNote")}</p>
        {result && !result.ok ? (
          <p role="alert" className="rounded border border-red bg-card px-3 py-2 text-sm text-red">
            {t(result.error)}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={submitting || (tab === "manual" && moves.length === 0)}
          className="self-start rounded-full bg-ink px-6 py-2.5 font-bold text-paper disabled:opacity-40"
        >
          {submitting ? t("new.submitting") : t("new.submit")}
        </button>
      </Form>
    </main>
  );
}
