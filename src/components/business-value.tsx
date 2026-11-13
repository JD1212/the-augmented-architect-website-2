import { site } from '@/content/site';
import { experience } from '@/content/experience';
import { Icon } from './icon';
import { HeadingEmphasis } from './heading-emphasis';
import styles from './homepage-refinements.module.css';
export function BusinessValue() {
  return <section className={`business-value section ${styles.value}`} aria-labelledby="value-heading"><div className="container"><div className="section-heading split-heading"><div><p className="eyebrow">{experience.valueEyebrow}</p><h2 id="value-heading"><HeadingEmphasis text={site.value.title} phrase={site.value.emphasis} /></h2></div><p className={styles.valueDescription}>{site.value.description}</p></div><ul className={styles.tiles}>{site.value.outcomes.map(outcome => <li key={outcome.label}><Icon name={outcome.icon} /><span>{outcome.label}</span></li>)}</ul></div></section>;
}
