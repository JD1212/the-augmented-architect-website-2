import styles from './homepage-refinements.module.css';

/** Keep the editable heading intact, highlighting only a configured phrase. */
export function HeadingEmphasis({ text, phrase }: { text: string; phrase: string }) {
  const position = phrase ? text.indexOf(phrase) : -1;
  if (position < 0) return text;
  return <>{text.slice(0, position)}<span className={styles.emphasis}>{phrase}</span>{text.slice(position + phrase.length)}</>;
}
