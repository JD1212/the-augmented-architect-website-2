import type {ArticleBlock} from '@/content/articles/types';
import {site} from '@/content/site';
import {inspectMarkdown} from './markdown';

/** Presentation only: never changes the approved article or its revision hash. */
export function hasArticleConsultation(blocks:readonly ArticleBlock[]){
 const isBooking=(href:string)=>{
  try{const url=new URL(href,site.url);return url.origin===site.url&&url.pathname===site.consultation.href&&!url.search&&!url.hash;}catch{return false;}
 };
 return blocks.some(block=>block.type==='cta'?isBooking(block.link.url):block.type==='markdown'&&inspectMarkdown(block.text).renderedLinks.some(isBooking));
}
