import Image from 'next/image';
import { site } from '@/content/site';
import styles from './brand.module.css';

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return <span className={`${styles.brand}${inverse ? ` ${styles.inverse}` : ''}`}>
    <Image className={styles.mark} src={inverse ? '/brand/aa-monogram-inverse.svg' : '/brand/aa-monogram.svg'} width={426} height={192} alt="" aria-hidden="true" />
    <span className={styles.wordmark}>{site.brandLines.map(line => <span key={line}>{line}</span>)}</span>
  </span>;
}
