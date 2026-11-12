import type { MetadataRoute } from 'next';
import { site } from '@/content/site';
import { categoryIds, categoryHref } from '@/content/insights';
import { articleHref, getPublishedArticles } from '@/lib/articles';
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ['/', ...Object.keys(site.pages).map(path => `/${path}`), '/insights', ...categoryIds.map(categoryHref)];
  return [
    ...paths.map(path => ({ url: new URL(path, site.url).href, changeFrequency: 'monthly' as const, priority: path === '/' ? 1 : 0.7 })),
    ...getPublishedArticles().map(article => ({ url: new URL(articleHref(article.slug), site.url).href, changeFrequency: 'monthly' as const, priority: 0.6 })),
  ];
}
