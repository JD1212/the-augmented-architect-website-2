import { salesforceOffering } from '@/content/salesforce';
import { actions } from '@/content/salesforce-showcase';
import { ActionRow, Badge, Panel } from './product-interfaces';
import product from './showcase.module.css';
import styles from './consulting-proof.module.css';

// Focused, read-only portions of the already captured interfaces. No simulated
// application controls or org operations are mounted on the consulting page.
export function ConsultingProof() {
  const content = salesforceOffering.tools;
  return <div>
    <div className={styles.grid}>
      {content.proofs.map((proof, index) => <figure key={proof.title} className={styles.proof} data-product-proof>
        <div className={product.showcase}>
          <div className={styles.scroll} role="region" tabIndex={0} aria-label={`${proof.title}: focused capture reconstruction; scroll horizontally if needed`}>
            <div className={styles.application}>
              <header><span>{proof.title}</span><span>{index === 0 ? content.discovery.context : content.sequence.context}</span></header>
              {index === 0 ? <>
                <h3>{content.discovery.title}</h3>
                <div className={styles.discovery}>
                  <div><Panel title={content.discovery.triggerLabel} count={1}><strong>{content.discovery.trigger}</strong><div className={product.badges}><Badge>APEX</Badge><Badge tone="inactive">{content.discovery.status}</Badge></div><p className={styles.operation}>BEFORE_UPDATE</p></Panel></div>
                  <div><Panel title={content.discovery.flowLabel} count={Number(content.discovery.flowCount)}><p>{content.discovery.flowNote}</p></Panel></div>
                </div>
                <div className={styles.registered}><strong>{content.discovery.actionsLabel} <span>{content.discovery.actionCount}</span></strong><ul>{actions.map(action => <li key={action.name}><span>{action.name}</span><Badge tone="inactive">{content.discovery.status}</Badge></li>)}</ul></div>
              </> : <><h3>{content.sequence.title}</h3>{actions.map(action => <ActionRow key={action.name} action={action} compact />)}</>}
            </div>
          </div>
        </div>
        <figcaption><h3>{proof.title}</h3><p>{proof.description}</p><small>{content.proofLabel}</small></figcaption>
      </figure>)}
    </div>
    <p className={styles.note}>{content.proofNote}</p>
  </div>;
}
