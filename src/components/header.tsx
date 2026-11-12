'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { site } from '@/content/site';
import { Brand } from './brand';
import { Arrow } from './icon';
export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return <header className="site-header"><div className="header-inner">
    <Link href="/" aria-label={site.accessibility.home} onClick={() => setOpen(false)}><Brand /></Link>
    <button className="menu-toggle" aria-expanded={open} aria-controls="main-navigation" onClick={() => setOpen(!open)}>{site.accessibility.menu}<span aria-hidden="true">{open ? '−' : '+'}</span></button>
    <nav id="main-navigation" aria-label={site.accessibility.navigation} className={open ? 'navigation is-open' : 'navigation'}>
      {site.navigation.map((link, i) => <Link key={link.href} href={link.href} aria-current={pathname === link.href ? 'page' : link.href === '/insights' && pathname.startsWith('/insights/') ? 'location' : undefined} onClick={() => setOpen(false)}>{link.label}{i < 2 && <span className="chevron" aria-hidden="true" />}</Link>)}
      <Link className="button header-cta" href={site.consultation.href} onClick={() => setOpen(false)}>{site.consultation.label}<Arrow /></Link>
    </nav>
  </div></header>;
}
