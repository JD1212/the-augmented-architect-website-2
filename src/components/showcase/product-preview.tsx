import type { ReactNode } from 'react';
import Link from 'next/link';
import { experience, type ProductShowcaseContent } from '@/content/experience';
import { Icon } from '@/components/icon';
import styles from './product-showcase.module.css';

const content = experience.showcase;

function PreviewFrame({ variant, children }: { variant: 'strategy' | 'workspace'; children: ReactNode }) {
  const preview = content[variant];
  return <article className={styles.panel} aria-labelledby={`${preview.id}-title`} aria-describedby="product-preview-notice" data-product-preview={variant}>
    <header className={styles.brandBar}>
      <div className={styles.productBrand}>
        <svg className={styles.monogram} viewBox="0 0 44 38" fill="none" aria-hidden="true"><path d="M4 30L14 8H20L30 30M8 23H25M37 8H24V30H39M25 19H35" stroke="currentColor" strokeWidth="3" strokeLinejoin="miter" /></svg>
        <span>{content.brand}</span>
      </div>
      <span className={styles.windowDetail} aria-hidden="true"><i /><i /><i /></span>
    </header>
    <div className={styles.panelBody}>
      <PreviewSidebar preview={preview} workspace={variant === 'workspace'} />
      <div className={styles.main}>
        <p className={styles.overline}>{preview.label}</p>
        <h3 id={`${preview.id}-title`}>{preview.title}</h3>
        <p className={styles.subtitle}>{preview.subtitle}</p>
        {children}
      </div>
    </div>
  </article>;
}

function PreviewSidebar({ preview, workspace }: { preview: ProductShowcaseContent['strategy'] | ProductShowcaseContent['workspace']; workspace: boolean }) {
  return <aside className={styles.sidebar} aria-label={preview.navigationLabel}>
    <p className={styles.sidebarLabel}>{preview.navigationLabel}</p>
    {workspace && <div className={styles.business}><span>{content.workspace.businessLabel}</span><strong>{content.workspace.businessName}</strong></div>}
    <ul>{preview.navigation.map((item, index) => <li key={item.label} className={index === 0 ? styles.active : undefined}><Icon name={item.icon} /><span>{item.label}</span></li>)}</ul>
  </aside>;
}

export function StrategyPreview() {
  const preview = content.strategy;
  return <PreviewFrame variant="strategy">
    <dl className={styles.stats}>{preview.stats.map(stat => <div key={stat.label}><dt>{stat.label}</dt><dd>{stat.value}</dd></div>)}</dl>
    <section className={styles.activity} aria-labelledby="preview-activity-title">
      <h4 id="preview-activity-title">{preview.activityTitle}</h4>
      <ul>{preview.activity.map(item => <li key={item.title}><span className={styles.activityDot} aria-hidden="true" /><div><strong>{item.title}</strong><span className={styles.progress} aria-hidden="true"><i /></span></div><span className={styles.activityStatus}>{item.status}</span></li>)}</ul>
    </section>
  </PreviewFrame>;
}

export function WorkspacePreview() {
  const preview = content.workspace;
  return <PreviewFrame variant="workspace">
    <div className={styles.callout}>
      <p className={styles.overline}>{preview.callout.eyebrow}</p>
      <h4>{preview.callout.title}</h4>
      <p>{preview.callout.description}</p>
      <Link className={styles.agentLink} href={preview.callout.link.href}>{preview.callout.link.label}<span aria-hidden="true">→</span></Link>
    </div>
    <dl className={styles.readiness}>{preview.readiness.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>
  </PreviewFrame>;
}
