import Link from 'next/link';
import { customApplications as copy } from '@/content/custom-applications';
import { site } from '@/content/site';
import { Arrow } from '@/components/icon';
import { BusinessFoundationDiagram } from './business-foundation-diagram';
import styles from './custom-applications.module.css';

function ConsultationLink() {
  return <Link className="button" href={site.consultation.href}>{copy.hero.cta}<Arrow /></Link>;
}

export function CustomApplicationsPage() {
  return <main id="main">
    <section className={`service-hero ${styles.heroSection}`} aria-labelledby="custom-hero">
      <div className={`container ${styles.hero}`}>
        <div><p className="eyebrow">{copy.hero.eyebrow}</p><h1 id="custom-hero">{copy.hero.title}</h1><p className={styles.subtitle}>{copy.hero.subtitle}</p><p className={styles.description}>{copy.hero.description}</p><div className="hero-actions"><ConsultationLink /><a className="text-link" href="#whats-included">{copy.hero.secondary} <span aria-hidden="true">↓</span></a></div></div>
        <aside className={styles.offer} aria-labelledby="custom-offer"><p className={styles.kicker}>{copy.hero.packageLabel}</p><h2 id="custom-offer">{copy.name}</h2><ul>{copy.hero.foundation.map((item, index) => <li key={item}><span aria-hidden="true">0{index + 1}</span>{item}</li>)}</ul><p className={styles.price}>{copy.hero.price}</p><p className={styles.scope}>{copy.hero.clarification}</p></aside>
        <p className={styles.tagline}>{copy.hero.tagline}</p>
      </div>
    </section>
    <section className="section" aria-labelledby="custom-problem"><div className={`container ${styles.split}`}>
      <div><p className="eyebrow">{copy.problem.eyebrow}</p><h2 id="custom-problem">{copy.problem.title}</h2><p className={styles.description}>{copy.problem.description}</p></div>
      <ul className={styles.problemList}>{copy.problem.points.map(point => <li key={point}>{point}</li>)}</ul>
    </div></section>
    <section className={`section ${styles.solution}`} aria-labelledby="custom-solution"><div className="container">
      <div className={styles.heading}><p className="eyebrow">{copy.solution.eyebrow}</p><h2 id="custom-solution">{copy.solution.title}</h2><p>{copy.solution.description}</p></div>
      <div className={styles.solutionGrid}><ol className={styles.experienceLayers}>{copy.solution.layers.map(([title, description], index) => <li key={title}><span className={styles.stepNumber} aria-hidden="true">0{index + 1}</span><div><h3>{title}</h3><p>{description}</p></div></li>)}</ol><BusinessFoundationDiagram /></div>
    </div></section>
    <section id="whats-included" className="section" aria-labelledby="custom-package"><div className="container">
      <div className={styles.packageHeading}><div className={styles.heading}><p className="eyebrow">{copy.package.eyebrow}</p><h2 id="custom-package">{copy.package.title}</h2><p>{copy.package.description}</p></div><Link className="text-link" href={site.consultation.href}>{copy.hero.cta}<Arrow /></Link></div>
      <dl className={styles.capabilities}>{copy.package.capabilities.map(([title, description], index) => <div key={title}><dt><span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>{title}</dt><dd>{description}</dd></div>)}</dl>
      <p className={styles.scopeNote}>{copy.package.note}</p>
      <div className={styles.examples}><h3>{copy.package.examplesTitle}</h3><div className={styles.exampleGrid}>{copy.package.examples.map(example => <article key={example.title}><h4>{example.title}</h4><ol>{example.steps.map((step, index) => <li key={step}>{index > 0 && <span aria-hidden="true">→</span>}{step}</li>)}</ol></article>)}</div><p className={styles.small}>{copy.package.examplesNote}</p></div>
    </div></section>
    <section className={`section ${styles.future}`} aria-labelledby="custom-ai"><div className="container">
      <div className={styles.heading}><p className="eyebrow">{copy.future.eyebrow}</p><h2 id="custom-ai">{copy.future.title}</h2><p>{copy.future.description}</p></div>
      <div className={styles.futureGrid}><ul className={styles.futureCapabilities}>{copy.future.capabilities.map(item => <li key={item}>{item}</li>)}</ul><div className={styles.futureBoundaries}><p>{copy.future.protocols}</p><p>{copy.future.boundaries}</p><p>{copy.future.platform}</p><Link className="text-link" href={copy.future.linkHref}>{copy.future.linkLabel}<Arrow /></Link></div></div>
    </div></section>
    <section className="section" aria-labelledby="custom-approach"><div className="container">
      <div className={styles.heading}><p className="eyebrow">{copy.approach.eyebrow}</p><h2 id="custom-approach">{copy.approach.title}</h2><p>{copy.approach.description}</p></div>
      <ol className={styles.stages}>{copy.approach.stages.map(([title, description], index) => <li key={title}><span className={styles.stepNumber}>0{index + 1}</span><h3>{title}</h3><p>{description}</p></li>)}</ol>
    </div></section>
    <section className="section consultation-section" aria-labelledby="custom-consultation"><div className="container consultation-inner"><div><h2 id="custom-consultation">{copy.closing.title}</h2><p>{copy.closing.description}</p><small className={styles.preparation}>{copy.closing.preparation}</small></div><div className="consultation-action"><ConsultationLink /></div></div></section>
  </main>;
}
