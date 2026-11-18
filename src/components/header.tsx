'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { site } from '@/content/site';
import { Brand } from './brand';
import { Arrow } from './icon';

export function Header() {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  return <header className="site-header" onKeyDown={event => { if (event.key === 'Escape' && open) { setOpen(false); toggle.current?.focus(); } }}><div className="container header-inner">
    <Link className="home-link" href="/" aria-label={site.accessibility.home} onClick={() => setOpen(false)}><Brand /></Link>
    <button ref={toggle} className="menu-toggle" aria-expanded={open} aria-controls="main-navigation" onClick={() => setOpen(value => !value)}>{site.accessibility.menu}<span aria-hidden="true">{open ? '−' : '+'}</span></button>
    <nav id="main-navigation" aria-label={site.accessibility.navigation} className={open ? 'navigation is-open' : 'navigation'}>
      {site.navigation.map(link => <Link key={link.href} href={link.href} aria-current={pathname === link.href ? 'page' : link.href === '/our-approach' && pathname.startsWith('/our-approach/') ? 'location' : undefined} onClick={() => setOpen(false)}>{link.label}</Link>)}
      <span className="header-account-actions">
        {/* A fresh document keeps public analytics and page state outside the private sign-in boundary. */}
        <a className="header-signin" href={site.signIn.href} aria-current={pathname === site.signIn.href ? 'page' : undefined} onClick={() => setOpen(false)}>{site.signIn.label}</a>
        <Link className="button header-cta" href={site.consultation.href} onClick={() => setOpen(false)}>{site.consultation.label}<Arrow /></Link>
      </span>
    </nav>
  </div></header>;
}
