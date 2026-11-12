import Link from 'next/link';
import { site } from '@/content/site';
import { Arrow, Icon } from './icon';
import { Brand } from './brand';
export function Hero() {
  return <section className="hero" aria-labelledby="hero-heading"><div className="hero-art" aria-hidden="true">
    <div className="art-glow" /><div className="network-node node-code"><Icon name="code" /></div><div className="network-node node-data"><Icon name="data" /></div><div className="network-node node-cloud"><Icon name="cloud" /></div>
    <div className="monitor"><div className="monitor-screen"><Brand /><div className="system-diagram"><div className="ai-core">{site.hero.aiLabel}<Icon name="layers" /></div><div className="system-stack">{site.hero.systemLabels.map(label => <span key={label}>{label}</span>)}</div></div><div className="code-lines">{Array.from({ length: 7 }, (_, i) => <i key={i} />)}</div></div><div className="monitor-chin" /></div>
    <div className="laptop"><div className="laptop-screen"><div className="mini-sidebar" /><div className="mini-chart">{[25, 42, 35, 65, 55, 85].map((height, i) => <i style={{ height: `${height}%` }} key={i} />)}</div></div></div><div className="desk" /><span className="art-label">{site.hero.artworkLabel}</span>
  </div><div className="hero-inner"><div className="hero-copy"><p className="eyebrow">{site.hero.eyebrow}</p><h1 id="hero-heading">{site.hero.title}</h1><p className="hero-description">{site.hero.description}</p><div className="hero-actions"><Link className="button" href={site.consultation.href}>{site.consultation.label}<Arrow /></Link><Link className="text-link" href={site.hero.secondary.href}>{site.hero.secondary.label}</Link></div></div></div></section>;
}
