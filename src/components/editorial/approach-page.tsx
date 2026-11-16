import Link from 'next/link';
import { approachPages, ourApproach, type ApproachId } from '@/content/editorial';
import { CategoryNavigation } from '@/components/insights/category-navigation';
import { EditorialParagraph, EditorialSections } from './editorial-sections';
import styles from './editorial.module.css';

export function ApproachPage({ id }: { id: ApproachId }) {
  const page = approachPages[id];
  return <main id="main" className={`container ${styles.page}`}>
    <nav aria-label={ourApproach.breadcrumbLabel} className={styles.breadcrumb}><Link href="/our-approach">{ourApproach.title}</Link><span aria-hidden="true">/</span><span aria-current="page">{page.label}</span></nav>
    <CategoryNavigation current={id} />
    <article>
      <header className={styles.pageHeader}><div><p className="eyebrow">{page.eyebrow}</p><h1>{page.title}</h1></div><div className={styles.introduction}>{page.introduction.map(paragraph => <EditorialParagraph key={paragraph} text={paragraph} />)}</div></header>
      <EditorialSections sections={page.sections} />
      <footer className={styles.closing}><p className="eyebrow">{ourApproach.closingLabel}</p><p>{page.closing}</p></footer>
    </article>
  </main>;
}
