import { editorialDiagrams, type EditorialVisual } from '@/content/editorial';
import styles from './editorial.module.css';

/** Semantic, illustrative architecture—not an application screenshot or automation claim. */
export function EditorialDiagram({ kind }: { kind: EditorialVisual }) {
  const diagram = editorialDiagrams[kind];
  return <figure className={styles.diagram} aria-label={diagram.title}>
    <p className={styles.diagramTitle}>{diagram.title}</p>
    {kind === 'foundation' ? <div className={styles.comparison}>
      <div><h3>{editorialDiagrams.foundation.before}</h3><ul className={styles.fragmented}>{editorialDiagrams.foundation.disconnected.map(label => <li key={label}>{label}</li>)}</ul></div>
      <div className={styles.connected}><h3>{editorialDiagrams.foundation.after}</h3><ul>{editorialDiagrams.foundation.connected.map(label => <li key={label}>{label}</li>)}</ul></div>
    </div> : kind === 'layers' ? <ol className={styles.layers}>{editorialDiagrams.layers.steps.map(([title, detail, responsibility], index) => <li key={title}><span className={styles.number}>{String(index + 1).padStart(2, '0')}</span><div><h3>{title}</h3><p>{detail}</p><small>{responsibility}</small></div></li>)}</ol>
      : <ol className={styles.flow}>{editorialDiagrams[kind].steps.map((step, index) => <li key={step}><span className={styles.number}>{String(index + 1).padStart(2, '0')}</span><strong>{step}</strong></li>)}</ol>}
    <figcaption>{diagram.caption}</figcaption>
  </figure>;
}
