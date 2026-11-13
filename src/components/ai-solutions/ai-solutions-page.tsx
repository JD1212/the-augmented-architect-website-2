import Link from 'next/link';
import { aiSolutions as content } from '@/content/ai-solutions';
import { site } from '@/content/site';
import { ArchitectureDiagram } from '@/components/architecture-diagram';
import { Icon, Arrow } from '@/components/icon';
import { ConceptViewer } from './concept-viewer';
import { TechnologyComparison } from './technology-comparison';
import { BusinessFirstSection } from './business-first-section';
import styles from './ai-solutions.module.css';

export function AiSolutionsPage() {
  return <main id="main" className={`service-page ${styles.page}`}>
    <section className="service-hero"><div className="container service-hero-inner"><div><p className="eyebrow">{content.hero.eyebrow}</p><h1>{content.hero.title}</h1><p className="hero-description">{content.hero.description}</p><div className="hero-actions"><Link className="button" href={site.consultation.href}>{site.consultation.label}<Arrow /></Link><a className="text-link" href="#capabilities">{content.hero.capabilitiesLabel}<span aria-hidden="true">↓</span></a></div></div><div className="service-hero-visual"><ArchitectureDiagram variant="agents" /></div></div><ul className="container service-topics">{content.hero.topics.map(topic => <li key={topic}><span aria-hidden="true">✦</span>{topic}</li>)}</ul></section>

    <section className="section" aria-labelledby="ai-problems-heading"><div className="container"><div className={styles.problemHeading}><p className="eyebrow">{content.problems.eyebrow}</p><h2 id="ai-problems-heading">{content.problems.title}</h2></div><div className="problem-grid">{content.problems.items.map((item, index) => <article key={item.title}><span className="step-number">{String(index + 1).padStart(2, '0')}</span><h3>{item.title}</h3><p>{item.description}</p></article>)}</div></div></section>

    <section id="capabilities" className={`section capabilities-section ${styles.capabilities}`} aria-labelledby="ai-capabilities-heading"><div className="container"><div className="section-heading split-heading"><div><p className="eyebrow">{content.capabilities.eyebrow}</p><h2 id="ai-capabilities-heading">{content.capabilities.title}</h2></div><p>{content.capabilities.description}</p></div><div className={`capability-grid ${styles.capabilityGrid}`}>{content.capabilities.items.map(item => <article key={item.title}><span className="icon-box"><Icon name={item.icon} /></span><h3>{item.title}</h3><p>{item.description}</p></article>)}</div></div></section>

    <BusinessFirstSection />

    <TechnologyComparison content={content.technology} />

    <section id="demo" className={`section dark-section ${styles.enterprise}`} aria-labelledby="ae-heading"><div className="container">
      <div className={styles.productIdentity}><span className={styles.aeMark} aria-hidden="true">{content.enterprise.monogram}</span><div><p className="eyebrow">{content.enterprise.eyebrow}</p><p>{content.enterprise.name}</p></div></div>
      <div className="section-heading split-heading"><h2 id="ae-heading">{content.enterprise.title}</h2><p>{content.enterprise.description}</p></div>
      <dl className={styles.brandDistinction}>{content.enterprise.brands.map(brand => <div key={brand.name}><dt>{brand.name}</dt><dd>{brand.role}</dd></div>)}</dl>
      {content.enterprise.concepts.map(concept => <figure key={concept.id} id={concept.id} className={styles.concept}>
        <figcaption><div className={styles.conceptHeading}><span className={styles.conceptNumber}>{concept.number}</span><div><p className={styles.conceptLabel}>{content.enterprise.conceptLabel}</p><h3>{concept.title}</h3></div></div><div className={styles.conceptDescription}><p>{concept.description}</p><ul>{concept.points.map(point => <li key={point}><span aria-hidden="true">↗</span>{point}</li>)}</ul></div></figcaption>
        <p className={styles.conceptNotice}>{concept.notice}</p><ConceptViewer concept={concept} />
        {concept.explanation && <p className={styles.driverExplanation}>{concept.explanation}</p>}
      </figure>)}
    </div></section>

    <section className="section" aria-labelledby="ai-development-heading"><div className="container"><div className="section-heading split-heading"><div><p className="eyebrow">{content.development.eyebrow}</p><h2 id="ai-development-heading">{content.development.title}</h2></div><p>{content.development.description}</p></div><ul className={styles.developmentList}>{content.development.items.map((item, index) => <li key={item}><span className={styles.serviceNumber}>{String(index + 1).padStart(2, '0')}</span>{item}</li>)}</ul></div></section>

    <section className={`section ${styles.philosophy}`} aria-labelledby="ai-philosophy-heading"><div className="container architecture-layout"><div><p className="eyebrow">{content.philosophy.eyebrow}</p><h2 id="ai-philosophy-heading">{content.philosophy.title}</h2></div><div><p>{content.philosophy.description}</p><Link className="text-link" href={content.philosophy.link.href}>{content.philosophy.link.label}<Arrow /></Link></div></div></section>

    <section className="section consultation-section" aria-labelledby="ai-consultation-heading"><div className="container consultation-inner"><div><p className="eyebrow">{content.consultation.eyebrow}</p><h2 id="ai-consultation-heading">{content.consultation.title}</h2><p>{content.consultation.description}</p></div><div className="consultation-action"><Link className="button" href={site.consultation.href}>{site.consultation.label}<Arrow /></Link></div></div></section>
  </main>;
}
