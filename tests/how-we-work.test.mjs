import test from 'node:test';
import assert from 'node:assert/strict';
import { loadScoutModule } from './helpers/scout-loader.mjs';

const { howWeWork: content } = loadScoutModule('src/content/how-we-work.ts');
const { site } = loadScoutModule('src/content/site.ts');

test('engagement journey has stable unique destinations and practical outcomes', () => {
  const stages = content.journey.stages;
  assert.equal(stages.length, 6);
  assert.equal(new Set(stages.map(s => s.id)).size, stages.length);
  for (const stage of stages) {
    assert.match(stage.id, /^[a-z][a-z-]+$/);
    assert(stage.description && stage.outcome && stage.activities.length);
  }
  assert.match(content.journey.description, /not a fixed package/);
  assert.match(content.journey.stages.at(-1).activities.join(' '), /separately agree any ongoing support/);
});

test('new navigation, service links and sitemap share real canonical destinations', async () => {
  assert.equal(site.navigation.filter(n => n.href === '/how-we-work').length, 1);
  const entries = await loadScoutModule('src/app/sitemap.ts', { '@/content/articles': { articles: [] }, '@/lib/published-articles':{publishedArticles:async()=>[]} }).default();
  assert.equal(entries.filter(e => e.url === `${site.url}/how-we-work`).length, 1);
  assert.deepEqual(content.services.links.map(l => l.href), ['/ai-solutions', '/salesforce', '/custom-applications']);
  for (const link of [content.architecture.link, content.engineering.link]) assert(entries.some(e => e.url === site.url + link.href));
  assert.equal(site.consultation.href, '/book');
});

test('metadata reuses canonical and social conventions without fictional claims', () => {
  const { createPageMetadata } = loadScoutModule('src/lib/metadata.ts');
  const meta = createPageMetadata(content.seo, '/how-we-work');
  assert.equal(meta.title, 'How We Work With You');
  assert.equal(meta.alternates.canonical, '/how-we-work');
  assert.equal(meta.openGraph.url, '/how-we-work');
  assert.equal(meta.openGraph.type, 'website');
  assert(!('author' in content) && !('publishedDate' in content));
  assert.match(content.questions.items.find(i => /security/.test(i.question)).answer, /do not promise a compliance certification/);
});
