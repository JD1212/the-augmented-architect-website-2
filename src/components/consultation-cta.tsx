import Link from 'next/link';
import { experience } from '@/content/experience';
import { site } from '@/content/site';
import { Arrow } from './icon';

export function ConsultationCta() {
  const content = experience.consultation;
  return <section className="consultation-section section" aria-labelledby="consultation-heading"><div className="container consultation-inner"><div><p className="eyebrow">{content.eyebrow}</p><h2 id="consultation-heading">{content.title}</h2><p>{content.description}</p></div><div className="consultation-action"><Link className="button" href={site.consultation.href}>{site.consultation.label}<Arrow /></Link><span>{content.note}</span></div></div></section>;
}
