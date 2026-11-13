import type { aiTechnologies } from '@/content/ai-technologies';
import { TechnologyExplorer } from './technology-explorer';
import styles from './technology-comparison.module.css';

export type ComparisonContent = typeof aiTechnologies;

/** Static framing stays on the server; only card previews and the shared dialog hydrate. */
export function TechnologyComparison({ content }: { content: ComparisonContent }) {
  return <section id="technology-comparison" className="section" aria-labelledby="ai-runtime-heading">
    <div className="container">
      <div className="section-heading split-heading">
        <div><p className="eyebrow">{content.eyebrow}</p><h2 id="ai-runtime-heading">{content.title}</h2></div>
        <p>{content.introduction}</p>
      </div>
      <p className={styles.distinction}>{content.distinction}</p>
      <TechnologyExplorer content={content} />
      <div className={styles.approach}>
        <h3>{content.approachTitle}</h3>
        <p>{content.approach}</p><p className={styles.note}>{content.note}</p>
      </div>
      <p className={styles.trademark}>{content.trademark}</p>
    </div>
  </section>;
}
