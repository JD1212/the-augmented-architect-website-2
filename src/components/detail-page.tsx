import Link from 'next/link';
import { site } from '@/content/site';
import { ProductPreview } from '@/components/product-showcase';
import { Arrow } from '@/components/icon';
type Slug = keyof typeof site.pages;
export function DetailPage({ slug }: { slug: Slug }) {
  const content = site.pages[slug];
  return <main id="main" className="detail-page container"><p className="eyebrow">{site.name}</p><h1>{content.title}</h1><p className="detail-description">{content.description}</p>
    {slug === 'ai-solutions' && <section id="demo" className="detail-demo"><h2>{site.showcase.title}</h2><p className="page-notice">{content.notice}</p><div className="detail-previews"><ProductPreview index={0} /><ProductPreview index={1} /></div></section>}
    {content.notice && slug !== 'ai-solutions' && <p className="page-notice">{content.notice}</p>}
    <div className="detail-actions">{slug !== 'book' && <Link className="button" href={site.consultation.href}>{site.consultation.label}<Arrow /></Link>}<Link className="text-link" href={site.backHome.href}>{site.backHome.label}<Arrow /></Link></div>
  </main>;
}
