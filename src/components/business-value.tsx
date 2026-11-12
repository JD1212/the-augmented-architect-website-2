import { site } from '@/content/site';
import { experience } from '@/content/experience';
import { Icon } from './icon';
export function BusinessValue() {
  return <section className="business-value section" aria-labelledby="value-heading"><div className="container"><div className="section-heading split-heading"><div><p className="eyebrow">{experience.valueEyebrow}</p><h2 id="value-heading">{site.value.title}</h2></div><p>{site.value.description}</p></div><ul className="outcomes">{site.value.outcomes.map(outcome => <li key={outcome.label}><Icon name={outcome.icon} /><span>{outcome.label}</span></li>)}</ul></div></section>;
}
