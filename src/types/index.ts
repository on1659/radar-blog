export type Category = "commits" | "articles" | "casual" | "signal" | "hallucination";

/**
 * 카테고리 비트플래그 — "전체" 필터에 포함할 카테고리를 int 1개로 관리
 * bit 0 = commits (1), bit 1 = articles (2), bit 2 = casual (4),
 * bit 3 = signal (8), bit 4 = hallucination (16)
 */
export const CATEGORY_BITS: Record<Category, number> = {
  commits: 1,
  articles: 2,
  casual: 4,
  signal: 8,
  hallucination: 16,
};

/** 비트플래그 → 포함된 카테고리 배열 */
export const flagsToCategories = (flags: number): Category[] =>
  (Object.entries(CATEGORY_BITS) as [Category, number][])
    .filter(([, bit]) => flags & bit)
    .map(([cat]) => cat);

/** 카테고리 배열 → 비트플래그 */
export const categoriesToFlags = (cats: Category[]): number =>
  cats.reduce((acc, cat) => acc | (CATEGORY_BITS[cat] ?? 0), 0);

/** 기본값: articles + signal (commits, hallucination 제외) */
export const DEFAULT_HOME_FLAGS = 2 | 4 | 8; // articles + casual + signal = 14

export interface PostMeta {
  id: string;
  slug: string;
  title: string;
  titleEn?: string;
  subtitle?: string;
  excerpt?: string;
  excerptEn?: string;
  category: Category;
  coverImage?: string;
  tags: string[];
  readingTime: number;
  createdAt: string;
  published: boolean;
  featured: boolean;
  commitHash?: string;
  commitUrl?: string;
  repoName?: string;
  filesChanged?: number;
  hasEnglish?: boolean;
  viewCount?: number;
  validationScore?: number | null;
}

export interface PostDetail extends PostMeta {
  content: string;
  contentEn?: string;
  seriesId?: string;
  seriesOrder?: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ===== Community Board (memradar 사용자 커뮤니티) =====

export type BoardCategoryKey = "showcase" | "chat" | "question";

export interface BoardAuthorDto {
  id: string;
  username: string;
  avatarUrl: string | null;
}

/** 목록 카드용 직렬화 메타 (Date는 ISO string) */
export interface BoardPostMeta {
  id: string;
  category: BoardCategoryKey;
  title: string;
  excerpt: string;
  imageId: string | null;
  author: BoardAuthorDto;
  createdAt: string;
  commentCount: number;
  reactionCount: number;
}

export interface BoardCommentDto {
  id: string;
  body: string;
  createdAt: string;
  author: BoardAuthorDto;
}

/** community 사전 블록 (ko.json/en.json과 키 동기) */
export interface CommunityDict {
  title: string;
  subtitle: string;
  signals: string;
  write: string;
  categoryAll: string;
  categoryShowcase: string;
  categoryChat: string;
  categoryQuestion: string;
  emptyTitle: string;
  emptyBody: string;
  loginTitle: string;
  loginBody: string;
  loginWithGitHub: string;
  reLoginRequired: string;
  comments: string;
  commentPlaceholder: string;
  submit: string;
  delete: string;
  deleteConfirm: string;
  titlePlaceholder: string;
  bodyPlaceholder: string;
  imageDropHint: string;
  imageRequired: string;
  imageRemove: string;
  uploading: string;
  submitting: string;
  backToList: string;
  errorGeneric: string;
  errorRateLimited: string;
  viewGrid: string;
  viewList: string;
}

/** 목록 보기 방식 — 썸네일 갤러리(grid) / 글 리스트(list) */
export type BoardViewMode = "grid" | "list";
