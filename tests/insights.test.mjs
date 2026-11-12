import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const nativeRequire = createRequire(new URL('../package.json', import.meta.url));

// Exercise the actual TypeScript modules with isolated, in-memory article data.
// No fixtures are written into the publishing registry and no runner is installed.
function loadWithArticles(articles = []) {
  const cache = new Map([[path.join(root, 'src/content/articles/index.ts'), { articles }]]);
  function load(filename) {
    let resolved = filename;
    if (!path.extname(resolved)) resolved = [filename + '.ts', filename + '.tsx', path.join(filename, 'index.ts')].find(existsSync);
    assert(resolved, `Cannot resolve ${filename}`);
    if (cache.has(resolved)) return cache.get(resolved);
    const output = ts.transpileModule(readFileSync(resolved, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
      fileName: resolved,
    }).outputText;
    const loaded = { exports: {} };
    cache.set(resolved, loaded.exports);
    const require = specifier => specifier.startsWith('@/') ? load(path.join(root, 'src', specifier.slice(2))) : specifier.startsWith('.') ? load(path.resolve(path.dirname(resolved), specifier)) : nativeRequire(specifier);
    vm.runInThisContext(`(function(require,module,exports){${output}\n})`, { filename: resolved })(require, loaded, loaded.exports);
    cache.set(resolved, loaded.exports);
    return loaded.exports;
  }
  return relative => load(path.join(root, relative));
}

// Test data is based on the supplied philosophy and never appears on the site.
const philosophy = {
  slug: 'test-philosophy', title: 'Build for change, not for a particular technology.',
  category: 'philosophy', summary: 'Modular, maintainable technology foundations.',
  seoDescription: 'Technology-independent architecture built around business needs.',
  status: 'published', content: [{ type: 'paragraph', text: 'Choose the right technology for the business.' }],
};

test('an empty registry produces no published articles or invented article sitemap entries', () => {
  const load = loadWithArticles();
  const library = load('src/lib/articles.ts');
  assert.deepEqual(library.getPublishedArticles(), []);
  assert.equal(library.getArticleBySlug('missing'), undefined);
  const sitemap = load('src/app/sitemap.ts').default();
  assert(sitemap.some(entry => entry.url.endsWith('/insights/philosophy')));
  assert.equal(sitemap.filter(entry => entry.url.includes('/insights/articles/')).length, 0);
});

test('only published articles are public, and related articles share a category', () => {
  const collection = [philosophy, { ...philosophy, slug: 'related' }, { ...philosophy, slug: 'draft', status: 'draft' }, { ...philosophy, slug: 'salesforce', category: 'salesforce' }];
  const library = loadWithArticles(collection)('src/lib/articles.ts');
  assert.equal(library.getPublishedArticles().length, 3);
  assert.equal(library.getPublishedArticles('philosophy').length, 2);
  assert.equal(library.getArticleBySlug('draft'), undefined);
  assert.deepEqual(library.getRelatedArticles(philosophy).map(article => article.slug), ['related']);
});

test('invalid metadata, duplicate slugs, invalid categories and invalid dates fail validation', () => {
  const { validateArticles } = loadWithArticles()('src/lib/articles.ts');
  assert.throws(() => validateArticles([philosophy, philosophy]), /Duplicate article slug/);
  for (const value of [{ slug: '../escape' }, { category: 'unknown' }, { title: '' }, { seoDescription: '' }, { status: 'unknown' }, { content: [] }, { publishedDate: '' }, { publishedDate: '2025-02-29' }, { publishedDate: '2024-13-01' }]) {
    assert.throws(() => validateArticles([{ ...philosophy, ...value }]));
  }
  assert.doesNotThrow(() => validateArticles([{ ...philosophy, publishedDate: '2024-02-29' }]));
});

test('article routes, metadata and JSON-LD omit dates unless explicitly supplied', async () => {
  const load = loadWithArticles([philosophy]);
  const route = load('src/app/insights/articles/[slug]/page.tsx');
  const { articleStructuredData } = load('src/lib/article-seo.ts');
  const metadata = await route.generateMetadata({ params: Promise.resolve({ slug: philosophy.slug }) });
  assert.equal(metadata.title, philosophy.title);
  assert.equal(metadata.description, philosophy.seoDescription);
  assert.equal(metadata.openGraph.type, 'article');
  assert.equal(metadata.openGraph.publishedTime, undefined);
  assert.equal(metadata.alternates.canonical, '/insights/articles/test-philosophy');
  const schema = articleStructuredData(philosophy, 'https://example.com', 'The Augmented Architect');
  assert.equal(schema['@type'], 'Article');
  assert.equal(schema.datePublished, undefined);
  assert.equal(schema.author, undefined);
  assert.equal(schema.mainEntityOfPage['@id'], 'https://example.com/insights/articles/test-philosophy');
  assert.equal(articleStructuredData({ ...philosophy, publishedDate: '2024-02-29' }, 'https://example.com', 'The Augmented Architect').datePublished, '2024-02-29');
  assert.deepEqual(route.generateStaticParams(), [{ slug: philosophy.slug }]);
  await assert.rejects(route.generateMetadata({ params: Promise.resolve({ slug: 'missing' }) }));
});

test('published article routes render typed content safely, without dates or fake authors', async () => {
  const article = { ...philosophy, content: [{ type: 'paragraph', text: '<script>must stay text</script>' }, { type: 'heading', text: 'Shared context' }, { type: 'list', items: ['Governance', 'Maintainability'] }, { type: 'list', ordered: true, items: ['Business process', 'Technology choice'] }, { type: 'quote', text: philosophy.title }] };
  const load = loadWithArticles([article]);
  const route = load('src/app/insights/articles/[slug]/page.tsx');
  const element = await route.default({ params: Promise.resolve({ slug: article.slug }) });
  const { renderToStaticMarkup } = nativeRequire('react-dom/server');
  const html = renderToStaticMarkup(element);
  assert(html.includes('&lt;script&gt;must stay text&lt;/script&gt;'));
  assert(html.includes('<ul>'));
  assert(html.includes('<ol>'));
  assert(html.includes('<blockquote>'));
  assert(!html.includes('<time'));
  const json = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(json.headline, article.title);
  assert.equal(json.datePublished, undefined);
  const escapedArticle = { ...article, title: '</script><script>alert(1)</script>' };
  const escapedLoad = loadWithArticles([escapedArticle]);
  const escapedRoute = escapedLoad('src/app/insights/articles/[slug]/page.tsx');
  const escapedHtml = renderToStaticMarkup(await escapedRoute.default({ params: Promise.resolve({ slug: article.slug }) }));
  const scripts = escapedHtml.match(/<script/g) || [];
  assert.equal(scripts.length, 1);
  const escapedJson = JSON.parse(escapedHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(escapedJson.headline, escapedArticle.title);
});

test('the sitemap includes published articles and excludes drafts', () => {
  const load = loadWithArticles([philosophy, { ...philosophy, slug: 'private-draft', status: 'draft' }]);
  const entries = load('src/app/sitemap.ts').default().filter(entry => entry.url.includes('/insights/articles/'));
  assert.equal(entries.length, 1);
  assert(entries[0].url.endsWith('/insights/articles/test-philosophy'));
  assert.equal(entries[0].lastModified, undefined);
});
