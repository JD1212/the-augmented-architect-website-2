import Link from 'next/link';
import { notFound } from 'next/navigation';
import { insights, libraryContent } from '@/content/insights';
import { site } from '@/content/site';
import { articleHref, formatPublishedDate, getArticleBySlug, getVisibleArticles, getRelatedArticles } from '@/lib/articles';
import { createPageMetadata } from '@/lib/metadata';
import { articleStructuredData } from '@/lib/article-seo';
import { ArticleBody } from '@/components/insights/article-body';
import styles from '../../insights.module.css';
import { ArticleList } from '@/components/insights/article-list';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  const articles = getVisibleArticles();
  // Cache Components requires at least one validation param. This sentinel is
  // never an article or sitemap entry and always resolves to notFound().
  return articles.length ? articles.map(article => ({ slug: article.slug })) : [{ slug: '__empty__' }];
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();
  const metadata = createPageMetadata({ title: article.seoTitle ?? article.title, description: article.seoDescription }, articleHref(article.slug), {
    type: 'article', section: insights.categories[article.category].title,
    ...(article.publishedDate ? { publishedTime: article.publishedDate } : {}),
  });
  return article.status === 'draft' ? {...metadata, robots: {index: false, follow: false}} : metadata;
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();
  const category = insights.categories[article.category];
  const preview = article.status === 'draft';
  const related = getRelatedArticles(article);
  const jsonLd = articleStructuredData(article, site.url, site.name);
  return (
    <main id="main" className="detail-page container insights-page">
      <nav className="insights-breadcrumb" aria-label={insights.breadcrumbLabel}><ol><li><Link href="/insights">{libraryContent.title}</Link></li><li><Link href={"/insights#"+article.category}>{category.title}</Link></li></ol></nav>
      <div className={styles.articleLayout}><article className="insights-article">
        <header className="insights-page-heading"><p className="eyebrow">{category.title} · {article.format ?? "Article"}</p><h1>{article.title}</h1><p className="detail-description">{article.summary}</p>
          {preview && <p className="insights-published">Editorial preview · awaiting owner approval. Not published.</p>}
          {article.publishedDate && <p className="insights-published">{insights.publishedLabel} <time dateTime={article.publishedDate}>{formatPublishedDate(article.publishedDate)}</time></p>}
        </header>
        <ArticleBody blocks={article.content} references={article.references} />
      </article><aside className={styles.contents}><nav aria-label="On this page"><h2>In this guide</h2><ol>{article.content.map((block,index)=>block.type==='heading'&&block.level!==3?<li key={index}><a href={'#section-'+index}>{block.text}</a></li>:null)}</ol></nav></aside></div>
      <Link className="text-link insights-back-link" href="/insights">{libraryContent.back}</Link>
      {related.length > 0 && <section className="insights-articles" aria-labelledby="related-heading"><h2 id="related-heading">{insights.relatedHeading}</h2><ArticleList articles={related} /></section>}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
    </main>
  );
}
