import Image from 'next/image';
import Link from 'next/link';
import { site } from '@/content/site';
import { experience } from '@/content/experience';
import { Arrow } from './icon';
import styles from './hero.module.css';

export function Hero() {
  const artwork = experience.hero.artwork;
  return (
    <section className={styles.hero} aria-labelledby="hero-heading" data-home-hero>
      <div className={`container ${styles.inner}`}>
        <div className={styles.copy}>
          <p className={`eyebrow ${styles.eyebrow}`}>{site.hero.eyebrow}</p>
          <h1 id="hero-heading" className={styles.title}>{site.hero.title}</h1>
          <p className="hero-description">{site.hero.description}</p>
          <div className="hero-actions">
            <Link className="button" href={site.consultation.href}>{site.consultation.label}<Arrow /></Link>
            <a className="text-link" href={site.hero.secondary.href}>{site.hero.secondary.label}<span aria-hidden="true">↓</span></a>
          </div>
          <p className={styles.detail}><span>{experience.hero.detail}</span><Link className={styles.philosophyLink} href={site.hero.philosophy.href}>{site.hero.philosophy.label}<span aria-hidden="true">↗</span></Link></p>
        </div>
        <figure className={styles.visual}>
          <div className={styles.artwork}>
            <Image className={styles.image} src={artwork.src} alt={artwork.alt} width={artwork.width} height={artwork.height}
              sizes="(max-width: 800px) 100vw, (max-width: 1440px) 65vw, 920px" loading="eager" fetchPriority="high" />
          </div>
        </figure>
      </div>
    </section>
  );
}
