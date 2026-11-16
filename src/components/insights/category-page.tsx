import { ApproachPage } from '@/components/editorial/approach-page';
import type { ArticleCategory } from '@/content/insights';

export function CategoryPage({ category }: { category: ArticleCategory }) {
  return <ApproachPage id={category} />;
}
