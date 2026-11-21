import Link from 'next/link';
import { howWeWork as content } from '@/content/how-we-work';
import { site } from '@/content/site';
import { Arrow } from '@/components/icon';
import { createPageMetadata } from '@/lib/metadata';
import { serializeStructuredData } from '@/lib/site-seo';
import styles from './how-we-work.module.css';

export const metadata = createPageMetadata(content.seo, '/how-we-work');

export default function HowWeWorkPage() {
  const url = `${site.url}/how-we-work`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', '@id': url, url, name: content.seo.title, description: content.seo.description, isPartOf: { '@id': `${site.url}/#website` }, about: { '@id': `${site.url}/#organization` }, inLanguage: 'en' },
      { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: site.name, item: site.url }, { '@type': 'ListItem', position: 2, name: content.seo.title, item: url }] },
    ],
  };
  return <main id="main" className={styles.page}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeStructuredData(structuredData) }} />
    <section className={`container ${styles.hero}`} aria-labelledby="engagement-title">
      <div>
        <p className="eyebrow">{content.hero.eyebrow}</p>
        <h1 id="engagement-title">{content.hero.title}<span>{content.hero.emphasis}</span></h1>
        <p className={styles.lead}>{content.hero.introduction}</p>
        <p className={styles.description}>{content.hero.description}</p>
        <div className={styles.actions}><Link className="button" href={site.consultation.href}>{content.hero.cta}<Arrow /></Link><a className="text-link" href="#your-journey">{content.hero.journeyLink}<Arrow /></a></div>
      </div>
      <nav className={styles.journeyMap} aria-label={content.journey.label}>
        <p className="eyebrow">{content.journey.label}</p>
        <ol>{content.journey.stages.map((stage, index) => <li key={stage.id}><a href={`#${stage.id}`}><span className={styles.marker} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><span>{stage.shortTitle}</span><Arrow /></a></li>)}</ol>
        <p className={styles.mapNote}>{content.journey.stages[5].outcome}</p>
      </nav>
    </section>
    <section id="your-journey" className={`container ${styles.journey}`} aria-labelledby="journey-title">
      <header className={styles.sectionHeader}><h2 id="journey-title">{content.journey.title}</h2><p>{content.journey.description}</p></header>
      <ol className={styles.stages}>{content.journey.stages.map((stage, index) => <li key={stage.id} id={stage.id}>
        <span className={styles.stageNumber} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
        <div className={styles.stageBody}><h3>{stage.title}</h3><p>{stage.description}</p><ul>{stage.activities.map(activity => <li key={activity}>{activity}</li>)}</ul></div>
        <div className={styles.outcome}><p className="eyebrow">{content.journey.outcomeLabel}</p><p>{stage.outcome}</p></div>
      </li>)}</ol>
    </section>
    <section className={`dark-section ${styles.architecture}`} aria-labelledby="architecture-title"><div className={`container ${styles.architectureGrid}`}>
      <div><p className="eyebrow">{content.architecture.eyebrow}</p><h2 id="architecture-title">{content.architecture.title}</h2>{content.architecture.paragraphs.map(p => <p key={p}>{p}</p>)}<Link className="text-link" href={content.architecture.link.href}>{content.architecture.link.label}<Arrow /></Link></div>
      <ol className={styles.decisions}>{content.architecture.decisions.map((decision, index) => <li key={decision.title}><span className={styles.stageNumber} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><div><h3>{decision.title}</h3><p>{decision.description}</p></div></li>)}</ol>
    </div></section>
    <section className={`container ${styles.engineering}`} aria-labelledby="engineering-title">
      <header className={styles.sectionHeader}><div><p className="eyebrow">{content.engineering.eyebrow}</p><h2 id="engineering-title">{content.engineering.title}</h2></div><p>{content.engineering.description}</p></header>
      <div className={styles.topics}>{content.engineering.topics.map(topic => <article key={topic.title}><h3>{topic.title}</h3><p>{topic.description}</p><p className={styles.topicOutcome}>{topic.outcome}</p></article>)}</div>
      <Link className="text-link" href={content.engineering.link.href}>{content.engineering.link.label}<Arrow /></Link>
    </section>
    <section className={`container ${styles.questions}`} aria-labelledby="questions-title">
      <div><p className="eyebrow">{content.questions.eyebrow}</p><h2 id="questions-title">{content.questions.title}</h2></div>
      <div>{content.questions.items.map(item => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div>
    </section>
    <nav className={`container ${styles.services}`} aria-label={content.services.label}><p className="eyebrow">{content.services.label}</p><ul>{content.services.links.map(link => <li key={link.href}><Link className="text-link" href={link.href}>{link.label}<Arrow /></Link></li>)}</ul></nav>
    <section className={`consultation-section section ${styles.closing}`} aria-labelledby="engagement-consultation"><div className={`container ${styles.closingInner}`}>
      <div><p className="eyebrow">{content.closing.eyebrow}</p><h2 id="engagement-consultation">{content.closing.title}</h2><p>{content.closing.description}</p></div>
      <div><Link className="button" href={site.consultation.href}>{content.closing.cta}<Arrow /></Link><p className={styles.closingNote}>{content.closing.note}</p></div>
    </div></section>
  </main>;
}
