import Link from 'next/link';
import { site } from '@/content/site';
import { Arrow, Icon } from './icon';
export function Services() {
  return <section className="services container">{site.services.map(service => <Link className="service-card" href={service.href} key={service.href}><div className="service-icon"><Icon name={service.icon} /></div><div><h2>{service.title}</h2><p>{service.description}</p></div><Arrow /></Link>)}</section>;
}
