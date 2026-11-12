import Link from 'next/link';
import { site } from '@/content/site';
import { experience } from '@/content/experience';
import { ArchitectureDiagram } from './architecture-diagram';
import { ConsultationCta } from './consultation-cta';
import { Arrow } from './icon';

type Slug = 'about' | 'contact' | 'book';
export function DetailPage({ slug }: { slug: Slug }) {
  if (slug === 'about') return <main id="main"><section className="secondary-hero section"><div className="container secondary-hero-grid"><div><p className="eyebrow">{experience.about.eyebrow}</p><h1>{experience.about.title}</h1><p className="hero-description">{experience.about.description}</p><Link className="text-link" href={experience.about.link.href}>{experience.about.link.label}<Arrow /></Link></div><ArchitectureDiagram /></div></section><section className="section dark-section"><div className="container architecture-layout"><div><p className="eyebrow">{experience.philosophy.eyebrow}</p><h2>{experience.about.principleTitle}</h2><p>{experience.about.principleDescription}</p></div><ul className="principle-list">{experience.philosophy.principles.map(point => <li key={point}><span aria-hidden="true">↗</span>{point}</li>)}</ul></div></section><ConsultationCta /></main>;
  const content = experience.inquiry;
  const booking = slug === 'book';
  const link = booking ? content.bookLink : content.contactLink;
  return <main id="main"><section className="section inquiry-section"><div className="container inquiry-grid"><div className="inquiry-heading"><p className="eyebrow">{booking ? site.consultation.label : content.eyebrow}</p><h1>{content.title}</h1><p className="hero-description">{content.description}</p><div className="inquiry-status"><span className="status-dot" /><div><h2>{booking ? content.bookTitle : content.contactTitle}</h2><p>{booking ? content.bookNote : content.contactNote}</p></div></div><Link className="text-link" href={link.href}>{link.label}<Arrow /></Link></div><aside className="conversation-card"><p className="eyebrow">{content.preparationTitle}</p><ol>{content.items.map((item, i) => <li key={item.title}><span className="step-number">{String(i + 1).padStart(2, '0')}</span><div><h2>{item.title}</h2><p>{item.description}</p></div></li>)}</ol></aside></div></section></main>;
}
