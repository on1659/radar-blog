export type Category = "commits" | "articles" | "techlab" | "casual" | "daily";

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
