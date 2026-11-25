import {Suspense} from 'react';
import styles from './preview.module.css';
import {MarketingError} from '@/lib/marketing/config';
import {connection} from 'next/server';
import {notFound,redirect} from 'next/navigation';
import Link from 'next/link';
import {requireOwner,ownerAuth} from '@/lib/marketing/auth';
import {contentRows,revisions} from '@/lib/marketing/content/repository';
import {draftArticle} from '@/lib/marketing/content/publishing';
import {ArticleBody} from '@/components/insights/article-body';
import {uuidPattern} from '@/lib/marketing/config';
export const metadata={title:'Private article preview',robots:{index:false,follow:false}};
async function ArticlePreview({params}:{params:Promise<{revisionId:string}>}){
 await connection();let owner;try{owner=await requireOwner(await ownerAuth());}catch(e){if(e instanceof MarketingError&&[401,403].includes(e.status))redirect('/admin/login');throw e;}const {revisionId}=await params;
 if(!uuidPattern.test(revisionId))notFound();const rows=await contentRows(owner.db,owner.tenantId),record=rows.find(r=>r.id===revisionId&&r.payload.workflow==='content-revision/v1');if(!record?.parent_id)notFound();
 const revision=revisions(rows,record.parent_id).find(r=>r.id===revisionId);if(!revision)notFound();const article=draftArticle(revision);
 return <main className={styles.page}><div className={styles.banner}><p>Private editorial preview · not published · revision {revision.hash.slice(0,12)}</p><Link href={'/admin/marketing?view=create&opportunity='+revision.opportunityId}>← Return to editorial review</Link></div><article className={styles.paper}><h1>{article.title}</h1><ArticleBody blocks={article.content} references={article.references} title={article.title}/></article></main>;
}

export default function Page({params}:{params:Promise<{revisionId:string}>}){return <Suspense fallback={<p>Verifying private article access…</p>}><ArticlePreview params={params}/></Suspense>;}
