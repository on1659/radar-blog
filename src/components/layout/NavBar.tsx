"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, Menu, X, Globe, ChevronDown } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { i18n, localeNames } from "@/i18n/config";
import type { Locale } from "@/i18n/config";

interface NavDict {
  blog: string;
  projects: string;
  about: string;
  docs: string;
  search: string;
  language: string;
}

export const NavBar = ({ locale, dict }: { locale: Locale; dict: NavDict }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  const prefix = locale === "ko" ? "" : `/${locale}`;

  const navLinks = [
    { label: dict.blog, href: `${prefix}/` },
    { label: dict.projects, href: `${prefix}/about#projects` },
    { label: dict.about, href: `${prefix}/about` },
    { label: dict.docs, href: `${prefix}/docs` },
  ];

  const isActive = (href: string) => {
    const clean = href.replace(/#.*$/, "");
    const hasHash = href.includes("#");
    if (clean === `${prefix}/` || clean === "/") {
      return pathname === "/" || pathname === `/${locale}` || pathname === `${prefix}/`;
    }
    if (hasHash) return false;
    return pathname.startsWith(clean);
  };

  const getLocaleHref = (target: Locale) => {
    let cleanPath = pathname;
    // Remove current locale prefix
    for (const loc of i18n.locales) {
      if (pathname.startsWith(`/${loc}/`)) {
        cleanPath = pathname.slice(loc.length + 1);
        break;
      } else if (pathname === `/${loc}`) {
        cleanPath = "/";
        break;
      }
    }
    return target === i18n.defaultLocale ? cleanPath : `/${target}${cleanPath}`;
  };

  const switchLocale = (target: Locale) => {
    document.cookie = `locale=${target};path=/;max-age=${60 * 60 * 24 * 365}`;
    setLangOpen(false);
    router.push(getLocaleHref(target));
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-bg-primary/95 backdrop-blur-sm">
      <div className="mx-auto flex h-[60px] max-w-container items-center justify-between px-5 sm:px-8">
        <div className="flex items-center gap-8">
          <Link href={`${prefix}/`} className="text-xl font-[800] tracking-[-0.03em] text-text-primary">
            이더<span className="text-brand-primary">.</span>dev
          </Link>
          <div className="hidden items-center gap-2 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-1.5 text-[0.9375rem] font-medium transition-all duration-base ${
                  isActive(link.href)
                    ? "font-semibold text-text-primary"
                    : "text-text-tertiary hover:bg-bg-secondary hover:text-text-primary"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Link
            href={`${prefix}/search`}
            className="flex h-10 w-10 items-center justify-center rounded-md text-text-tertiary transition-all duration-base hover:bg-bg-secondary hover:text-text-primary"
          >
            <Search size={18} />
          </Link>

          {/* Language Selector Dropdown */}
          <div ref={langRef} className="relative">
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex h-10 items-center gap-1 rounded-md px-2 text-text-tertiary transition-all duration-base hover:bg-bg-secondary hover:text-text-primary"
            >
              <Globe size={16} />
              <span className="text-xs font-semibold">{localeNames[locale]}</span>
              <ChevronDown size={12} className={`transition-transform ${langOpen ? "rotate-180" : ""}`} />
            </button>
            {langOpen && (
              <div className="absolute right-0 top-full mt-1 min-w-[140px] overflow-hidden rounded-lg border border-border bg-bg-primary shadow-lg">
                {i18n.locales.map((loc) => (
                  <button
                    key={loc}
                    onClick={() => switchLocale(loc)}
                    className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors ${
                      locale === loc
                        ? "bg-bg-secondary font-semibold text-brand-primary"
                        : "text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
                    }`}
                  >
                    {localeNames[loc]}
                    {locale === loc && <span className="ml-auto text-xs text-brand-primary">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <ThemeToggle />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-md text-text-tertiary transition-all duration-base hover:bg-bg-secondary hover:text-text-primary md:hidden"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border px-5 sm:px-8 py-4 md:hidden">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`block rounded-md px-3 py-2 text-[0.9375rem] font-medium transition-all duration-base ${
                isActive(link.href)
                  ? "font-semibold text-text-primary"
                  : "text-text-tertiary hover:text-text-primary"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
};
