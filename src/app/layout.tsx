import type { Metadata } from 'next';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { FloatingConsultation } from '@/components/floating-consultation';
import { AssistantLauncher } from '@/components/assistant/AssistantLauncher';
import { site } from '@/content/site';
import { BookingProvider } from '@/components/booking/booking-provider';
import { businessStructuredData, indexingMetadata, serializeStructuredData } from '@/lib/site-seo';
import './globals.css';
export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.name, template: `%s | ${site.name}` },
  description: site.seo.home.description,
  ...indexingMetadata(),
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><script id="business-structured-data" type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeStructuredData(businessStructuredData()) }} /><BookingProvider><a className="skip-link" href="#main">{site.accessibility.skip}</a><div className="site-content"><Header />{children}<Footer /></div><FloatingConsultation /><AssistantLauncher /></BookingProvider></body></html>;
}
