import { realSalesforceShowcase as content, type MarketingCapture } from '@/content/salesforce-showcase';
import { CaptureImage } from './showcase-controls';
import styles from './consulting-proof.module.css';
import product from './showcase.module.css';

function Proof({ capture, compact = false }: { capture: MarketingCapture; compact?: boolean }) {
  return <figure className={compact ? styles.compact : styles.proof} data-product-proof>
    <CaptureImage asset={capture.asset} title={capture.title} notice={content.actual} hint={content.enlarge} className={styles.imageTrigger} imageClassName={styles.image} />
    <figcaption><h3>{capture.title}</h3><p>{capture.description}</p></figcaption>
  </figure>;
}

export function ConsultingProof() {
  return <div className={`${product.palette} ${styles.showcase}`}>
    <div className={styles.overview}><Proof capture={content.overview} /></div>
    <div className={styles.workflow}>
      <p className="eyebrow">{content.workflowLabel}</p>
      <ol>{content.workflow.map((step, index) => <li key={step}><span aria-hidden="true">0{index + 1}</span>{step}</li>)}</ol>
    </div>
    <div className={styles.heading}><h3>{content.discoveryTitle}</h3><p>{content.discoveryDescription}</p></div>
    <div className={styles.grid}>
      <div>
        <Proof capture={content.explorer} />
        <details className={styles.detail}><summary>{content.registrationsLabel}</summary><Proof capture={content.registrations} /></details>
      </div>
      <div>
        <Proof capture={content.dependencies} />
        <details className={styles.detail}><summary>{content.fieldsLabel}</summary><Proof capture={content.fields} /></details>
      </div>
    </div>
    <p className={styles.note}>{content.captureBoundary}</p>
    <div className={styles.workspaceHeading}>
      <div className={styles.heading}><h3>{content.workspaceTitle}</h3><p>{content.workspaceDescription}</p></div>
      <Proof capture={content.open} compact />
    </div>
    <div className={styles.grid}><Proof capture={content.source} /><Proof capture={content.context} /></div>
    <p className={styles.note}>{content.workspaceBoundary}</p>
  </div>;
}
