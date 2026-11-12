import Image from 'next/image';
import Link from 'next/link';
import { site } from '@/content/site';
import { experience, type ProjectExample } from '@/content/experience';
import { ArchitectureDiagram } from './architecture-diagram';
import { Arrow } from './icon';

export function ProductShowcase() {
  return <section id="systems" className="showcase section dark-section" aria-labelledby="showcase-heading"><div className="container"><div className="section-heading split-heading"><div><p className="eyebrow">{experience.showcase.eyebrow}</p><h2 id="showcase-heading">{site.showcase.title}</h2></div><div><p>{site.showcase.description}</p><Link className="text-link" href={experience.showcase.link.href}>{experience.showcase.link.label}<Arrow /></Link></div></div><div className="project-grid">{experience.showcase.examples.map((example: ProjectExample) => <figure className="project-example" key={example.number}><div className="project-visual">{example.image ? <Image src={example.image.src} alt={example.image.alt} width={example.image.width} height={example.image.height} className="project-image" /> : <ArchitectureDiagram variant={example.diagram} compact />}</div><figcaption><div className="project-heading"><span className="mono-label">{example.number}</span><h3>{example.title}</h3></div><p>{example.description}</p></figcaption></figure>)}</div><p className="asset-note">{experience.showcase.assetNotice}</p></div></section>;
}
