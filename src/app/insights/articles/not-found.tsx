import Link from 'next/link';
import { insights } from '@/content/insights';

export default function ArticleNotFound() {
  return <main id="main" className="detail-page container insights-page"><h1>{insights.notFound.title}</h1><p className="detail-description">{insights.notFound.description}</p><Link className="text-link insights-back-link" href="/insights">{insights.backToInsights}</Link></main>;
}
