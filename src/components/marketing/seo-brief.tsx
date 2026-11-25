import type {SeoBrief} from '@augmented-architect/content-strategist';
import styles from './marketing.module.css';
import layout from './opportunity-backlog.module.css';
export function SeoBriefSummary({brief,frozen=false}:{brief:SeoBrief;frozen?:boolean}){
 return <section aria-label="Evidence-backed SEO brief"><h3>{frozen?'Approved SEO brief':'SEO brief'}</h3><p className={styles.muted}>{brief.customerProblem}</p><dl className={layout.facts}>
 <div><dt>Target keyword</dt><dd>{brief.primaryKeyword??'Not established by available evidence'}</dd></div>
 <div><dt>Search intent / audience</dt><dd>{brief.searchIntent} · {brief.audience}</dd></div>
 <div><dt>Search demand</dt><dd>{brief.demand.length?brief.demand.map(d=><p key={d.researchId+d.term}>{d.term}: {d.estimatedMonthlySearches===null?'Unknown':`${d.estimatedMonthlySearches.toLocaleString()} estimated monthly searches`} · provider observation {d.collectedAt.slice(0,10)} (expires {d.expiresAt.slice(0,10)})</p>):'Unknown. No supporting keyword observation is proven to have reached this finding.'}</dd></div>
 <div><dt>Organic competition</dt><dd>{brief.organicCompetition.length?brief.organicCompetition.map(c=><p key={c.researchId+c.term}>{c.term}: {c.urls.length} observed organic results{c.observedAt?' · '+c.observedAt.slice(0,10):' · observation date unavailable'}</p>):'Unknown. Paid-ad competition does not measure organic difficulty.'}</dd></div>
 <div><dt>Business value</dt><dd>{brief.whyWorthPursuing}</dd></div><div><dt>Recommendation</dt><dd>{brief.recommendedContentType.replaceAll('_',' ')} · {brief.confidence} confidence</dd></div>
 <div><dt>Existing content</dt><dd>{brief.existingContentConsiderations}</dd></div><div><dt>Next action</dt><dd>{brief.nextAction}</dd></div></dl>
 <details className={styles.ownerDetails}><summary>Advanced Details · evidence, gaps and scope</summary><ul>{brief.limitations.map((l,i)=><li key={i}>{l}</li>)}</ul><p>Additional research cost: {brief.expectedAdditionalResearchCostUsd===null?'Unknown; a separate quote and approval are required.':'$'+brief.expectedAdditionalResearchCostUsd.toFixed(3)} No research is purchased by this brief.</p><p>{brief.conversionAction}</p><pre>{JSON.stringify({version:brief.version,findingId:brief.findingId,evidenceIds:brief.evidenceIds,keywordObservations:brief.demand,organicObservations:brief.organicCompetition,internalLinks:brief.internalLinkUrls},null,2)}</pre></details></section>;
}
