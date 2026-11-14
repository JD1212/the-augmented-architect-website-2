import { customApplications } from '@/content/custom-applications';
import styles from './custom-applications.module.css';

export function BusinessFoundationDiagram() {
  const copy = customApplications.solution.diagram;
  return <figure className={styles.diagram} aria-labelledby="business-foundation-label" aria-describedby="business-foundation-note">
    <p id="business-foundation-label" className={styles.diagramLabel}>{copy.label}</p>
    <ol className={styles.diagramLayers}>{copy.steps.map((step, index) => <li key={step}>
      {index > 0 && <span className={styles.downArrow} aria-hidden="true">↓</span>}
      <div className={index === 2 ? styles.identityLayer : styles.diagramLayer}><span className={styles.layerNumber} aria-hidden="true">0{index + 1}</span><strong>{step}</strong></div>
    </li>)}</ol>
    <div className={styles.existingSystems}><span aria-hidden="true">↔</span><strong>{copy.existing}</strong></div>
    <figcaption id="business-foundation-note">{copy.caption}</figcaption>
  </figure>;
}
