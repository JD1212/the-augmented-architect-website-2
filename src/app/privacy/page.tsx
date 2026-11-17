import Link from 'next/link';
import { privacy } from '@/content/privacy';
import { createPageMetadata } from '@/lib/metadata';
import { PrivacyPreferences } from '@/components/analytics/analytics-consent';
export const metadata = createPageMetadata(privacy, '/privacy');
export default function PrivacyPage() {
  return <main id="main"><section className="section detail-page"><div className="container"><div className="section-heading"><h1>{privacy.title}</h1><p>{privacy.description}</p></div><div className="architecture-layout">{privacy.paragraphs.map(([title, description]) => <section key={title}><h2>{title}</h2><p className="hero-description">{description}</p></section>)}</div><PrivacyPreferences /><p><a className="text-link" href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">How Google uses information from websites that use its services</a></p><p><Link className="text-link" href="/contact">{privacy.contact}</Link></p></div></section></main>;
}
