import { businessFirst as content } from '@/content/business-first';
import { Icon } from '@/components/icon';
import styles from './business-first.module.css';

type Journey = typeof content.journey;

function AccessMark() {
  return <svg width="16" height="18" viewBox="0 0 20 22" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 2 3 5v6c0 4 3 7 7 9 4-2 7-5 7-9V5Z" /><path d="m6.5 10.5 2.3 2.3 4.7-5" /></svg>;
}

/** An architecture example, rendered as semantic HTML rather than a simulated application screen. */
function CustomerJourney({ journey }: { journey: Journey }) {
  return <figure className={styles.journey} aria-labelledby="business-journey-heading" aria-describedby="business-journey-caption">
    <figcaption className={styles.figureHeading}>
      <p className={styles.overline}>{journey.label}</p>
      <h3 id="business-journey-heading">{journey.title}</h3>
      <p>{journey.description}</p>
    </figcaption>

    <div className={styles.identity}>
      <div className={styles.person}>
        <span className={styles.monogram} aria-hidden="true">{journey.identity.monogram}</span>
        <div><p className={styles.overline}>{journey.identity.label}</p><h4>{journey.identity.name}</h4><p className={styles.identityKey}>{journey.identity.keyLabel}<code>{journey.identity.key}</code></p></div>
      </div>
      <div className={styles.sourceReferences}>
        <p className={styles.boundary}>{journey.identity.boundary}</p>
        <dl>{journey.identity.references.map(reference => <div key={reference.label}><dt>{reference.label}</dt><dd><code>{reference.value}</code></dd></div>)}</dl>
      </div>
    </div>

    <div className={styles.identityConnection} aria-hidden="true"><span /></div>

    <div className={styles.memory}>
      <div className={styles.memoryHeading}><div><p className={styles.overline}>{journey.memory.label}</p><h4>{journey.memory.title}</h4></div><p className={styles.permission}><AccessMark />{journey.memory.permission}</p></div>
      <p className={styles.memoryDescription}>{journey.memory.description}</p>
      <dl className={styles.memoryLayers}>{journey.memory.layers.map((layer, index) => <div key={layer.title} data-memory-layer={index + 1}><dt>{layer.title}</dt><dd>{layer.description}</dd></div>)}</dl>
      <p className={styles.sourceNote}><Icon name="data" />{journey.memory.sourceNote}</p>
    </div>

    <div className={styles.accessBridge}><span aria-hidden="true" /><p><AccessMark />{journey.accessLabel}</p></div>
    <ol className={styles.agents} role="list" aria-label={journey.agentsLabel}>
      {journey.agents.map(agent => <li key={agent.name}>
        <p className={styles.overline}>{agent.stage}</p>
        <div className={styles.agentHeading}><Icon name={agent.icon} /><h4>{agent.name}</h4></div>
        <p className={styles.agentAction}>{agent.action}</p>
        <div className={styles.scope}><p>{journey.scopeLabel}</p><p>{agent.scope}</p></div>
        <p className={styles.continuity}>{agent.continuity}</p>
      </li>)}
    </ol>
    <p id="business-journey-caption" className={styles.caption}>{journey.caption}</p>
  </figure>;
}

export function BusinessFirstSection() {
  return <section id="business-first" className={`section ${styles.section}`} aria-labelledby="business-first-heading">
    <div className="container">
      <div className={`section-heading split-heading ${styles.heading}`}>
        <div><p className="eyebrow">{content.eyebrow}</p><h2 id="business-first-heading">{content.title}</h2></div>
        <div className={styles.introduction}>{content.introduction.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div>
      </div>
      <CustomerJourney journey={content.journey} />
      <ol className={styles.principles} role="list" aria-label={content.principlesLabel}>
        {content.principles.map(principle => <li key={principle.number}><span className={styles.number} aria-hidden="true">{principle.number}</span><div><h3>{principle.title}</h3>{principle.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div></li>)}
      </ol>
    </div>
  </section>;
}
