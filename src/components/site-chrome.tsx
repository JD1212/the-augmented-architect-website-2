'use client';
import { useSelectedLayoutSegment } from 'next/navigation';
import { Header } from './header';
import { FloatingConsultation } from './floating-consultation';
import { AssistantLauncher } from './assistant/AssistantLauncher';
import { BookingProvider } from './booking/booking-provider';
import { AnalyticsConsent } from './analytics/analytics-consent';
import { site } from '@/content/site';

/** Public chrome never mounts inside the private application. Authorization stays server-side. */
export function SiteChrome({children,footer,structuredData,analytics}:{children:React.ReactNode;footer:React.ReactNode;structuredData:string;analytics:boolean}) {
  const segment=useSelectedLayoutSegment();
  if(segment==='admin')return children;
  return <><script id="business-structured-data" type="application/ld+json" dangerouslySetInnerHTML={{__html:structuredData}}/><BookingProvider><a className="skip-link" href="#main">{site.accessibility.skip}</a><div className="site-content"><Header/>{children}{footer}</div><FloatingConsultation/><AssistantLauncher/></BookingProvider><AnalyticsConsent enabled={analytics}/></>;
}
