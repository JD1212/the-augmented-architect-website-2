import type OpenAI from 'openai';
import {safeSource,SeoValidationError} from '@augmented-architect/seo-analyst';

type Source={url:string;title:string};
export type ResearchCatalog={sources:Source[];searchCalls:number;mapping:{annotatedUrls:string[];discoveredUrls:string[];catalogUrls:string[];omittedUncitedCount:number}};
/** Provider annotations are authoritative citations. Never discard them behind uncited search hits. */
export function collectResearchSources(response:Pick<OpenAI.Responses.Response,'output'>):ResearchCatalog {
  const cited=new Map<string,Source>(),discovered=new Map<string,Source>();let searchCalls=0;
  for(const item of response.output){
    if(item.type==='web_search_call'){
      searchCalls++;const action=item.action;
      if(action&&'sources' in action&&Array.isArray(action.sources))for(const s of action.sources){if('url' in s&&typeof s.url==='string'&&safeSource(s.url))discovered.set(s.url,{url:s.url,title:'Discovered research reference'});}
    }
    if(item.type==='message')for(const content of item.content)if(content.type==='output_text')for(const a of content.annotations)if(a.type==='url_citation'){
      if(!safeSource(a.url))throw new SeoValidationError('UNSAFE_SOURCE_REFERENCE','Unsafe annotated source reference','research.annotations.url');
      cited.set(a.url,{url:a.url,title:(a.title?.trim()||'Cited research source').slice(0,250)});
    }
  }
  if(cited.size>15)throw new SeoValidationError('RESEARCH_CITATION_LIMIT','Research citation limit exceeded; cited references were not silently discarded','research.annotations');
  const sources=[...cited.values()];
  for(const source of discovered.values())if(sources.length<15&&!cited.has(source.url))sources.push(source);
  if(searchCalls<1||!sources.length)throw new SeoValidationError('RESEARCH_SOURCE_MISSING','Research requires traceable hosted search sources','research.sources');
  return {sources,searchCalls,mapping:{annotatedUrls:[...cited.keys()],discoveredUrls:[...discovered.keys()].slice(0,100),catalogUrls:sources.map(s=>s.url),omittedUncitedCount:[...discovered.keys()].filter(url=>!sources.some(s=>s.url===url)).length}};
}
