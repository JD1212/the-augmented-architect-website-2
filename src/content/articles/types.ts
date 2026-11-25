import type { ArticleCategory } from '../insights';
export type ArticleReference = { id: string; url: string; title: string };
type Annotations = { links?: readonly {label:string;url:string}[]; citationIds?: readonly string[] };
export type ArticleBlock =
  | ({ type: 'paragraph'; text: string } & Annotations)
  | { type: 'heading'; text: string; level?: 2|3 }
  | ({ type: 'list'; text?: string; items: readonly string[]; ordered?: boolean } & Annotations)
  | ({ type: 'quote'; text: string } & Annotations)
  | ({ type: 'code'; text: string; language: string } & Annotations)
  | ({ type: 'diagram'; text: string; items: readonly string[] } & Annotations)
  | { type: 'cta'; text: string; link: {label:string;url:string} };
export type Article = {
  /** Unique lowercase, hyphenated URL segment. Keep stable after publishing. */
  slug: string; title: string; format?: 'Technical guide' | 'Article'; category: ArticleCategory; summary: string; seoDescription: string;
  seoTitle?: string; status: 'draft' | 'published';
  /** Optional, explicitly supplied ISO date: YYYY-MM-DD. Never inferred. */
  publishedDate?: string; modifiedDate?: string;
  content: readonly ArticleBlock[];
  references?: readonly ArticleReference[];
  publication?: {id:string;version?:string;revisionId?:string;revisionHash?:string;sourceOpportunityId?:string};
};
