import test from 'node:test';
import assert from 'node:assert/strict';
import { loadScoutModule } from './helpers/scout-loader.mjs';
const id='G-STBZV24WWN', reference='6c115cd1-379a-4e24-a10c-af9388207900';
function fixture(options={}) {
  const store=()=>{const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key),values};};
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{webdriver:false,doNotTrack:'0',...options}});
  globalThis.window={};globalThis.localStorage=store();globalThis.sessionStorage=store();
  globalThis.document={referrer:'https://search.example/results?email=private@example.invalid',cookie:''};globalThis.location={hostname:'theaugmentedarchitect.com'};
  const api=loadScoutModule('src/lib/analytics.ts');
  return {api,commands:()=>Array.from(window.dataLayer??[],item=>Array.from(item)),events:()=>Array.from(window.dataLayer??[],item=>Array.from(item)).filter(command=>command[0]==='event')};
}
test('denied/unknown consent, automated browsing, GPC and DNT never initialize a tag or queue events',()=>{
  for(const choice of [null,'denied']){const f=fixture();assert.equal(f.api.startAnalytics(id,'/',choice),false);f.api.trackScoutOpen();assert.equal(f.commands().length,0);}
  for(const options of [{webdriver:true},{globalPrivacyControl:true},{doNotTrack:'1'}]){const f=fixture(options);assert.equal(f.api.startAnalytics(id,'/','granted'),false);assert.equal(f.commands().length,0);}
});
test('valid consent expires and malformed values fail closed',()=>{
  const {api}=fixture();assert.equal(api.readConsent(null),null);assert.equal(api.readConsent('broken'),null);
  assert.equal(api.readConsent(JSON.stringify({version:1,choice:'granted',expires:100}),101),null);
  assert.equal(api.readConsent(JSON.stringify({version:1,choice:'granted',expires:200}),101),'granted');
  api.saveConsent('denied');assert.equal(api.readConsent(localStorage.getItem(api.consentKey)),'denied');
});
test('Consent Mode v2 denies all optional categories before granting analytics only; config disables automatic views and ads',()=>{
  const f=fixture();localStorage.setItem('aa.analytics.debug','1');assert(f.api.startAnalytics(id,'/','granted'));const commands=f.commands();
  assert.equal(Object.prototype.toString.call(window.dataLayer[0]),'[object Arguments]','Use the documented Google command queue, not an Array-shaped substitute');
  assert.deepEqual(commands[0],['consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'}]);
  assert.equal(commands[1][2].analytics_storage,'granted');assert.equal(commands[1][2].ad_user_data,'denied');
  const config=commands.find(c=>c[0]==='config');assert.equal(config[1],id);assert.equal(config[2].send_page_view,false);assert.equal(config[2].allow_google_signals,false);assert.equal(config[2].allow_ad_personalization_signals,false);
  const globalDefaults=commands.find(c=>c[0]==='set'&&typeof c[1]==='object');assert.equal(globalDefaults[1].send_page_view,false);assert.equal(globalDefaults[1].page_location,'https://theaugmentedarchitect.com/');
  assert(commands.indexOf(globalDefaults)<commands.findIndex(c=>c[0]==='js'));
  assert.equal(config[2].debug_mode,true);assert.equal(globalDefaults[1].debug_mode,true);
});
test('page transitions count once, query/fragment/unknown/private paths never enter analytics, and referrers are sanitized',()=>{
  const f=fixture();f.api.startAnalytics(id,'/','granted');f.api.analyticsPage('/');f.api.analyticsPage('/');f.api.analyticsPage('/ai-solutions');f.api.analyticsPage('/ai-solutions');f.api.analyticsPage('/');
  assert.equal(f.events().filter(c=>c[1]==='page_view').length,3);
  f.api.analyticsPage('/admin/customer@example.invalid');f.api.trackScoutOpen();assert.equal(f.events().length,3);
  assert.equal(f.api.safeReferrer('https://search.example/results?email=private@example.invalid'),'https://search.example');
  assert.equal(f.api.safeReferrer('https://theaugmentedarchitect.com/salesforce?email=private@example.invalid#secret'),'https://theaugmentedarchitect.com/salesforce');
  assert(!JSON.stringify(f.commands()).includes('private@example.invalid'));
});
test('explicit open/start/service events deduplicate across rerenders and reloads',()=>{
  const f=fixture();f.api.startAnalytics(id,'/salesforce','granted');f.api.analyticsPage('/salesforce');
  for(let i=0;i<3;i++){f.api.trackScoutOpen();f.api.trackConsultationStart();f.api.trackServiceEngagement('/salesforce');}
  assert.equal(f.events().filter(c=>c[1]==='scout_open').length,1);assert.equal(f.events().filter(c=>c[1]==='consultation_start').length,1);assert.equal(f.events().filter(c=>c[1]==='service_engagement').length,1);
  const next=loadScoutModule('src/lib/analytics.ts');next.startAnalytics(id,'/salesforce','granted');next.analyticsPage('/salesforce');next.trackScoutOpen();assert.equal(f.events().filter(c=>c[1]==='scout_open').length,1);
});
test('booking conversions require a consented observed submission and contain only the channel, never booking identifiers',()=>{
  const f=fixture();f.api.startAnalytics(id,'/book','granted');f.api.analyticsPage('/book');
  f.api.trackConfirmedBooking(reference,'scout');assert(!f.events().some(c=>c[1]==='consultation_booked'));
  f.api.armBooking(reference);f.api.trackConfirmedBooking(reference,'scout');f.api.trackConfirmedBooking(reference,'scout');
  assert.equal(f.events().filter(c=>c[1]==='consultation_booked').length,1);assert(!JSON.stringify(f.commands()).includes(reference));
  assert.equal(f.events().find(c=>c[1]==='consultation_booked')[2].booking_channel,'scout');
});
test('pending submissions survive a reload without replaying previously tracked or historical confirmations',()=>{
  const f=fixture();f.api.startAnalytics(id,'/book','granted');f.api.analyticsPage('/book');f.api.armBooking(reference);
  const next=loadScoutModule('src/lib/analytics.ts');next.startAnalytics(id,'/book','granted');next.analyticsPage('/book');next.trackConfirmedBooking(reference,'form');
  const restored=loadScoutModule('src/lib/analytics.ts');restored.startAnalytics(id,'/book','granted');restored.analyticsPage('/book');restored.trackConfirmedBooking(reference,'form');
  assert.equal(f.events().filter(c=>c[1]==='consultation_booked').length,1);
});
test('withdrawal disables further events and clears optional deduplication',()=>{
  const f=fixture();f.api.startAnalytics(id,'/','granted');f.api.analyticsPage('/');const before=f.events().length;f.api.stopAnalytics();f.api.analyticsPage('/salesforce');f.api.trackConsultationStart();
  assert.equal(f.events().length,before);assert.equal(window['ga-disable-'+id],true);assert.equal(sessionStorage.values.size,0);
});

test('only server-registered published article paths receive privacy-safe views and engagement',()=>{
 const f=fixture(),path='/insights/articles/approved-guide';assert.equal(f.api.startAnalytics(id,path,'granted'),false);
 f.api.registerArticleAnalytics([{path,title:'Approved guide',publicationId:reference},{path:'/admin/private',title:'Private report'}]);assert(!f.api.publicPages['/admin/private']);
 assert.equal(f.api.startAnalytics(id,path,'denied'),false);assert.equal(f.commands().length,0);assert.equal(f.api.startAnalytics(id,path,'granted'),true);f.api.analyticsPage(path);f.api.analyticsPage(path);f.api.trackArticleEngagement(path);f.api.trackArticleEngagement(path);
 assert.equal(f.events().filter(e=>e[1]==='page_view').length,1);assert.equal(f.events().filter(e=>e[1]==='article_engagement').length,1);assert.equal(f.events()[0][2].publication_id,reference);assert(!JSON.stringify(f.commands()).includes('private@example.invalid'));
 f.api.registerArticleAnalytics([]);assert(!f.api.publicPages[path]);
});

test('article consultation intent deduplicates and attribution survives navigation/reload without sharing booking identity',()=>{
 const f=fixture(),path='/insights/articles/approved-guide';f.api.registerArticleAnalytics([{path,title:'Approved guide',publicationId:reference}]);f.api.startAnalytics(id,path,'granted');f.api.analyticsPage(path);
 f.api.trackConsultationStart();f.api.trackConsultationStart();assert.equal(f.events().filter(e=>e[1]==='article_consultation_start').length,1);
 f.api.analyticsPage('/salesforce');f.api.armBooking(reference);
 const next=loadScoutModule('src/lib/analytics.ts');next.registerArticleAnalytics([{path,title:'Approved guide',publicationId:reference}]);next.startAnalytics(id,'/salesforce','granted');next.analyticsPage('/salesforce');next.trackConfirmedBooking(reference,'scout');next.trackConfirmedBooking(reference,'scout');
 const events=f.events().filter(e=>e[1]==='consultation_booked');assert.equal(events.length,1);assert.equal(events[0][2].origin_publication_id,reference);assert.equal(events[0][2].booking_channel,'scout');assert(!('booking_id' in events[0][2]));
});
