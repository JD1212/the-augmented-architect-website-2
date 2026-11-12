import type { Article } from '@/content/articles/types';
import { insights } from '@/content/insights';
import { ArticleCard } from './article-card';

export function ArticleList({ articles }: { articles: readonly Article[] }) {
  if (!articles.length) {
    return <div className="insights-empty-state"><p>{insights.empty.title}</p><p>{insights.empty.description}</p></div>;
  }
  return <ul className="insights-article-grid">{articles.map(article => <li key={article.slug}><ArticleCard article={article} /></li>)}</ul>;
}
