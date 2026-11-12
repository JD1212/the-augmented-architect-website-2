import Link from 'next/link';
import { servicePages, type ServiceSlug } from '@/content/service-pages';
import { site } from '@/content/site';
import { ArchitectureDiagram } from './architecture-diagram';
import { ConsultationCta } from './consultation-cta';
import { Icon, Arrow } from './icon';

export function ServicePage({ slug }: { slug: ServiceSlug }) {
  const content = servicePages[slug];
  return <main id="main" className="service-page">
    <section className="service-hero"><div className="container service-hero-inner"><div><p className="eyebrow">{content.eyebrow}</p><h1>{content.title}</h1><p className="hero-description">{content.description}</p><div className="hero-actions"><Link className="button" href={site.consultation.href}>{site.consultation.label}<Arrow /></Link><a className="text-link" href="#capabilities">{content.secondaryLabel}<span aria-hidden="true">↓</span></a></div></div><div className="service-hero-visual"><ArchitectureDiagram variant={content.diagram} /></div></div><ul className="container service-topics">{content.topics.map(topic => <li key={topic}><span aria-hidden="true">✦</span>{topic}</li>)}</ul></section>
    <section className="section problems-section" aria-labelledby="problems-heading"><div className="container"><div className="section-heading split-heading"><div><p className="eyebrow">{content.problems.eyebrow}</p><h2 id="problems-heading">{content.problems.title}</h2></div><p>{content.problems.description}</p></div><div className="problem-grid">{content.problems.items.map((item, i) => <article key={item.title}><span className="step-number">{String(i + 1).padStart(2, '0')}</span><h3>{item.title}</h3><p>{item.description}</p></article>)}</div></div></section>
    <section id="capabilities" className="section capabilities-section" aria-labelledby="capabilities-heading"><div className="container capabilities-layout"><div className="section-heading"><p className="eyebrow">{content.capabilities.eyebrow}</p><h2 id="capabilities-heading">{content.capabilities.title}</h2><p>{content.capabilities.description}</p></div><div className="capability-grid">{content.capabilities.items.map(item => <article key={item.title}><span className="icon-box"><Icon name={item.icon} /></span><h3>{item.title}</h3><p>{item.description}</p></article>)}</div></div></section>
    <section id={slug === 'ai-solutions' ? 'demo' : 'architecture'} className="section dark-section architecture-section" aria-labelledby="architecture-heading"><div className="container architecture-layout"><div><p className="eyebrow">{content.architecture.eyebrow}</p><h2 id="architecture-heading">{content.architecture.title}</h2><p>{content.architecture.description}</p><ul className="principle-list">{content.architecture.points.map(point => <li key={point}><span aria-hidden="true">↗</span>{point}</li>)}</ul></div><ArchitectureDiagram variant={content.diagram} /></div></section>
    <section className="section approach-section" aria-labelledby="approach-heading"><div className="container"><div className="section-heading split-heading"><div><p className="eyebrow">{content.approach.eyebrow}</p><h2 id="approach-heading">{content.approach.title}</h2></div><p>{content.approach.description}</p></div><ol className="approach-steps">{content.approach.steps.map((step, i) => <li key={step.title}><span className="step-number">{String(i + 1).padStart(2, '0')}</span><h3>{step.title}</h3><p>{step.description}</p></li>)}</ol></div></section>
    <ConsultationCta />
  </main>;
}
