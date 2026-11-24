import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SiteChrome } from '@/components/site-chrome';
import { Footer } from '@/components/footer';
import { site } from '@/content/site';
import { businessStructuredData, indexingMetadata, serializeStructuredData } from '@/lib/site-seo';
import {getPublishedArticles,articleHref} from '@/lib/articles';
import './globals.css';
export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.name, template: `%s | ${site.name}` },
  description: site.seo.home.description,
  ...indexingMetadata(),
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><Suspense fallback={null}><SiteChrome footer={<Footer/>} structuredData={serializeStructuredData(businessStructuredData())} analytics={process.env.VERCEL_ENV === 'production'} articlePages={getPublishedArticles().map(a=>({path:articleHref(a.slug),title:a.title,publicationId:a.publication?.id}))}>{children}</SiteChrome></Suspense></body></html>;
}
