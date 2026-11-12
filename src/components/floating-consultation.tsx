'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { site } from '@/content/site';
import { Arrow } from './icon';

export function FloatingConsultation() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  useEffect(() => {
    const visible = new Set<Element>();
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.3) visible.add(entry.target);
        else visible.delete(entry.target);
      }
      setShow(visible.size === 0);
    }, { threshold: [0, 0.3] });
    const frame = requestAnimationFrame(() => {
      const links = document.querySelectorAll('main a.button[href="/book"]');
      if (!links.length) setShow(true);
      links.forEach(link => observer.observe(link));
    });
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [pathname]);
  if (pathname === '/book' || !show) return null;
  return <aside className="consultation-dock"><Link className="button floating-consultation" href={site.consultation.href}>{site.consultation.label}<Arrow /></Link></aside>;
}
