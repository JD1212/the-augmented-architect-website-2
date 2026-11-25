import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {safeMarkdownUrl,markdownHref,markdownHeadingIds} from '@/lib/markdown';
/** No raw-HTML plugin or dangerous HTML insertion. The server also validates saved Markdown. */
export function MarkdownBody({source,title}:{source:string;title?:string}){
 const content=title&&source.startsWith('# '+title+'\n')?source.slice(('# '+title+'\n').length):source;
 return <Markdown remarkPlugins={[remarkGfm,markdownHeadingIds]} skipHtml urlTransform={url=>safeMarkdownUrl(url)?markdownHref(url):''} components={{a:({href,children})=><a href={href} target={href?.startsWith('https://')?'_blank':undefined} rel={href?.startsWith('https://')?'noopener noreferrer':undefined}>{children}</a>}}>{content}</Markdown>;
}
