// Offline verification of reviewed local package artifacts, lockfile and installed distributions.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const lock=JSON.parse(readFileSync('package-lock.json')),manifest=JSON.parse(readFileSync('package.json'));
for(const name of ['seo-analyst','content-strategist']){
 const p=JSON.parse(readFileSync(`vendor/${name}.provenance.json`)),path='vendor/'+p.artifact,key='@augmented-architect/'+name;
 assert.equal('sha512-'+createHash('sha512').update(readFileSync(path)).digest('base64'),p.integrity);
 assert.equal(manifest.dependencies[key],'file:'+path);assert.equal(lock.packages['node_modules/'+key].integrity,p.integrity);assert.equal(lock.packages['node_modules/'+key].version,p.version);
 const files=execFileSync('tar',['-tzf',path],{encoding:'utf8',env:{...process.env,LC_ALL:'C'}}).trim().split('\n').filter(f=>/^package\/dist\/[^/]+\.(js|d\.ts)$/.test(f));
 for(const file of files)assert.deepEqual(execFileSync('tar',['-xOzf',path,file],{env:{...process.env,LC_ALL:'C'}}),readFileSync('node_modules/'+key+'/'+file.slice(8)));
 console.log(`${key} ${p.version}: SHA-512, dependency, lockfile and ${files.length} installed distribution files verified.`);
}
