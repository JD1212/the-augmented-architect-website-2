import { site } from '@/content/site';
import { Icon } from './icon';
export function BusinessValue() {
  return <section className="business-value container" aria-labelledby="value-heading"><h2 id="value-heading">{site.value.title}</h2><p>{site.value.description}</p><ul className="outcomes">{site.value.outcomes.map(outcome => <li key={outcome.label}><Icon name={outcome.icon} /><span>{outcome.label}</span></li>)}</ul></section>;
}
