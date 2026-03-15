"use client";

import { useState, type ReactElement } from "react";
import { TableOfContents } from "./TableOfContents";

interface LanguageToggleProps {
  defaultLang?: "ko" | "en";
  contentKo: ReactElement;
  contentEn: ReactElement;
  headingsKo: { id: string; text: string; level: number }[];
  headingsEn: { id: string; text: string; level: number }[];
  titleKo: string;
  titleEn: string;
}

export const LanguageToggle = ({
  defaultLang = "ko",
  contentKo,
  contentEn,
  headingsKo,
  headingsEn,
  titleKo,
  titleEn,
}: LanguageToggleProps) => {
  const [lang, setLang] = useState<"ko" | "en">(defaultLang);

  const isKo = lang === "ko";

  return (
    <>
      {/* Language switch + title area */}
      <div className="mx-auto max-w-[1000px] px-5 sm:px-8 pt-2 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLang("ko")}
            className={`rounded-full px-3 py-1 text-meta font-medium transition-all duration-base ${
              isKo
                ? "bg-text-primary text-bg-primary"
                : "border border-border text-text-tertiary hover:border-text-tertiary"
            }`}
          >
            한국어
          </button>
          <button
            onClick={() => setLang("en")}
            className={`rounded-full px-3 py-1 text-meta font-medium transition-all duration-base ${
              !isKo
                ? "bg-text-primary text-bg-primary"
                : "border border-border text-text-tertiary hover:border-text-tertiary"
            }`}
          >
            English
          </button>
        </div>
      </div>

      {/* Render title override for English */}
      {!isKo && (
        <div className="mx-auto max-w-[1000px] px-5 sm:px-8">
          <h1 className="mb-3 text-page-title tracking-[-0.03em]">{titleEn}</h1>
        </div>
      )}

      <div className="mx-auto flex max-w-[1000px] gap-12 px-5 sm:px-8">
        <article className="prose prose-lg max-w-content flex-1 pb-20 pt-10">
          {isKo ? contentKo : contentEn}
        </article>
        <TableOfContents headings={isKo ? headingsKo : headingsEn} />
      </div>
    </>
  );
};
