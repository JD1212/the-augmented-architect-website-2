import test from 'node:test';
import assert from 'node:assert/strict';
import { loadScoutModule } from './helpers/scout-loader.mjs';
const cache = new Map();
const { approachIds, approachPages, aboutEditorial, editorialKnowledge, approachHref } = loadScoutModule('src/content/editorial.ts', {}, cache);

test('permanent editorial pages have meaningful unique anchors and no publishing metadata or instructions', () => {
  const ids = new Set();
  for (const page of [...Object.values(approachPages), aboutEditorial]) {
    assert(page.title && page.introduction.length && page.sections.length >= 4 && page.closing);
    assert(!('publishedDate' in page) && !('author' in page));
    for (const section of page.sections) {
      assert(!ids.has(section.id)); ids.add(section.id);
      assert(section.title && section.paragraphs.every(p => p.trim()));
      assert(!section.paragraphs.some(p => /Create a clean|Suggested visual|Use the existing design language|\*\*Visual/.test(p)));
    }
  }
  assert.deepEqual(approachPages['ai-architecture'].sections.flatMap(s => s.visual ? [s.visual] : []), ['layers', 'conversation']);
});

test('navigation and sitemap advertise the permanent pages without legacy URLs or invented posts', async () => {
  const { site } = loadScoutModule('src/content/site.ts', {}, cache);
  assert(site.navigation.some(n => n.label === 'Our Approach' && n.href === '/our-approach'));
  assert(site.navigation.some(n => n.label === 'About' && n.href === '/about'));
  const entries = await loadScoutModule('src/app/sitemap.ts', { '@/content/articles': { articles: [] }, '@/lib/published-articles':{publishedArticles:async()=>[]} }, cache).default();
  for (const id of approachIds) assert(entries.some(e => e.url.endsWith(approachHref(id))));
  assert(entries.some(e => e.url.endsWith('/about')));
  assert(entries.some(e => e.url.endsWith('/insights')));
  assert(!entries.some(e => /\/articles\//.test(e.url)));
});

test('all legacy Insights paths have a permanent nested-path redirect', async () => {
  const { default: config } = loadScoutModule('next.config.ts');
  const rules = await config.redirects();
  assert(!rules.some(r=>r.source==='/insights/:path*'));
  assert(rules.some(r=>r.source==='/our-approach/articles/:slug'&&r.destination==='/insights/articles/:slug'&&r.permanent));
  for(const id of approachIds)assert(rules.some(r=>r.source==='/insights/'+id&&r.destination===approachHref(id)&&r.permanent));
});

test('Scout receives the approved summaries and links through its existing registry, without full editorial pages', () => {
  const { scoutKnowledge } = loadScoutModule('src/lib/scout/knowledge.ts', {}, cache);
  assert.equal(scoutKnowledge.approach, editorialKnowledge.approach);
  assert.equal(scoutKnowledge.about.founder, editorialKnowledge.about.founder);
  assert.equal(scoutKnowledge.about.href, '/about');
  assert.equal(scoutKnowledge.approach.philosophy.href, approachHref('philosophy'));
  assert.equal(scoutKnowledge.approach.aiArchitecture.href, approachHref('ai-architecture'));
  assert.equal(scoutKnowledge.approach.salesforce.href, approachHref('salesforce'));
  assert(JSON.stringify(editorialKnowledge).length < JSON.stringify({ approachPages, aboutEditorial }).length / 3);
  assert.match(editorialKnowledge.approach.salesforce.summary, /Flows are useful/);
  assert.match(editorialKnowledge.approach.salesforce.summary, /well-structured Apex/);
  assert.match(editorialKnowledge.about.founder.experience, /Uber's global legal team/);
});
