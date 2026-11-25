import test from 'node:test';
import assert from 'node:assert/strict';
import { loadScoutModule } from './helpers/scout-loader.mjs';

const cache = new Map();
const { site } = loadScoutModule('src/content/site.ts', {}, cache);
const { shareImage, indexingMetadata, businessStructuredData, serializeStructuredData } = loadScoutModule('src/lib/site-seo.ts', {}, cache);
const { createPageMetadata } = loadScoutModule('src/lib/metadata.ts', {}, cache);

test('public metadata retains canonical paths and includes a usable shared social image', () => {
  const metadata = createPageMetadata({ title: 'AI Solutions', description: 'Approved service description.' }, '/ai-solutions');
  assert.equal(metadata.alternates.canonical, '/ai-solutions');
  assert.equal(metadata.openGraph.url, '/ai-solutions');
  assert.equal(metadata.openGraph.images[0].url, `${site.url}/opengraph-image`);
  assert.equal(metadata.twitter.card, 'summary_large_image');
  assert.equal(metadata.twitter.images[0].url, shareImage.url);
  assert.equal(shareImage.width, 1200);
  assert.equal(shareImage.height, 630);
});

test('Production remains indexable while Preview and development explicitly opt out', () => {
  assert.deepEqual(indexingMetadata({ VERCEL_ENV: 'production', NODE_ENV: 'production' }).robots, { index: true, follow: true });
  for (const env of [{ VERCEL_ENV: 'preview' }, { VERCEL_ENV: 'development' }, { NODE_ENV: 'development' }]) {
    assert.deepEqual(indexingMetadata(env).robots, { index: false, follow: false });
  }
});

test('Search Console emits only a supplied token and never a fabricated verification', () => {
  assert.equal(indexingMetadata({}).verification, undefined);
  assert.equal(indexingMetadata({ GOOGLE_SITE_VERIFICATION: ' ' }).verification, undefined);
  assert.deepEqual(indexingMetadata({ VERCEL_ENV: 'production', GOOGLE_SITE_VERIFICATION: ' supplied-token ' }).verification, { google: 'supplied-token' });
  assert.equal(indexingMetadata({ VERCEL_ENV: 'preview', GOOGLE_SITE_VERIFICATION: 'supplied-token' }).verification, undefined);
});

test('business schema describes only the actual company, website, and three service offerings', () => {
  const data = businessStructuredData();
  assert.equal(data['@context'], 'https://schema.org');
  const organization = data['@graph'].find(item => item['@type'] === 'Organization');
  assert.equal(organization.name, site.name);
  assert.equal(organization.url, site.url);
  assert.equal(data['@graph'].filter(item => item['@type'] === 'WebSite').length, 1);
  const services = data['@graph'].filter(item => item['@type'] === 'Service');
  assert.deepEqual(services.map(item => new URL(item.url).pathname), ['/ai-solutions', '/salesforce', '/custom-applications']);
  assert(services.every(item => item.provider['@id'] === organization['@id']));
  for (const invented of ['aggregateRating', 'review', 'streetAddress', 'openingHours', 'priceValidUntil']) assert(!JSON.stringify(data).includes(invented));
});

test('structured data serialization cannot close its script element', () => {
  const serialized = serializeStructuredData({ text: '</script><script>alert(1)</script>' });
  assert(!serialized.includes('<'));
  assert.equal(JSON.parse(serialized).text, '</script><script>alert(1)</script>');
});

test('robots preserves public crawling and discourages API and future admin crawling', () => {
  const robots = loadScoutModule('src/app/robots.ts', {}, cache).default();
  assert.equal(robots.rules.allow, '/');
  assert.deepEqual(robots.rules.disallow, ['/api/', '/admin']);
  assert.equal(robots.sitemap, `${site.url}/sitemap.xml`);
});

test('sitemap contains only unique, canonical public pages and real published articles', async () => {
  const sitemap = await loadScoutModule('src/app/sitemap.ts', { '@/content/articles': { articles: [] }, '@/lib/published-articles':{publishedArticles:async()=>[]} }, cache).default();
  assert.equal(new Set(sitemap.map(item => item.url)).size, sitemap.length);
  assert(sitemap.every(item => new URL(item.url).origin === site.url));
  for (const path of ['/ai-solutions', '/salesforce', '/custom-applications', '/our-approach/philosophy', '/our-approach/ai-architecture', '/our-approach/salesforce']) assert(sitemap.some(item => item.url === site.url + path));
  assert(sitemap.every(item => !/\/api\/|\/admin|__empty__/.test(item.url)));
});
