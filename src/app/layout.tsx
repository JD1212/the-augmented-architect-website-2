import type { Metadata } from 'next';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { FloatingConsultation } from '@/components/floating-consultation';
import { site } from '@/content/site';
import './globals.css';
export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.name, template: `%s | ${site.name}` },
  description: site.seo.home.description,
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><a className="skip-link" href="#main">{site.accessibility.skip}</a><div className="site-content"><Header />{children}<Footer /></div><FloatingConsultation /></body></html>;
}
