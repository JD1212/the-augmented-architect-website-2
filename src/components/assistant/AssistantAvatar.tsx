import styles from './assistant.module.css';

export function AssistantAvatar() {
  return <svg className={styles.avatar} viewBox="0 0 80 88" fill="none" aria-hidden="true">
    <ellipse cx="40" cy="81" rx="20" ry="3" fill="currentColor" opacity=".12" />
    <g className={styles.bot}>
      <path d="M40 17V10" stroke="var(--assistant-graphite)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="40" cy="8" r="4" fill="var(--assistant-cyan)" stroke="var(--assistant-graphite)" strokeWidth="2" />
      <rect x="11" y="29" width="8" height="17" rx="4" fill="var(--blue)" />
      <rect x="61" y="29" width="8" height="17" rx="4" fill="var(--blue)" />
      <rect x="17" y="17" width="46" height="39" rx="15" fill="var(--assistant-graphite)" />
      <path d="M25 25C33 22 47 22 55 25" stroke="var(--ivory)" opacity=".2" strokeLinecap="round" />
      <rect x="23" y="29" width="34" height="18" rx="8" fill="var(--assistant-ink)" />
      <g className={styles.eyes} fill="var(--assistant-cyan)">
        <rect x="29" y="34" width="5" height="7" rx="2.5" />
        <rect x="46" y="34" width="5" height="7" rx="2.5" />
      </g>
      <path d="M36 45Q40 48 44 45" stroke="var(--assistant-cyan)" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M26 58Q40 53 54 58L57 69Q40 78 23 69Z" fill="var(--assistant-graphite)" />
      <path d="M32 67L36 60L40 67M40 67L44 60L48 67M34 64H38M42 64H46" stroke="var(--assistant-cyan)" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M22 60L17 65M58 60L63 65" stroke="var(--blue)" strokeWidth="5" strokeLinecap="round" />
    </g>
  </svg>;
}
