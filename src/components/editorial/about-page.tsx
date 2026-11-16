import Link from 'next/link';
import { aboutEditorial } from '@/content/editorial';
import { experience } from '@/content/experience';
import { ArchitectureDiagram } from '@/components/architecture-diagram';
import { Arrow } from '@/components/icon';
import { EditorialParagraph, EditorialSections } from './editorial-sections';
import styles from './editorial.module.css';

export function AboutPage() {
  const hero = experience.about;
  return <main id="main">
    <section className={`secondary-hero section ${styles.aboutHero}`}><div className="container secondary-hero-grid"><div><p className="eyebrow">{hero.eyebrow}</p><h1>{hero.title}</h1><p className="hero-description">{hero.description}</p><Link className="text-link" href={hero.link.href}>{hero.link.label}<Arrow /></Link></div><ArchitectureDiagram /></div></section>
    <div className={`container ${styles.aboutBody}`}>
      <section className={styles.aboutIntroduction} aria-labelledby="about-company"><h2 id="about-company">{aboutEditorial.title}</h2><div className={styles.introduction}>{aboutEditorial.introduction.map(paragraph => <EditorialParagraph key={paragraph} text={paragraph} />)}</div></section>
      <EditorialSections sections={aboutEditorial.sections} />
    </div>
    <section className="consultation-section section" aria-labelledby="about-consultation"><div className="container consultation-inner"><h2 id="about-consultation">{aboutEditorial.closing}</h2><div className="consultation-action"><Link className="button" href="/book">{aboutEditorial.cta}<Arrow /></Link></div></div></section>
  </main>;
}
