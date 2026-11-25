// Real Chromium CSS regression; no login, database writes, or article publication.
import assert from 'node:assert/strict';
import {readFileSync, mkdtempSync, writeFileSync, existsSync, readdirSync} from 'node:fs';
import {tmpdir, homedir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';

const candidates=[process.env.CHROME_BIN,'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
const cache=join(homedir(),'Library/Caches/ms-playwright');
if(existsSync(cache))for(const entry of readdirSync(cache))candidates.push(join(cache,entry,'chrome-headless-shell-mac-arm64/chrome-headless-shell'));
const chrome=candidates.find(path=>path&&existsSync(path));
assert(chrome,'Set CHROME_BIN to an installed Chromium browser');
const out=mkdtempSync(join(tmpdir(),'article-preview-contrast-'));
const globals=readFileSync('src/app/globals.css','utf8');
const portal=readFileSync('src/components/marketing/marketing.module.css','utf8');
const preview=readFileSync('src/app/admin/marketing/article-preview/[revisionId]/preview.module.css','utf8');
const title='Beyond the Boundaries of Intelligence: Why Architecture Is the Key to AI Discovery';
for(const order of ['portal-first','preview-first']){
 const css=globals+(order==='portal-first'?portal+preview:preview+portal);
 const file=join(out,order+'.html');
 writeFileSync(file,`<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style>
 <div class="app"><h1 id="dashboard">Private dashboard</h1><main class="page"><article class="paper"><h1 id="title">${title}</h1><p>Unchanged article text.</p></article></main></div>
 <script>
 const heading=getComputedStyle(document.querySelector('#title'));
 const paper=getComputedStyle(document.querySelector('.paper'));
 document.body.dataset.result=JSON.stringify({color:heading.color,background:paper.backgroundColor,dashboard:getComputedStyle(document.querySelector('#dashboard')).color,overflow:document.documentElement.scrollWidth>innerWidth});
 </script>`);
 for(const width of [1440,390]){
  const html=execFileSync(chrome,['--headless','--no-sandbox','--disable-gpu','--no-first-run','--user-data-dir='+join(out,order+'-'+width),'--window-size='+width+',900','--dump-dom','file://'+file],{encoding:'utf8',stdio:['ignore','pipe','ignore']});
  const encoded=html.match(/data-result="([^"]+)"/)?.[1];
  assert(encoded,'Browser must return computed styles');
  const result=JSON.parse(encoded.replaceAll('&quot;','"').replaceAll('&amp;','&'));
  assert.equal(result.color,'rgb(28, 37, 45)','Preview heading uses public Insights ink');
  assert.equal(result.background,'rgb(245, 242, 234)','Preview retains ivory paper');
  assert.equal(result.dashboard,'rgb(237, 243, 255)','Dashboard heading remains unchanged');
  assert.equal(result.overflow,false,'Long article title fits the viewport');
  const luminance=rgb=>rgb.match(/\d+/g).map(Number).map(v=>{const n=v/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
  const ratio=(luminance(result.background)+.05)/(luminance(result.color)+.05);
  assert(ratio>=7,'Heading exceeds WCAG AAA contrast');
  console.log(`PASS ${order}, ${width}px: ${ratio.toFixed(2)}:1 contrast; dashboard unchanged; no overflow`);
 }
}
