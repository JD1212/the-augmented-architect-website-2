import { site } from '@/content/site';
export function Brand() {
  return <span className="brand"><span className="brand-mark" aria-hidden="true">{site.monogram}</span><span className="brand-name">{site.brandLines.map(line => <span key={line}>{line}</span>)}</span></span>;
}
