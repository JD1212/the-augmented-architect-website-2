import Link from 'next/link';
import type { Article } from '@/content/articles/types';
import { insights } from '@/content/insights';
import { articleHref, formatPublishedDate } from '@/lib/articles';
import { Arrow } from '@/components/icon';

export function ArticleCard({ article }: { article: Article }) {
  return (
    <article className="insights-article-card">
      <Link href={articleHref(article.slug)}>
        <p className="eyebrow">{insights.categories[article.category].title}</p>
        <h3>{article.title}</h3>
        <p className="insights-card-summary">{article.summary}</p>
        {article.publishedDate && <time dateTime={article.publishedDate}>{formatPublishedDate(article.publishedDate)}</time>}
        <Arrow />
      </Link>
    </article>
  );
}
