import Link from 'next/link';
import { site } from '@/content/site';
import { Brand } from './brand';
import { Arrow } from './icon';
export function ProductPreview({ index }: { index: number }) {
  const preview = site.showcase.previews[index];
  return <figure className="product-preview"><div className="preview-sidebar" aria-hidden="true"><Brand /><p>{preview.eyebrow}</p>{preview.menu.map((item, i) => <span key={item} className={i === 0 ? 'selected' : ''}>{item}</span>)}</div><div className="preview-content"><p className="preview-eyebrow">{preview.eyebrow}</p><h3>{preview.title}</h3><p>{preview.description}</p><div className="preview-tiles">{preview.tiles.map(tile => <div key={tile}><strong>{tile}</strong><span className="skeleton" /></div>)}</div><div className="activity-placeholder" aria-hidden="true">{[0, 1, 2].map(row => <div key={row}><i /><span /><span /></div>)}</div></div><figcaption>{site.showcase.placeholder}</figcaption></figure>;
}
export function ProductShowcase() {
  return <section className="showcase" aria-labelledby="showcase-heading"><div className="showcase-inner"><div className="showcase-copy"><h2 id="showcase-heading">{site.showcase.title}</h2><p>{site.showcase.description}</p><Link className="button button-outline" href={site.showcase.cta.href}>{site.showcase.cta.label}<Arrow /></Link></div><ProductPreview index={0} /><ProductPreview index={1} /></div></section>;
}
