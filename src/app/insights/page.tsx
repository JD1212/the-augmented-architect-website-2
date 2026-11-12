import Link from 'next/link';
import { insights, categoryIds, categoryHref } from '@/content/insights';
import { createPageMetadata } from '@/lib/metadata';
import { CategoryNavigation } from '@/components/insights/category-navigation';
import { Arrow } from '@/components/icon';

export const metadata = createPageMetadata({ title: insights.title, description: insights.seoDescription }, '/insights');

export default function InsightsPage() {
  return (
    <main id="main" className="detail-page container insights-page">
      <header className="insights-page-heading"><h1>{insights.title}</h1><p className="detail-description">{insights.introduction}</p></header>
      <CategoryNavigation />
      <ul className="insights-category-grid">
        {categoryIds.map(category => (
          <li key={category}><Link className="insights-category-card" href={categoryHref(category)}><h2>{insights.categories[category].title}</h2><p>{insights.categories[category].summary}</p><Arrow /></Link></li>
        ))}
      </ul>
    </main>
  );
}
