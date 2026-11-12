import Link from 'next/link';
import { insights, type ArticleCategory } from '@/content/insights';
import { getPublishedArticles } from '@/lib/articles';
import { CategoryNavigation } from './category-navigation';
import { ArticleList } from './article-list';

export function CategoryPage({ category }: { category: ArticleCategory }) {
  const content = insights.categories[category];
  return (
    <main id="main" className="detail-page container insights-page">
      <Link className="text-link" href="/insights">{insights.backToInsights}</Link>
      <header className="insights-page-heading"><h1>{content.title}</h1><p className="detail-description">{content.introduction}</p></header>
      <CategoryNavigation current={category} />
      {category === 'philosophy' && (
        <section className="insights-philosophy" aria-labelledby="philosophy-principle">
          <h2 id="philosophy-principle">{insights.philosophy.principle}</h2>
          {insights.philosophy.sections.map(section => (
            <section key={section.title}><h3>{section.title}</h3>{section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</section>
          ))}
        </section>
      )}
      <section className="insights-articles" aria-labelledby="articles-heading"><h2 id="articles-heading">{insights.articlesHeading}</h2><ArticleList articles={getPublishedArticles(category)} /></section>
    </main>
  );
}
