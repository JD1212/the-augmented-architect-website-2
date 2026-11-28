// Component handlers and server-rendered markup only; no browser session or live writes.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadScoutModule as load} from './helpers/scout-loader.mjs';
const require=createRequire(import.meta.url),briefModule=load('src/lib/marketing/opportunities/article-brief.ts');
const opportunity={id:'d0c19ee4-b000-4fae-a20f-7c7423e6c33f',findingId:'85debcf0-814e-4003-aeb5-cb16e746f08e',finding:{title:'Original technical finding',targetCustomer:'Technical admins',recommendedAction:'Review execution order',limitations:['Unknown search demand']},briefHistory:[]};
function component(react=require('react'),fetcher=()=>{throw Error('Unexpected fetch');}){
 const compiled={exports:{}};const code=ts.transpileModule(readFileSync('src/components/marketing/article-brief-editor.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 new Function('require','module','exports','fetch',code)(id=>id==='react'?react:id.endsWith('.css')?{}:id.startsWith('@/')?briefModule:require(id),compiled,compiled.exports,fetcher);return compiled.exports.ArticleBriefEditor;
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function harness(fetcher,extra={}){const slots=[];let index=0;const hooks={useState(v){const i=index++;if(!(i in slots))slots[i]=v;return[slots[i],n=>{slots[i]=n;}];},useRef(v){const i=index++;if(!(i in slots))slots[i]={current:v};return slots[i];}};const C=component(hooks,fetcher),p={opportunity,disabled:false,onDirtyChange:()=>{},onSaved:async()=>{},...extra};function render(){index=0;return C(p);}function all(type){const found=[];function visit(n){if(!n||typeof n!=='object')return;if(n.type===type)found.push(n);for(const c of[n.props?.children].flat(Infinity))visit(c);}visit(render());return found;}return{render,all,button(label){return all('button').find(b=>b.props.children===label);}};}
test('brief is read-only first and displays the supplied business direction without saving or approving',()=>{
 const html=renderToStaticMarkup(createElement(component(),{opportunity,disabled:false,onDirtyChange:()=>{},onSaved:async()=>{}}));assert.match(html,/Why Salesforce Automation Becomes Unmanageable/);assert.match(html,/Unknown keyword volumes/);assert.match(html,/Edit article brief/);assert.match(html,/save before approval/);assert.doesNotMatch(html,/<textarea/);
});
test('explicit edit and save posts only the brief operation with exact prior revision; no approval or generation request',async()=>{
 const calls=[],dirty=[];let saved=0,release;const h=harness(async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});await new Promise(resolve=>{release=resolve;});return{ok:true,json:async()=>({id:'fixture'})};},{onDirtyChange:v=>dirty.push(v),onSaved:async()=>{saved++;}});
 h.button('Edit article brief').props.onClick();assert.equal(h.all('textarea').length,7);h.all('textarea')[0].props.onChange({target:{value:'A business-first Salesforce article'}});assert.deepEqual(dirty,[true]);h.button('Save article brief').props.onClick();h.button('Saving brief…').props.onClick();assert.equal(calls.length,1);assert.equal(calls[0].url,'/api/admin/marketing/opportunities');assert.equal(calls[0].body.operation,'saveBrief');assert.equal(calls[0].body.expectedFindingId,opportunity.findingId);assert.equal(calls[0].body.expectedBriefId,null);assert.equal(calls[0].body.brief.title,'A business-first Salesforce article');release();await tick();assert.equal(saved,1);assert.equal(dirty.at(-1),false);
});
test('cancel restores original fields, invalid input cannot save, and server failures never retry automatically',async()=>{
 let calls=0;const h=harness(async()=>{calls++;return{ok:false,json:async()=>({error:'The article brief changed. Refresh before saving.'})};});h.button('Edit article brief').props.onClick();h.all('textarea')[0].props.onChange({target:{value:''}});assert.equal(h.button('Save article brief').props.disabled,true);h.button('Save article brief').props.onClick();await tick();assert.equal(calls,0);h.button('Cancel brief edits').props.onClick();h.button('Save article brief').props.onClick();await tick();assert.equal(calls,1);assert.match(JSON.stringify(h.render()),/article brief changed/);await tick();assert.equal(calls,1);
});
