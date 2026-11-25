import type { MetadataRoute } from 'next';
import { site } from '@/content/site';
import { categoryIds, categoryHref } from '@/content/insights';
import { articleHref } from '@/lib/articles';
import {publishedArticles} from '@/lib/published-articles';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paths = ['/', ...Object.keys(site.pages).map(path => `/${path}`), '/custom-applications', '/our-approach', ...categoryIds.map(categoryHref), '/how-we-work', '/insights', '/privacy'];
  return [
    ...paths.map(path => ({ url: new URL(path, site.url).href, changeFrequency: 'monthly' as const, priority: path === '/' ? 1 : 0.7 })),
    ...(await publishedArticles()).map(article => ({ url: new URL(articleHref(article.slug), site.url).href, ...(article.publishedDate?{lastModified:article.modifiedDate??article.publishedDate}:{}), changeFrequency: 'monthly' as const, priority: 0.6 })),
  ];
}
