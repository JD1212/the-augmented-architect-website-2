import { Fragment } from 'react';
import type { EditorialSection } from '@/content/editorial';
import { EditorialDiagram } from './editorial-diagram';
import styles from './editorial.module.css';

/** A tiny, text-only emphasis renderer for approved editorial copy. No raw HTML. */
export function EditorialParagraph({ text }: { text: string }) {
  const content = text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => part.startsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part);
  return text.startsWith('"') && text.endsWith('"') ? <blockquote>{content}</blockquote> : <p>{content}</p>;
}
export function EditorialSections({ sections }: { sections: readonly EditorialSection[] }) {
  return <div className={styles.sections}>{sections.map((section, index) => <section key={section.id} aria-labelledby={section.id} className={styles.section}>
    <header><span className={styles.number} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>{section.kicker && <p className={styles.kicker}>{section.kicker}</p>}<h2 id={section.id}>{section.title}</h2></header>
    <div className={styles.prose}>{section.paragraphs.map((paragraph, i) => <Fragment key={paragraph}><EditorialParagraph text={paragraph} />{section.items && i === (section.listAfterParagraph ?? section.paragraphs.length) - 1 && <ul className={styles.expertise}>{section.items.map(item => <li key={item}>{item}</li>)}</ul>}</Fragment>)}</div>
    {section.visual && <EditorialDiagram kind={section.visual} />}
  </section>)}</div>;
}
