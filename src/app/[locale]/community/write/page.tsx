import type { Metadata } from "next";
import { getDictionary } from "@/i18n";
import { i18n, isValidLocale } from "@/i18n/config";
import { getBoardSession } from "@/lib/board-auth";
import { GitHubLoginButton } from "@/components/board/GitHubLoginButton";
import { WriteForm } from "@/components/board/WriteForm";
import type { Locale } from "@/i18n/config";

export const dynamic = "force-dynamic";

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> => {
  const { locale: rawLocale } = await params;
  const locale: Locale = isValidLocale(rawLocale) ? rawLocale : i18n.defaultLocale;
  const dict = await getDictionary(locale);
  return { title: `${dict.community.write} · ${dict.community.title}` };
};

const CommunityWritePage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const { locale: rawLocale } = await params;
  const locale: Locale = isValidLocale(rawLocale) ? rawLocale : i18n.defaultLocale;
  const dict = await getDictionary(locale);
  const prefix = locale === "ko" ? "" : `/${locale}`;

  const session = await getBoardSession();

  return (
    <div className="mx-auto max-w-content px-5 pb-16 pt-12 sm:px-8">
      <h1 className="text-section-title tracking-[-0.02em]">{dict.community.write}</h1>

      {session.kind === "ok" ? (
        <div className="mt-6">
          <WriteForm dict={dict.community} prefix={prefix} />
        </div>
      ) : (
        <div className="mt-6 flex flex-col items-start gap-3 rounded-xl border border-border bg-bg-secondary px-6 py-8">
          <p className="text-card-title">{dict.community.loginTitle}</p>
          <p className="text-card-desc text-text-secondary">
            {session.kind === "no-github"
              ? dict.community.reLoginRequired
              : dict.community.loginBody}
          </p>
          <GitHubLoginButton
            label={dict.community.loginWithGitHub}
            redirectTo={`${prefix}/community/write`}
          />
        </div>
      )}
    </div>
  );
};

export default CommunityWritePage;
