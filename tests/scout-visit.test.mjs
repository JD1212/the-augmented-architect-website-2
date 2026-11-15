import test from 'node:test';
import assert from 'node:assert/strict';
import {loadScoutModule} from './helpers/scout-loader.mjs';
const {createScoutVisit,scoutVisitKey}=loadScoutModule('src/lib/scout/visit.ts');
const origin='https://scout.example';
const storage=()=>{const map=new Map();return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};
const nav=(type='navigate',referrer='')=>({type,referrer,origin});
test('fresh visits require an explicit choice for saved history; only a boolean is stored',()=>{
 const s=storage(),v=createScoutVisit(s,nav());assert.equal(v.isVisible(),false);v.accept();assert.equal(v.isVisible(),true);assert.deepEqual([...s.map],[[scoutVisitKey,'1']]);
});
test('refresh of an active conversation retains the display choice',()=>{
 const s=storage();createScoutVisit(s,nav()).accept();assert.equal(createScoutVisit(s,nav('reload')).isVisible(),true);
});
test('same-origin document navigation retains the active choice',()=>{
 const s=storage();createScoutVisit(s,nav()).accept();assert.equal(createScoutVisit(s,nav('navigate',origin+'/salesforce')).isVisible(),true);
});
test('external, direct and back/forward returns require a new choice',()=>{
 for(const n of [nav('navigate','https://elsewhere.example'),nav(),nav('back_forward',origin+'/')]){const s=storage();createScoutVisit(s,nav()).accept();assert.equal(createScoutVisit(s,n).isVisible(),false);assert.equal(s.map.size,0);}
});
test('reset and expiration forget the display choice',()=>{
 const s=storage(),v=createScoutVisit(s,nav());v.accept();v.forget();assert.equal(v.isVisible(),false);assert.equal(createScoutVisit(s,nav('reload')).isVisible(),false);
});
test('unavailable browser storage fails closed but allows an in-memory choice',()=>{
 const denied={getItem(){throw Error('denied')},setItem(){throw Error('denied')},removeItem(){throw Error('denied')}};
 for(const s of [null,denied]){const v=createScoutVisit(s,nav('reload'));assert.equal(v.isVisible(),false);v.accept();assert.equal(v.isVisible(),true);v.forget();assert.equal(v.isVisible(),false);}
});
