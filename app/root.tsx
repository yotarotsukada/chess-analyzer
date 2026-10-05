import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
  useRouteLoaderData,
} from "react-router";
import { t } from "~/i18n";
import type { Route } from "./+types/root";
import "./app.css";

export async function loader() {
  return { analyticsToken: process.env.CF_BEACON_TOKEN ?? null };
}

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useRouteLoaderData<typeof loader>("root");
  // 管理用リンクのページでは計測しない。URL のフラグメントにトークンが入っているため（D49）。
  const isManagePage = useLocation().pathname.endsWith("/manage");
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <header className="border-b border-line bg-paper">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link to="/" className="text-lg font-bold">
              {t("app.name")}
            </Link>
            <Link to="/new" className="rounded-full bg-ink px-4 py-1.5 text-sm font-bold text-paper">
              {t("home.cta")}
            </Link>
          </div>
        </header>
        <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
        <footer className="mt-12 border-t border-line">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-muted sm:flex-row sm:justify-between">
            <p>{t("footer.disclaimer")}</p>
            <Link to="/privacy" className="underline">
              {t("footer.privacy")}
            </Link>
          </div>
        </footer>
        <ScrollRestoration />
        <Scripts />
        {data?.analyticsToken && !isManagePage ? (
          // Cookie を使わないアクセス解析（D22）。送信内容はプライバシーポリシーで公表する。
          <script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={JSON.stringify({ token: data.analyticsToken })}
          />
        ) : null}
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = t("error.title");
  let details = "";
  let stack: string | undefined;
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) message = t("notFound.title");
    details = error.statusText;
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }
  return (
    <main className="py-16">
      <h1 className="text-2xl font-bold">{message}</h1>
      {details ? <p className="mt-2 text-muted">{details}</p> : null}
      {stack ? (
        <pre className="mt-4 overflow-x-auto rounded bg-card p-4 text-xs">
          <code>{stack}</code>
        </pre>
      ) : null}
    </main>
  );
}
