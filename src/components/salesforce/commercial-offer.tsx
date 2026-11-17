import { salesforceCommercial as content } from '@/content/salesforce-commercial';
import styles from './salesforce.module.css';

export function SalesforceCommercialOffer() {
  return <section className={`section ${styles.commercial}`} aria-labelledby="sf-commercial">
    <div className="container">
      <div className={styles.sectionHeading}><p className="eyebrow">{content.eyebrow}</p><h2 id="sf-commercial">{content.title}</h2></div>
      <div className={styles.pricing}>
        <article><h3><strong>{content.implementation.price}</strong>{content.implementation.label}</h3><ul>{content.implementation.benefits.map(benefit => <li key={benefit}>{benefit}</li>)}</ul><p>{content.implementation.retention}</p></article>
        <article><h3><strong>{content.subscription.price}</strong>{content.subscription.label}</h3><p>{content.subscription.description}</p><p>{content.subscription.boundary}</p></article>
      </div>
    </div>
  </section>;
}
