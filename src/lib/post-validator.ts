/**
 * AI 생성 글 검수 모듈
 * - 마크다운 내 URL 유효성 검사
 * - 콘텐츠 품질 체크 (길이, 필수 필드, 구조)
 * - LLM 기반 할루시네이션 판별 (z.ai)
 * - 검수 실패 시 hallucination 카테고리로 분류
 */

import { checkHallucination, logHallucinationCheck, buildHallucinationBanner, type HallucinationResult } from "./hallucination-checker";

export { type HallucinationResult, buildHallucinationBanner };

/* ───── Types ───── */

interface LinkCheckResult {
  url: string;
  ok: boolean;
  status?: number;
  error?: string;
}

export interface ValidationResult {
  passed: boolean;
  /** 전체 점수 (0~100) */
  score: number;
  issues: ValidationIssue[];
  linkResults: LinkCheckResult[];
  /** LLM 할루시네이션 판별 결과 */
  hallucination?: HallucinationResult;
}

interface ValidationIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
}

interface ValidateOptions {
  /** 마크다운 본문 */
  content: string;
  /** 글 제목 */
  title: string;
  /** 카테고리별 최소 글자수 */
  minLength?: number;
  /** 카테고리별 최대 글자수 */
  maxLength?: number;
  /** 링크 검사 건너뛰기 (테스트용) */
  skipLinkCheck?: boolean;
  /** signal 카테고리 여부 (출처 필수 체크) */
  requireSources?: boolean;
  /** LLM 할루시네이션 체크 활성화 */
  checkHallucination?: boolean;
  /** 할루시네이션 체크용 원본 소스 컨텍스트 */
  sourceContext?: string;
}

/* ───── Markdown Link Extractor ───── */

const MAX_LINKS_TO_CHECK = 20;

const extractLinks = (markdown: string): string[] => {
  const re = /\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g;
  const urls: string[] = [];
  let match;
  while ((match = re.exec(markdown)) !== null) {
    urls.push(match[2]);
  }
  return [...new Set(urls)].slice(0, MAX_LINKS_TO_CHECK);
};

/* ───── URL Validator ───── */

/** 페이월/봇차단이 알려진 도메인 — 401/403은 정상으로 간주 */
const PAYWALL_DOMAINS = [
  "wsj.com", "nytimes.com", "ft.com", "bloomberg.com", "economist.com",
  "washingtonpost.com", "theathletic.com", "thetimes.co.uk",
  "medium.com", "substack.com",
];

/** 봇 차단이 잦은 뉴스 도메인 — 403은 정상으로 간주 */
const BOT_BLOCKED_DOMAINS = [
  "fox", "cnn.com", "bbc.com", "reuters.com", "apnews.com",
  "theverge.com", "techcrunch.com", "arstechnica.com",
];

const isDomainExempt = (url: string, status: number): boolean => {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    // 401 (페이월) 허용
    if (status === 401 && PAYWALL_DOMAINS.some((d) => hostname.includes(d))) return true;
    // 403 (봇차단) 허용
    if (status === 403 && [...PAYWALL_DOMAINS, ...BOT_BLOCKED_DOMAINS].some((d) => hostname.includes(d))) return true;
    return false;
  } catch {
    return false;
  }
};

const checkUrl = async (url: string): Promise<LinkCheckResult> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "EtherBlog-Validator/1.0" },
    });
    clearTimeout(timeout);

    // 403/405 = HEAD 차단하는 서버 → 브라우저 UA로 GET 재시도
    if (res.status === 403 || res.status === 405) {
      const controller2 = new AbortController();
      const timeout2 = setTimeout(() => controller2.abort(), 8000);
      const res2 = await fetch(url, {
        method: "GET",
        signal: controller2.signal,
        redirect: "follow",
        headers: { "User-Agent": "Mozilla/5.0 (compatible; EtherBlog-Validator/1.0)" },
      });
      clearTimeout(timeout2);
      await res2.body?.cancel();
      return { url, ok: res2.status < 400, status: res2.status };
    }

    await res.body?.cancel();

    // 페이월/봇차단 도메인은 401/403도 정상 처리
    if (!res.ok && isDomainExempt(url, res.status)) {
      return { url, ok: true, status: res.status };
    }

    return { url, ok: res.status < 400, status: res.status };
  } catch (err) {
    return {
      url,
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
};

const checkLinks = async (urls: string[]): Promise<LinkCheckResult[]> => {
  // 동시 5개씩 병렬 체크
  const CONCURRENCY = 5;
  const results: LinkCheckResult[] = [];

  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    const batch = urls.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map(checkUrl));
    results.push(...batchResults);
  }

  return results;
};

/* ───── Content Quality Checks ───── */

const checkContent = (options: ValidateOptions): ValidationIssue[] => {
  const { content, title, minLength = 300, maxLength = 15000, requireSources } = options;
  const issues: ValidationIssue[] = [];

  // 제목 체크
  if (!title || title.trim().length < 5) {
    issues.push({ severity: "error", code: "TITLE_TOO_SHORT", message: `제목이 너무 짧다 (${title?.length ?? 0}자)` });
  }

  // 본문 길이 체크 (코드블록 제거 → 마크다운 기호만 제거, 괄호/하이픈은 유지)
  const textLength = content.replace(/```[\s\S]*?```/g, "").replace(/[#*`>\[\]]/g, "").trim().length;
  if (textLength < minLength) {
    issues.push({ severity: "error", code: "CONTENT_TOO_SHORT", message: `본문이 너무 짧다 (${textLength}자, 최소 ${minLength}자)` });
  }
  if (textLength > maxLength) {
    issues.push({ severity: "warning", code: "CONTENT_TOO_LONG", message: `본문이 너무 길다 (${textLength}자, 최대 ${maxLength}자)` });
  }

  // 빈 섹션 체크 (## 뒤에 바로 ##이 오는 경우)
  if (/##[^\n]+\n\s*\n\s*##/g.test(content)) {
    issues.push({ severity: "warning", code: "EMPTY_SECTION", message: "비어있는 섹션이 있다" });
  }

  // 존댓말 체크
  if (/하겠습니다|인 것 같습니다|알아보겠습니다|드리겠습니다/.test(content)) {
    issues.push({ severity: "warning", code: "FORMAL_TONE", message: "존댓말이 섞여 있다 (문체 규칙 위반)" });
  }

  // signal 카테고리: 출처 필수
  if (requireSources && !content.includes("출처:") && !content.includes("**출처:**")) {
    issues.push({ severity: "warning", code: "MISSING_SOURCES", message: "출처 표기가 없다 (signal 필수)" });
  }

  // 마무리 인용구 체크
  const lines = content.trim().split("\n").filter((l) => l.trim());
  const lastLine = lines[lines.length - 1]?.trim() ?? "";
  if (!lastLine.startsWith(">")) {
    issues.push({ severity: "warning", code: "MISSING_CLOSING_QUOTE", message: "마지막 한줄 인용구 마무리가 없다" });
  }

  return issues;
};

/* ───── Main Validator ───── */

export const validatePost = async (options: ValidateOptions): Promise<ValidationResult> => {
  const issues = checkContent(options);

  // 링크 체크
  let linkResults: LinkCheckResult[] = [];
  if (!options.skipLinkCheck) {
    const urls = extractLinks(options.content);
    if (urls.length > 0) {
      linkResults = await checkLinks(urls);
      const deadLinks = linkResults.filter((r) => !r.ok);
      for (const dead of deadLinks) {
        issues.push({
          severity: "error",
          code: "DEAD_LINK",
          message: `죽은 링크: ${dead.url} (${dead.status ?? dead.error})`,
        });
      }
    }
  }

  // LLM 할루시네이션 체크
  let hallucinationResult: HallucinationResult | undefined;
  if (options.checkHallucination) {
    hallucinationResult = await checkHallucination({
      content: options.content,
      title: options.title,
      sourceContext: options.sourceContext,
    });
    logHallucinationCheck("(pre-save)", hallucinationResult);

    if (hallucinationResult.hallucinated) {
      issues.push({
        severity: "error",
        code: "HALLUCINATION",
        message: `할루시네이션 감지: ${hallucinationResult.summary}`,
      });
      for (const s of hallucinationResult.suspects.filter((s) => s.severity === "high")) {
        issues.push({
          severity: "error",
          code: `HALLUCINATION_${s.type.toUpperCase()}`,
          message: `${s.reason} — "${s.excerpt.slice(0, 80)}"`,
        });
      }
    }
  }

  // 점수 계산
  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const score = Math.max(0, 100 - errorCount * 20 - warningCount * 5);

  // error가 하나라도 있으면 실패
  const passed = errorCount === 0;

  return { passed, score, issues, linkResults, hallucination: hallucinationResult };
};

/** 검수 실패 사유를 마크다운 배너로 생성 (본문 상단에 삽입용) */
export const buildFailureBanner = (result: ValidationResult): string => {
  // 할루시네이션 전용 배너가 있으면 우선 사용
  if (result.hallucination?.hallucinated) {
    return buildHallucinationBanner(result.hallucination);
  }

  const lines = [
    `> **이 글은 AI 검수에서 통과하지 못했습니다** (점수: ${result.score}/100)`,
    ">",
  ];
  for (const issue of result.issues) {
    const icon = issue.severity === "error" ? "🚫" : "⚠️";
    lines.push(`> ${icon} ${issue.message}`);
  }
  lines.push(">");
  lines.push("> 링크 오류, 품질 미달 등의 사유로 자동 분류된 글입니다.");
  return lines.join("\n") + "\n\n---\n\n";
};

/** 검수 결과 로그 출력 */
export const logValidation = (postId: string, result: ValidationResult) => {
  const tag = result.passed ? "✅ PASS" : "❌ FAIL";
  console.log(`[Validator] ${tag} post=${postId} score=${result.score}`);
  for (const issue of result.issues) {
    const icon = issue.severity === "error" ? "🚫" : "⚠️";
    console.log(`  ${icon} [${issue.code}] ${issue.message}`);
  }
  const deadLinks = result.linkResults.filter((r) => !r.ok);
  if (deadLinks.length > 0) {
    console.log(`  🔗 Dead links: ${deadLinks.length}/${result.linkResults.length}`);
  }
};
