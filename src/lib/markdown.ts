import {unified} from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import {importLimit} from './marketing/content/import-contract';
export function markdownHref(value:string){return value.startsWith('http://www.')?'https://'+value.slice(7):value;}
export function safeMarkdownUrl(value:string):boolean{
 value=markdownHref(value);
 if(value.startsWith('#'))return !/[\u0000-\u0020]/.test(value);
 if(value.startsWith('/'))return !value.startsWith('//')&&!/[\\\u0000-\u0020]/.test(value);
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!/[\u0000-\u0020\\]/.test(value)&&!u.hostname.endsWith('.local')&&u.hostname!=='localhost'&&!/^(?:[0-9.]+|\[.*\])$/.test(u.hostname);}catch{return false;}
}
type Node={type:string;url?:string;identifier?:string;children?:Node[]};
/** Parse, never execute. Raw HTML and unresolved references are errors, never silently discarded. */
export function inspectMarkdown(markdown:string){
 if(!markdown.trim()||new TextEncoder().encode(markdown).length>importLimit||markdown.includes('\0'))throw Error('Use a nonempty Markdown article no larger than 120 KB.');
 const tree=unified().use(remarkParse).use(remarkGfm).parse(markdown) as Node,definitions=new Map<string,string>(),references:string[]=[],links=new Set<string>(),renderedLinks:{url?:string;identifier?:string}[]=[];let nodes=0;
 const walk=(n:Node,depth=0)=>{if(++nodes>12000||depth>40)throw Error('The Markdown document is too complex.');if(n.type==='html')throw Error('Executable or raw HTML is not accepted. Use Markdown formatting instead.');
 if(n.type==='definition'&&n.identifier){if(definitions.has(n.identifier))throw Error('Duplicate reference definition: '+n.identifier);definitions.set(n.identifier,n.url!);}
 if(n.type==='linkReference'||n.type==='imageReference')references.push(n.identifier!);
 if(n.type==='link'||n.type==='linkReference')renderedLinks.push(n);
 if(n.url){if(!safeMarkdownUrl(n.url))throw Error('An article link is unsafe or unsupported. Use HTTPS, a site-relative path, or a section anchor.');links.add(n.url);}
 for(const child of n.children??[])walk(child,depth+1);};walk(tree);
 for(const ref of references)if(!definitions.has(ref))throw Error('An article reference has no definition: '+ref);
 return {links:[...links],renderedLinks:renderedLinks.map(n=>n.url??definitions.get(n.identifier!)!),externalLinks:[...links].filter(u=>u.startsWith('https://')),nodes};
}
function nodeText(n:Node):string{return (n as Node&{value?:string}).value??(n.children??[]).map(nodeText).join('');}
function headings(tree:Node){
 const result:{id:string;text:string;level:number}[]=[],used=new Map<string,number>();
 const walk=(n:Node)=>{const heading=n as Node&{depth?:number;data?:{hProperties?:Record<string,unknown>}};if(n.type==='heading'){
  const text=nodeText(n),slug=text.normalize('NFKD').toLowerCase().replace(/[^\p{Letter}\p{Number}\s-]/gu,'').trim().replace(/\s+/g,'-')||'section',count=used.get(slug)??0;used.set(slug,count+1);const id=slug+(count?'-'+count:'');heading.data={...heading.data,hProperties:{...heading.data?.hProperties,id}};
  result.push({id,text,level:heading.depth??2});
 }for(const child of n.children??[])walk(child);};walk(tree);return result;
}
export function markdownHeadings(source:string){return headings(unified().use(remarkParse).use(remarkGfm).parse(source) as Node);}
export function markdownHeadingIds(){return (tree:unknown)=>{headings(tree as Node);};}
