import type { Article } from '@/content/articles/types';
import { insights } from '@/content/insights';
import { articleHref } from './articles';

export function articleStructuredData(article: Article, origin: string, publisherName: string) {
  const url = new URL(articleHref(article.slug), origin).href;
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.seoDescription,
    abstract: article.summary,
    articleSection: insights.categories[article.category].title,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    publisher: { '@type': 'Organization', name: publisherName },
    ...(article.publishedDate ? { datePublished: article.publishedDate } : {}),
  };
}
