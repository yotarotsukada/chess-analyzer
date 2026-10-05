import { t } from "~/i18n";

export const CONTACT_URL = "https://github.com/yotarotsukada/chess-analyzer/issues";

export function meta() {
  return [{ title: `${t("footer.privacy")} | ${t("app.name")}` }];
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

/** プライバシーポリシーと外部送信の公表（D22）。文面は公開前にユーザーが確認する。 */
export default function Privacy() {
  return (
    <main className="flex max-w-3xl flex-col gap-5 leading-relaxed">
      <h1 className="text-2xl font-bold">{t("footer.privacy")}</h1>
      <Section title={t("privacy.stored.title")}>
        <ul className="list-disc pl-6">
          <li>{t("privacy.stored.moves")}</li>
          <li>{t("privacy.stored.limits")}</li>
          <li>{t("privacy.stored.token")}</li>
        </ul>
      </Section>
      <Section title={t("privacy.browser.title")}>
        <p>{t("privacy.browser.body")}</p>
      </Section>
      <Section title={t("privacy.external.title")}>
        <p>{t("privacy.external.body")}</p>
      </Section>
      <Section title={t("privacy.retention.title")}>
        <p>{t("privacy.retention.body")}</p>
      </Section>
      <Section title={t("privacy.contact.title")}>
        <p>
          {t("privacy.contact.body")}{" "}
          <a href={CONTACT_URL} className="underline">
            {CONTACT_URL}
          </a>
        </p>
      </Section>
      <p className="text-sm text-muted">{t("footer.disclaimer")}</p>
    </main>
  );
}
