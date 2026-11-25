import test from 'node:test';
import assert from 'node:assert/strict';
import { loadScoutModule } from './helpers/scout-loader.mjs';
import { schedulingFixture } from './helpers/scheduling-fixture.mjs';

const cache = new Map();
const { site } = loadScoutModule('src/content/site.ts', {}, cache);
test('sitemap and robots use the canonical public origin', async () => {
  assert.equal(site.url, 'https://theaugmentedarchitect.com');
  const sitemap = await loadScoutModule('src/app/sitemap.ts', { 'next/server':{connection:async()=>{}}, '@/content/articles': { articles: [] }, '@/lib/published-articles':{publishedArticles:async()=>[]} }, cache).default();
  assert(sitemap.length > 0);
  assert(sitemap.every(entry => new URL(entry.url).origin === site.url));
  const robots = loadScoutModule('src/app/robots.ts', {}, cache).default();
  assert.equal(robots.sitemap, 'https://theaugmentedarchitect.com/sitemap.xml');
});

// Opt in: SCOUT_POSITIONING_LIVE=1 node --env-file=.env.local --test tests/scout-technology-positioning.test.mjs
// Actual configured model/SDK/skill; all scheduling, database and mail operations are fixtures.
test('Scout naturally explains the approved technology positioning across six visitor questions', {
  skip: process.env.SCOUT_POSITIONING_LIVE !== '1', timeout: 240000,
}, async t => {
  const fixture = schedulingFixture(), calls = [];
  const service = new Proxy(fixture.service, { get(target, key) {
    const value = Reflect.get(target, key);
    if (typeof value !== 'function') return value;
    return (...args) => { if (key !== 'ui') calls.push(key); return value.apply(target, args); };
  } });
  const { scoutKnowledge } = loadScoutModule('src/lib/scout/knowledge.ts', {}, cache);
  const { customApplications } = loadScoutModule('src/content/custom-applications.ts', {}, cache);
  const { experience } = loadScoutModule('src/content/experience.ts', {}, cache);
  assert.equal(scoutKnowledge.applications.faqs, customApplications.faq);
  assert.equal(scoutKnowledge.about.principleDescription, experience.about.principleDescription);
  const { createScoutModel } = loadScoutModule('src/lib/scout/agent.ts', {
    '@/lib/booking/scheduling-server': { schedulingEnabled: () => true, schedulingService: () => service },
  });
  const model = createScoutModel(); await model.verify();
  const cases = [
    ['What technology stack do you typically use?', [/Next\.?js/i, /React/i, /TypeScript/i, /Supabase/i, /PostgreSQL|Postgres/i, /Vercel/i, /prefer|typically|usual|common/i, /business|requirements|needs|fit|not.*(?:restrict|exclusive|only)/i]],
    ['Do you build custom applications or use tools like n8n?', [/custom/i, /n8n/i, /integrat|alongside|existing|appropriate|when.*fit/i, /focus|primary|primarily|prefer|specializ/i]],
    ['Can you work with our existing Salesforce system?', [/Salesforce/i, /moderniz|architecture|Apex|Flows?|integrat/i]],
    ['What are your three main services?', [/AI|artificial intelligence/i, /Salesforce/i, /custom (?:business )?(?:applications?|software|apps)/i]],
    ['Why do you favor custom applications?', [/AI.assist|AI.*develop|develop.*AI/i, /efficien|faster|productive|practical/i, /test|extend|maintain|evolv|adapt/i]],
    ['How does your business-first AI architecture work?', [/business|process/i, /identit|customer/i, /context|memory|data/i, /permission|authoriz|access/i]],
  ];
  for (let i = 0; i < cases.length; i++) {
    const [question, patterns] = cases[i];
    const { text } = await model.reply([{id:`positioning-${i}`,role:'user',content:question}], AbortSignal.timeout(45000), () => {}, {ownerHash:'synthetic-positioning-review',visitorTimezone:'America/Los_Angeles'});
    t.diagnostic(`${question}\n${text}`);
    const answer = text.replace(/\*\*/g, '');
    for (const pattern of patterns) assert.match(answer, pattern, question);
    assert(answer.split(/\s+/).length <= 150, 'Natural concise answer, not an exhaustive package dump');
    if (i === 0) {
      const optionalPlatform = answer.search(/n8n|Copilot Studio/i);
      assert(optionalPlatform < 0 || optionalPlatform > answer.search(/Next\.?js/i), 'Preferred application stack leads the general stack answer');
    }
    if (i === 2) assert.doesNotMatch(answer, /must replace|must migrate.*(?:Supabase|Next)|Salesforce is our default/i);
  }
  assert.deepEqual(calls, [], 'Informational questions require no scheduling actions');
  assert.equal(fixture.sent.length, 0); assert.equal(fixture.records.size, 0); assert.equal(fixture.booking.creates, 0);
});
