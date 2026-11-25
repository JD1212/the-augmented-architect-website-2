import {Suspense} from 'react';
import {connection} from 'next/server';
import Link from 'next/link';
import {ArticleMeasurement} from '@/components/analytics/article-measurement';
import {libraryContent, insights, categoryIds} from '@/content/insights';
import {articleHref, formatPublishedDate} from '@/lib/articles';
import {publishedArticles} from '@/lib/published-articles';
import {createPageMetadata} from '@/lib/metadata';
import {Arrow} from '@/components/icon';
import styles from './insights.module.css';

export const metadata=createPageMetadata({title:libraryContent.title,description:libraryContent.seoDescription},'/insights');
async function InsightsLibrary(){
 await connection();
 const articles=await publishedArticles();
 return <main id="main" className={`container detail-page ${styles.page}`}>
  <ArticleMeasurement pages={articles.map(a=>({path:articleHref(a.slug),title:a.title,publicationId:a.publication?.id}))}/><header className={styles.heading}><p className="eyebrow">{libraryContent.eyebrow}</p><h1>{libraryContent.title}</h1><p>{libraryContent.introduction}</p></header>
  <nav className={styles.topics} aria-label="Insights topics">{categoryIds.map(id=><a key={id} href={'#'+id}>{insights.categories[id].title}</a>)}</nav>
  <section aria-labelledby="insights-library-heading"><h2 id="insights-library-heading" className={styles.sectionTitle}>{libraryContent.articles}</h2>
   {!articles.length&&<p className="insights-empty-state">{libraryContent.empty}</p>}
   <ul className={styles.grid}>{articles.map(article=><li key={article.slug}><article className={styles.card}><Link href={articleHref(article.slug)}><p className="eyebrow">{insights.categories[article.category].title} · {article.format??'Article'}</p><h3>{article.title}</h3><p>{article.summary}</p><span className={styles.meta}>{article.publishedDate?<time dateTime={article.publishedDate}>{formatPublishedDate(article.publishedDate)}</time>:article.status==='draft'?'Editorial preview · not yet published':null}<Arrow/></span></Link></article></li>)}</ul>
  </section>
  <section className={styles.explore} aria-labelledby="insights-topics-heading"><h2 id="insights-topics-heading">{libraryContent.topics}</h2><div>{categoryIds.map(id=><section id={id} key={id}><h3>{insights.categories[id].title}</h3><p>{insights.categories[id].summary}</p><Link className="text-link" href={'/our-approach/'+id}>Our approach <Arrow/></Link></section>)}</div></section>
 </main>;
}

export default function InsightsPage(){return <Suspense fallback={<main className="container detail-page"><p>Loading Insights…</p></main>}><InsightsLibrary/></Suspense>;}
