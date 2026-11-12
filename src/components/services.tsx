import Link from 'next/link';
import { site } from '@/content/site';
import { experience } from '@/content/experience';
import { Arrow, Icon } from './icon';
export function Services() {
  return <section id="services" className="services-section section" aria-labelledby="services-heading"><div className="container"><div className="section-heading compact-heading"><p className="eyebrow">{experience.services.eyebrow}</p><h2 id="services-heading">{experience.services.title}</h2></div><div className="services">{site.services.map((service, index) => <Link className="service-card" href={service.href} key={service.href}><div className="service-card-top"><span className="icon-box"><Icon name={service.icon} /></span><span className="mono-label">{experience.services.labels[index]}</span><Arrow /></div><h3>{service.title}</h3><p>{service.description}</p></Link>)}</div></div></section>;
}
