import { CategoryPage } from '@/components/insights/category-page';
import { insights, categoryHref } from '@/content/insights';
import { createPageMetadata } from '@/lib/metadata';

const category = 'philosophy' as const;
const content = insights.categories[category];
export const metadata = createPageMetadata({ title: content.title, description: content.seoDescription }, categoryHref(category));

export default function Page() { return <CategoryPage category={category} />; }
