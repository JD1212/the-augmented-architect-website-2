import Link from 'next/link';
import { experience } from '@/content/experience';
import { insights, categoryIds, categoryHref } from '@/content/insights';
import { Arrow } from './icon';
import { HeadingEmphasis } from './heading-emphasis';
import styles from './homepage-refinements.module.css';

export function PhilosophyPreview() {
  const content = experience.philosophy;
  return <section className={`philosophy-preview section ${styles.philosophy}`} aria-labelledby="philosophy-heading"><div className="container philosophy-grid"><div><p className="eyebrow">{content.eyebrow}</p><h2 id="philosophy-heading" className={styles.philosophyHeading}><HeadingEmphasis text={content.title} phrase={content.emphasis} /></h2><Link className="text-link" href={content.link.href}>{content.link.label}<Arrow /></Link></div><div><p className="philosophy-description">{content.description}</p><ol className={styles.principles} role="list">{content.principles.map((principle, index) => <li key={principle}><span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><span>{principle}</span></li>)}</ol></div></div></section>;
}

export function InsightsPreview() {
  const content = experience.insights;
  return <section className="insights-preview section" aria-labelledby="insights-preview-heading"><div className="container"><div className="section-heading split-heading"><div><p className="eyebrow">{content.eyebrow}</p><h2 id="insights-preview-heading">{content.title}</h2></div><div><p>{content.description}</p><Link className="text-link" href={content.link.href}>{content.link.label}<Arrow /></Link></div></div><div className={`insight-teasers ${styles.insightsCards}`}>{categoryIds.map(category => <Link className={styles.insightCard} data-category={category} href={categoryHref(category)} key={category}><h3>{insights.categories[category].title}</h3><p>{insights.categories[category].summary}</p><Arrow /></Link>)}</div></div></section>;
}
