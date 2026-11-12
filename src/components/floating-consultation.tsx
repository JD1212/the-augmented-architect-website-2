'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { site } from '@/content/site';
import { Arrow } from './icon';
export function FloatingConsultation() {
  const pathname = usePathname();
  return <aside className="consultation-dock"><Link className="button floating-consultation" href={site.consultation.href} aria-current={pathname === '/book' ? 'page' : undefined}>{site.consultation.label}<Arrow /></Link></aside>;
}
