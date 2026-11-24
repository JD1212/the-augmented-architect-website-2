import Link from 'next/link';
import type {ArticleBlock,ArticleReference} from '@/content/articles/types';
import styles from './article-body.module.css';

export function ArticleBody({blocks,references=[]}:{blocks:readonly ArticleBlock[];references?:readonly ArticleReference[]}){
 function annotations(block:ArticleBlock){return <>{'links' in block&&block.links?.map(link=><span key={link.url}> <Link href={link.url} rel={link.url.startsWith('https:')?'noopener noreferrer':undefined}>{link.label}</Link></span>)}{'citationIds' in block&&block.citationIds?.map(id=>{const index=references.findIndex(r=>r.id===id);return index<0?null:<sup key={id}><a href={'#reference-'+id} aria-label={`Source ${index+1}: ${references[index].title}`}>[{index+1}]</a></sup>;})}</>;}
 return <div className={`insights-article-body ${styles.body}`}>{blocks.map((block,index)=>{
  switch(block.type){
   case 'paragraph':return <p key={index}>{block.text}{annotations(block)}</p>;
   case 'heading':return block.level===3?<h3 key={index}>{block.text}</h3>:<h2 key={index}>{block.text}</h2>;
   case 'quote':return <blockquote key={index}><p>{block.text}{annotations(block)}</p></blockquote>;
   case 'list':{const List=block.ordered?'ol':'ul';return <div key={index}><List>{block.items.map((item,i)=><li key={i}>{item}</li>)}</List>{annotations(block)}</div>;}
   case 'code':return <figure key={index}><figcaption>Illustrative {block.language} example{annotations(block)}</figcaption><pre><code>{block.text}</code></pre></figure>;
   case 'diagram':return <figure key={index}><figcaption>{block.text}{annotations(block)}</figcaption><ol className={styles.diagram}>{block.items.map((item,i)=><li key={i}>{item}</li>)}</ol></figure>;
   case 'cta':return <aside key={index} className={styles.cta}><p>{block.text}</p><Link className="button" href={block.link.url}>{block.link.label}</Link></aside>;
  }
 })}{references.length>0&&<section className={styles.references} aria-label="Sources"><h2>Sources</h2><ol>{references.map((reference,i)=><li id={'reference-'+reference.id} key={reference.id}><a href={reference.url} target="_blank" rel="noopener noreferrer">[{i+1}] {reference.title}</a></li>)}</ol></section>}</div>;
}
