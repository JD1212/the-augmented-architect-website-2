import Link from 'next/link';
import { site } from '@/content/site';
import { salesforcePageOffering as content } from '@/content/salesforce';
import { Arrow } from '@/components/icon';
import { ConsultingProof } from './consulting-proof';
import { SalesforceCommercialOffer } from './commercial-offer';
import { SalesforceTrialCta } from './trial-cta';
import { salesforceCommercial } from '@/content/salesforce-commercial';
import { salesforceTrialEnabled } from '@/lib/salesforce/trial';
import styles from './salesforce.module.css';

function ConsultationLink() {
  return <Link className="button" href={site.consultation.href}>{content.hero.cta}<Arrow /></Link>;
}

function RegistryDiagram() {
  const diagram = content.architecture.diagram;
  return <figure className={styles.diagram} aria-labelledby="registry-title" aria-describedby="registry-note">
    <p className={styles.diagramLabel}>{diagram.label}</p>
    <div className={styles.pipeline}>
      <div className={styles.node}><strong>{diagram.entry}</strong><code>{diagram.call}</code></div>
      <span className={styles.connector} aria-hidden="true">→</span>
      <div className={styles.registry}><strong id="registry-title">{diagram.registry}</strong><p>{diagram.selection}</p></div>
      <span className={styles.connector} aria-hidden="true">→</span>
      <ol className={styles.actions}>{diagram.actions.map(([order, type, name]) => <li key={order}><span>{order}</span><div><strong>{type}</strong><small>{name}</small></div></li>)}</ol>
    </div>
    <figcaption id="registry-note">{diagram.caption}</figcaption>
  </figure>;
}

export function SalesforcePage() {
  const trialEnabled = salesforceTrialEnabled();
  return <main id="main">
    <section className={`service-hero ${styles.heroSection}`} aria-labelledby="sf-hero">
      <div className={`container ${styles.hero}`}>
        <div><p className="eyebrow">{content.hero.eyebrow}</p><h1 id="sf-hero">{content.hero.title}</h1><p className="hero-description">{content.hero.description}</p><p className={styles.supporting}>{content.hero.supporting}</p><div className="hero-actions"><ConsultationLink /><a className="text-link" href="#salesforce-architecture">{content.hero.secondary} <span aria-hidden="true">↓</span></a></div></div>
        <aside className={styles.heroAside}><p className={styles.kicker}>{content.hero.asideLabel}</p><h2>{content.hero.asideTitle}</h2><ul>{content.hero.offers.map((offer, index) => <li key={offer}><span aria-hidden="true">0{index + 1}</span>{offer}</li>)}</ul><p className={styles.experience}>{content.hero.experience}</p></aside>
        {trialEnabled && <div className={styles.trialRow}><SalesforceTrialCta /><small>{salesforceCommercial.trial.arrangement}</small></div>}
        <p className={styles.emphasis}>{content.hero.emphasis}</p>
      </div>
    </section>
    <section className={`section ${styles.problemSection}`} aria-labelledby="sf-problems"><div className={`container ${styles.problemLayout}`}>
      <div><p className="eyebrow">{content.problem.eyebrow}</p><h2 id="sf-problems">{content.problem.title}</h2><p className={styles.description}>{content.problem.description}</p></div>
      <ul className={styles.problems}>{content.problem.points.map(point => <li key={point}>{point}</li>)}</ul>
    </div></section>
    <section id="salesforce-architecture" className={`section ${styles.architecture}`} aria-labelledby="sf-architecture"><div className="container">
      <div className={styles.sectionHeading}><p className="eyebrow">{content.architecture.eyebrow}</p><h2 id="sf-architecture">{content.architecture.title}</h2><p>{content.architecture.description}</p></div>
      <RegistryDiagram />
      <div className={styles.architectureBenefits}>{content.architecture.benefits.map(([title, description]) => <div key={title}><h3>{title}</h3><p>{description}</p></div>)}</div>
      <p className={styles.ownership}>{content.architecture.ownership}</p>
      <p className={styles.boundary}>{content.architecture.boundary}</p>
    </div></section>
    <section id="salesforce-tools" className={`section ${styles.tools}`} aria-labelledby="sf-tools"><div className="container">
      <div className={styles.sectionHeading}><p className="eyebrow">{content.tools.eyebrow}</p><h2 id="sf-tools">{content.tools.title}</h2><p>{content.tools.description}</p></div>
      <ConsultingProof />
      <p className={styles.context}>{content.tools.context}</p><p className={styles.small}>{content.tools.relationship}</p>
    </div></section>
    <section className={`section ${styles.approach}`} aria-labelledby="sf-approach"><div className="container">
      <div className={styles.sectionHeading}><p className="eyebrow">{content.approach.eyebrow}</p><h2 id="sf-approach">{content.approach.title}</h2><p>{content.approach.description}</p></div>
      <ol className={styles.stages}>{content.approach.stages.map(([title, description], index) => <li key={title}><span className={styles.stageNumber}>0{index + 1}</span><h3>{title}</h3><p>{description}</p></li>)}</ol>
      <div className={styles.aiNote}><p>{content.approach.aiBoundary}</p></div>
    </div></section>
    {trialEnabled && <SalesforceCommercialOffer />}
    <section className={`section consultation-section ${styles.closing}`} aria-labelledby="sf-consultation"><div className="container consultation-inner"><div><h2 id="sf-consultation">{content.closing.title}</h2><p>{content.closing.description}</p></div><div className="consultation-action"><ConsultationLink /></div></div></section>
  </main>;
}
