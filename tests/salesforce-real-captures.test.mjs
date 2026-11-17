import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadScoutModule} from './helpers/scout-loader.mjs';
const {realSalesforceShowcase:copy,captureAssets}=loadScoutModule('src/content/salesforce-showcase.ts');
const manifest=JSON.parse(readFileSync('docs/salesforce-showcase-2-manifest.json','utf8'));

test('public Salesforce derivatives match approved sanitized hashes and native PNG dimensions',()=>{
 const assets=Object.values(copy).filter(v=>v?.asset?.src?.includes('/salesforce-showcase-2/')).map(v=>v.asset);
 assert.equal(assets.length,7);assert.equal(new Set(assets.map(a=>a.src)).size,7);
 assert.deepEqual(readdirSync('public/images/salesforce-showcase-2').sort(),manifest.images.map(i=>i.file).sort());
 for(const asset of assets){const entry=manifest.images.find(e=>asset.src.endsWith('/'+e.file));assert(entry);const bytes=readFileSync('public'+asset.src);assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.outputSha256);assert.equal(bytes.readUInt32BE(16),asset.width);assert.equal(bytes.readUInt32BE(20),asset.height);assert(asset.alt.length>30);}
});

test('real showcase keeps older registration evidence and states demonstration boundaries',()=>{
 assert.equal(copy.registrations.asset,captureAssets[2]);
 assert.match(copy.captureBoundary,/four registered actions/);assert.match(copy.captureBoundary,/three inactive actions at orders 100, 200, and 300/);
 assert.match(copy.captureBoundary,/no matching record-triggered Flows/);assert.match(copy.captureBoundary,/do not demonstrate executed automation/);assert.match(copy.captureBoundary,/not exhaustive/);
 assert.match(copy.workspaceBoundary,/not completed AI debugging or successful deployment/);assert.match(copy.workspaceBoundary,/review changes, run tests, obtain authorization/);
 assert.match(copy.context.description,/timestamped snapshot/);assert.match(copy.context.description,/redacted/);
});
