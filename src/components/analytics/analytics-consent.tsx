'use client';
import { Suspense, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Script from 'next/script';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { privacy as copy } from '@/content/privacy';
import { registerArticleAnalytics, isRegisteredArticle, trackArticleEngagement, type ArticleAnalyticsPage, analyticsActive, analyticsPage, browserAllowsAnalytics, consentKey, readConsent, saveConsent, startAnalytics, stopAnalytics, trackServiceEngagement, type ConsentChoice } from '@/lib/analytics';
import styles from './analytics.module.css';
const serverSnapshot = () => null;
const serverDisabled = () => false;
const noSubscription = () => () => {};
const storedChoice = () => { try { return localStorage.getItem(consentKey) ?? ''; } catch { return ''; } };
function subscribeChoice(update: () => void) { window.addEventListener('storage', update); window.addEventListener('aa:analytics-choice', update); return () => { window.removeEventListener('storage', update); window.removeEventListener('aa:analytics-choice', update); }; }
function subscribeReady(update: () => void) { window.addEventListener('aa:analytics-ready', update); return () => window.removeEventListener('aa:analytics-ready', update); }

export function PrivacyPreferences() {
  return <button type="button" className={styles.preference} onClick={() => window.dispatchEvent(new Event('aa:privacy-preferences'))}>{copy.preferences}</button>;
}
export function AnalyticsConsent({ enabled, articlePages=[] }: { enabled: boolean;articlePages?:readonly ArticleAnalyticsPage[] }) {
  return <Suspense fallback={null}><Consent enabled={enabled} articlePages={articlePages} /></Suspense>;
}
function Consent({ enabled,articlePages }: { enabled: boolean;articlePages:readonly ArticleAnalyticsPage[] }) {
  const path = usePathname();
  const raw = useSyncExternalStore(subscribeChoice, storedChoice, serverSnapshot);
  const [visitChoice, setVisitChoice] = useState<ConsentChoice | null>(null), [settingsOpen, setSettingsOpen] = useState(false);
  const choice = visitChoice ?? readConsent(raw);
  const visible = settingsOpen || (raw !== null && choice === null);
  const allowed = useSyncExternalStore(noSubscription, browserAllowsAnalytics, serverDisabled);
  const load = useSyncExternalStore(subscribeReady, analyticsActive, serverDisabled);
  const heading = useRef<HTMLHeadingElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || copy.measurementId;
  useEffect(() => {
    const preferences = () => { returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setSettingsOpen(true); requestAnimationFrame(() => heading.current?.focus()); };
    const storage = (event: StorageEvent) => {
      if (event.key !== consentKey) return;
      const next = readConsent(event.newValue);
      if (next !== 'granted') { stopAnalytics(); location.reload(); } else setVisitChoice(null);
    };
    window.addEventListener('aa:privacy-preferences', preferences); window.addEventListener('storage', storage);
    return () => { window.removeEventListener('aa:privacy-preferences', preferences); window.removeEventListener('storage', storage); };
  }, []);
  useEffect(()=>{registerArticleAnalytics(articlePages);},[articlePages]);
  useEffect(() => {
    if (enabled && choice === 'granted') { startAnalytics(id, path, choice); analyticsPage(path); }
  }, [enabled, choice, id, path]);
  useEffect(() => {
    if (!load || !isRegisteredArticle(path)&&!['/ai-solutions', '/salesforce', '/custom-applications'].includes(path)) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const watch = () => { clearTimeout(timer); if (document.visibilityState === 'visible') timer = setTimeout(() => isRegisteredArticle(path)?trackArticleEngagement(path):trackServiceEngagement(path), isRegisteredArticle(path)?30000:10000); };
    watch(); document.addEventListener('visibilitychange', watch);
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', watch); };
  }, [load, path]);
  function choose(next: ConsentChoice) {
    saveConsent(next); setSettingsOpen(false); setVisitChoice(next); window.dispatchEvent(new Event('aa:analytics-choice'));
    requestAnimationFrame(() => returnFocus.current?.focus());
    if (next === 'denied') { stopAnalytics(); if (load) location.reload(); }
  }
  return <>
    {load && <Script id="ga4-consented" src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" referrerPolicy="strict-origin" />}
    {visible && <section className={styles.banner} aria-labelledby="analytics-consent-title" role="region">
      <h2 id="analytics-consent-title" tabIndex={-1} ref={heading}>{copy.bannerTitle}</h2>
      <p>{copy.bannerDescription} <Link href="/privacy">{copy.readMore}</Link>.</p>
      {!allowed && <p>{copy.browserPrivacy}</p>}
      <div className={styles.actions}><button type="button" onClick={() => choose('denied')}>{copy.decline}</button><button type="button" onClick={() => choose('granted')} disabled={!allowed}>{copy.allow}</button></div>
      {choice && <button type="button" className={styles.preference} onClick={() => { setSettingsOpen(false); requestAnimationFrame(() => returnFocus.current?.focus()); }}>{copy.close}</button>}
    </section>}
  </>;
}
