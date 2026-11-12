import type { ArticleCategory } from '../insights';

export type ArticleBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'list'; items: readonly string[]; ordered?: boolean }
  | { type: 'quote'; text: string };

export type Article = {
  /** Unique lowercase, hyphenated URL segment. Keep stable after publishing. */
  slug: string;
  title: string;
  category: ArticleCategory;
  summary: string;
  seoDescription: string;
  status: 'draft' | 'published';
  /** Optional, explicitly supplied ISO date: YYYY-MM-DD. Never inferred. */
  publishedDate?: string;
  content: readonly ArticleBlock[];
};
