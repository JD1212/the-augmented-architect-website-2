import Link from 'next/link';
import { notFound } from 'next/navigation';
import { insights, categoryHref } from '@/content/insights';
import { site } from '@/content/site';
import { articleHref, formatPublishedDate, getArticleBySlug, getPublishedArticles, getRelatedArticles } from '@/lib/articles';
import { createPageMetadata } from '@/lib/metadata';
import { articleStructuredData } from '@/lib/article-seo';
import { ArticleBody } from '@/components/insights/article-body';
import { ArticleList } from '@/components/insights/article-list';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  const articles = getPublishedArticles();
  // Cache Components requires at least one validation param. This sentinel is
  // never an article or sitemap entry and always resolves to notFound().
  return articles.length ? articles.map(article => ({ slug: article.slug })) : [{ slug: '__empty__' }];
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();
  return createPageMetadata({ title: article.title, description: article.seoDescription }, articleHref(article.slug), {
    type: 'article', section: insights.categories[article.category].title,
    ...(article.publishedDate ? { publishedTime: article.publishedDate } : {}),
  });
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();
  const category = insights.categories[article.category];
  const related = getRelatedArticles(article);
  const jsonLd = articleStructuredData(article, site.url, site.name);
  return (
    <main id="main" className="detail-page container insights-page">
      <nav className="insights-breadcrumb" aria-label={insights.breadcrumbLabel}><ol><li><Link href="/insights">{insights.title}</Link></li><li><Link href={categoryHref(article.category)}>{category.title}</Link></li></ol></nav>
      <article className="insights-article">
        <header className="insights-page-heading"><p className="eyebrow">{category.title}</p><h1>{article.title}</h1><p className="detail-description">{article.summary}</p>
          {article.publishedDate && <p className="insights-published">{insights.publishedLabel} <time dateTime={article.publishedDate}>{formatPublishedDate(article.publishedDate)}</time></p>}
        </header>
        <ArticleBody blocks={article.content} />
      </article>
      <Link className="text-link insights-back-link" href={categoryHref(article.category)}>{insights.backToCategory}</Link>
      {related.length > 0 && <section className="insights-articles" aria-labelledby="related-heading"><h2 id="related-heading">{insights.relatedHeading}</h2><ArticleList articles={related} /></section>}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
    </main>
  );
}
