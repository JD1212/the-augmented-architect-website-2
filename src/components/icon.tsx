import type { IconName } from '@/content/site';
export function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  const paths: Record<IconName, React.ReactNode> = {
    layers: <><path d="m3 9 13-7 13 7-13 7Z" /><path d="m3 15 13 7 13-7M3 21l13 7 13-7" /></>,
    cloud: <path d="M9 25a7 7 0 0 1-1-14 9 9 0 0 1 17-1 7.5 7.5 0 0 1-1 15Z" />,
    bolt: <path d="m19 2-12 16h9l-3 12 12-18h-9Z" />,
    chart: <path d="M3 19h5v11H3zM13 12h5v18h-5zM23 4h5v26h-5z" />,
    code: <path d="m11 9-7 7 7 7m10-14 7 7-7 7M18 5l-4 22" />,
    data: <><ellipse cx="16" cy="7" rx="11" ry="4" /><path d="M5 7v18c0 5 22 5 22 0V7M5 16c0 5 22 5 22 0" /></>,
  };
  return <svg className={className} width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
export function Arrow() { return <span aria-hidden="true" className="arrow">→</span>; }
