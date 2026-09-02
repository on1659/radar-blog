import Link from "next/link";
import { RadarEmblem } from "./RadarEmblem";
import type { CommunityDict } from "@/types";

/**
 * 관제실 배너 — 테마와 무관한 고정 다크 스트립 (Wrapped 극장 팔레트 계열).
 * 고정 다크 위 텍스트는 흰색 알파만 사용한다 (테마 토큰 금지).
 */
export const BoardBanner = ({
  dict,
  prefix,
  totalCount,
}: {
  dict: CommunityDict;
  prefix: string;
  totalCount: number;
}) => (
  <div className="border-b border-white/10 bg-[#0B0A14] bg-[radial-gradient(120%_150%_at_15%_0%,rgba(99,102,241,0.16),transparent_60%)]">
    <div className="mx-auto max-w-container px-5 py-10 sm:px-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <RadarEmblem size={44} className="mt-1 shrink-0 text-board-accent" />
          <div>
            <h1 className="text-section-title tracking-[-0.02em] text-white/90">{dict.title}</h1>
            <p className="mt-1 text-card-desc text-white/55">{dict.subtitle}</p>
            <p className="mt-3 font-code text-[0.75rem] text-white/40">
              {dict.signals.replace("{n}", totalCount.toLocaleString())}
            </p>
          </div>
        </div>
        <Link
          href={`${prefix}/community/write`}
          className="self-start rounded-lg bg-board-accent px-5 py-2.5 text-meta font-medium text-white transition-opacity hover:opacity-90 sm:shrink-0"
        >
          {dict.write}
        </Link>
      </div>
    </div>
  </div>
);
