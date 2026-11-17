// Read-only connection check. Never creates calendar events, emails or marketing artifacts.
// MARKETING_REPORTING_LIVE=1 node --env-file=.env.local tests/marketing-reporting.live.mjs
import assert from 'node:assert/strict';
import {loadScoutModule} from './helpers/scout-loader.mjs';
assert.equal(process.env.MARKETING_REPORTING_LIVE,'1','Explicit reporting check opt-in is required');
assert.equal(process.env.GA4_PROPERTY_ID,'564904776','Use the approved numeric property');
assert(process.env.GOOGLE_MARKETING_SERVICE_ACCOUNT_JSON,'Dedicated reporting credentials are required');
const {ga4Report,searchConsoleReport}=loadScoutModule('src/lib/marketing/providers.ts');
const {reportingRange}=loadScoutModule('src/lib/marketing/ranges.ts');
const range=reportingRange('28');
const results=await Promise.allSettled([ga4Report(process.env.GA4_PROPERTY_ID,range),searchConsoleReport(range)]);
let failed=false;
for(const [i,result] of results.entries()){
  const source=i===0?'ga4':'search_console';
  if(result.status==='rejected'){failed=true;console.log(JSON.stringify({source,status:'failed',message:'Provider check failed. Check dedicated key, API enablement and property permissions; provider details withheld.'}));}
  else console.log(JSON.stringify({source,status:'connected',range,overviewRows:result.value.overview.rows.length,dailyRows:result.value.daily.rows.length,landingPageRows:result.value.pages.rows.length,queryRows:result.value.queries?.rows.length??null}));
}
assert(!failed,'One or more real reporting connections failed; do not release yet.');
