import Link from 'next/link';
import { categoryIds, categoryHref, insights, type ArticleCategory } from '@/content/insights';

export function CategoryNavigation({ current }: { current?: ArticleCategory }) {
  return (
    <nav className="insights-category-navigation" aria-label={insights.categoryNavigationLabel}>
      <ul>
        {categoryIds.map(category => (
          <li key={category}>
            <Link href={categoryHref(category)} aria-current={current === category ? 'page' : undefined}>
              {insights.categories[category].title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
