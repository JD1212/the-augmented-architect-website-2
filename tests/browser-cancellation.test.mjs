import test from 'node:test';
import assert from 'node:assert/strict';
import {expectedContinuationEnd} from './helpers/browser-cancellation.mjs';
test('observed expired Chromium static pause is separate from application errors; unknown failures still fail',()=>{
 const origin='https://preview.example.com',event={resourceType:'Script',request:{url:origin+'/_next/static/immutable/chunks/2oq-xjstjargq.js'}},error={message:'Invalid InterceptionId.'};
 assert.equal(expectedContinuationEnd(error,event,new Set(),origin),'expired-static-script-pause');
 assert.equal(expectedContinuationEnd(error,{resourceType:'Stylesheet',request:{url:origin+'/_next/static/immutable/chunks/0vl1mscp8kuyy.css'}},new Set(),origin),'expired-static-style-pause');
 assert.equal(expectedContinuationEnd(error,{...event,networkId:'canceled'},new Set(['canceled']),origin),'canceled-network-request');
 const prefetch={resourceType:'XHR',request:{url:origin+'/how-we-work',headers:{'next-router-prefetch':'1','next-router-segment-prefetch':'/_tree',rsc:'1'}}};
 assert.equal(expectedContinuationEnd(error,prefetch,new Set(),origin),'expired-next-prefetch-pause');
 assert.equal(expectedContinuationEnd(error,{...prefetch,request:{...prefetch.request,url:origin+'/api/private'}},new Set(),origin),null);
 assert.equal(expectedContinuationEnd(error,{...prefetch,request:{...prefetch.request,headers:{rsc:'1'}}},new Set(),origin),null);
 for(const altered of [{...event,resourceType:'Document'},{...event,networkId:'not-canceled'},{...event,request:{url:origin+'/api/scout'}},{...event,request:{url:'https://other.example.com/_next/static/immutable/chunks/file.js'}}])assert.equal(expectedContinuationEnd(error,altered,new Set(),origin),null);
 assert.equal(expectedContinuationEnd({message:'A real runtime failure'},event,new Set(),origin),null);
});
