import {inspectMarkdown} from './markdown';
import { articles } from '@/content/articles';
import type { Article } from '@/content/articles/types';
import { categoryIds, type ArticleCategory } from '@/content/insights';

/** Fail the build for invalid editorial data instead of publishing broken URLs. */
export function validateArticles(collection: readonly Article[]): void {
  const slugs = new Set<string>();
  for (const article of collection) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug)) {
      throw new Error(`Invalid article slug: ${article.slug}`);
    }
    if (slugs.has(article.slug)) throw new Error(`Duplicate article slug: ${article.slug}`);
    slugs.add(article.slug);
    if (!categoryIds.includes(article.category)) throw new Error(`Invalid category: ${article.slug}`);
    if (!['draft', 'published'].includes(article.status)) throw new Error(`Invalid status: ${article.slug}`);
    for (const value of [article.title, article.summary, article.seoDescription]) {
      if (!value.trim()) throw new Error(`Missing article metadata: ${article.slug}`);
    }
    if (article.publishedDate !== undefined) {
      const date = new Date(`${article.publishedDate}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(article.publishedDate) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== article.publishedDate) {
        throw new Error(`Invalid published date: ${article.slug}`);
      }
    }
    if (!article.content.length) throw new Error(`Missing article content: ${article.slug}`);
    const references = new Map((article.references??[]).map(r=>[r.id,r]));
    if(references.size!==(article.references??[]).length)throw new Error(`Duplicate article references: ${article.slug}`);
    for(const reference of references.values())if(!/^[a-zA-Z0-9_-]+$/.test(reference.id)||!/^https:\/\//.test(reference.url)||new URL(reference.url).username||new URL(reference.url).password)throw new Error(`Invalid article reference: ${article.slug}`);
    for (const block of article.content) {
      if(block.type==='markdown')inspectMarkdown(block.text);
      if('citationIds' in block&&block.citationIds?.some(id=>!references.has(id)))throw new Error(`Unknown article citation: ${article.slug}`);
      const links=block.type==='cta'?[block.link]:('links' in block?block.links??[]:[]);
      if(links.some(l=>!l.label.trim()||!l.url.startsWith('/')&&!/^https:\/\//.test(l.url)||l.url.startsWith('//')||/^https:\/\//.test(l.url)&&(new URL(l.url).username||new URL(l.url).password)))throw new Error(`Unsafe article link: ${article.slug}`);
      const values = block.type === 'list' || block.type === 'diagram' ? block.items : [block.text];
      if (!values.length || values.some(value => !value.trim())) throw new Error(`Empty article content block: ${article.slug}`);
    }
  }
}

validateArticles(articles);

export function getPublishedArticles(category?: ArticleCategory): readonly Article[] {
  return articles.filter(article => article.status === 'published' && (!category || article.category === category));
}

// Draft review lives in the authenticated editor. File helpers never expose drafts.
export function getVisibleArticles(): readonly Article[] { return getPublishedArticles(); }

export function getArticleBySlug(slug: string): Article | undefined {
  return getVisibleArticles().find(article => article.slug === slug);
}

export function getRelatedArticles(article: Article): readonly Article[] {
  return getPublishedArticles(article.category).filter(candidate => candidate.slug !== article.slug).slice(0, 3);
}

export {articleHref} from './article-path';

export function formatPublishedDate(date: string): string {
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
}
