import Link from 'next/link';
import { site } from '@/content/site';
import { experience } from '@/content/experience';
import { Brand } from './brand';
export function Footer() {
  return <footer className="site-footer"><div className="container"><div className="footer-main"><div><Link href="/" aria-label={site.accessibility.home}><Brand /></Link><p>{experience.footer.description}</p></div><nav aria-label={experience.footer.navigationLabel}>{site.navigation.map(link => <Link href={link.href} key={link.href}>{link.label}</Link>)}</nav></div><div className="footer-bottom"><span>{experience.footer.legal}</span><span>{experience.hero.detail}</span></div></div></footer>;
}
