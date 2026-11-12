import type { Metadata } from 'next';
import { site } from '@/content/site';
type PageSeo = { title: string; description: string };
type ArticleOpenGraph = { type: 'article'; section: string; publishedTime?: string };

export function createPageMetadata(content: PageSeo, path: string, article?: ArticleOpenGraph): Metadata {
  return { title: content.title, description: content.description, alternates: { canonical: path }, openGraph: { title: `${content.title} | ${site.name}`, description: content.description, url: path, siteName: site.name, locale: 'en_US', ...(article ?? { type: 'website' }) }, twitter: { card: 'summary', title: content.title, description: content.description } };
}

export function pageMetadata(key: keyof typeof site.seo, path: string): Metadata {
  return createPageMetadata(site.seo[key], path);
}
