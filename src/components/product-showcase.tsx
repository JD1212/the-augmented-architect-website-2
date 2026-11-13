import { site } from '@/content/site';
import { experience } from '@/content/experience';
import { Arrow } from './icon';
import { StrategyPreview, WorkspacePreview } from './showcase/product-preview';
import styles from './showcase/product-showcase.module.css';

export function ProductShowcase() {
  const content = experience.showcase;
  return <section id="systems" className={`section dark-section ${styles.section}`} aria-labelledby="showcase-heading">
    <div className={`container ${styles.layout}`}>
      <div className={styles.intro}>
        <p className="eyebrow">{content.eyebrow}</p>
        <h2 id="showcase-heading">{site.showcase.title}</h2>
        <p>{site.showcase.description}</p>
        <a className={`button ${styles.demoLink}`} href={content.link.href}>{content.link.label}<Arrow /></a>
      </div>
      <div id="product-previews" className={styles.previews} tabIndex={-1} aria-describedby="product-preview-notice">
        <div className={styles.cards}><StrategyPreview /><WorkspacePreview /></div>
        <p id="product-preview-notice" className={styles.notice}>{content.notice}</p>
      </div>
    </div>
  </section>;
}
