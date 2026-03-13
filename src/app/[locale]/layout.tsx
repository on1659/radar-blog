import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { NavBar } from "@/components/layout/NavBar";
import { Footer } from "@/components/layout/Footer";
import { getDictionary } from "@/i18n";
import { i18n, isValidLocale } from "@/i18n/config";
import { auth } from "@/lib/auth";
import type { Locale } from "@/i18n/config";

export const generateStaticParams = () => {
  return i18n.locales.map((locale) => ({ locale }));
};

const LocaleLayout = async ({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) => {
  const { locale: rawLocale } = await params;
  const locale: Locale = isValidLocale(rawLocale) ? rawLocale : i18n.defaultLocale;
  const dict = await getDictionary(locale);
  const session = await auth();
  const isAdmin = !!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin;

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <NavBar locale={locale} dict={dict.nav} isAdmin={isAdmin} />
      <main className="min-h-screen" lang={locale}>
        {children}
      </main>
      <Footer dict={dict.footer} />
    </ThemeProvider>
  );
};

export default LocaleLayout;
