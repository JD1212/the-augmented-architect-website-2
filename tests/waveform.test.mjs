import test from 'node:test';import assert from 'node:assert/strict';
import {loadScoutModule} from './helpers/scout-loader.mjs';
const {microphoneLevel,waveformBars,createMicrophoneMeter}=loadScoutModule('src/lib/assistant/waveform.ts');
const samples=amplitude=>Float32Array.from({length:256},(_,i)=>i%2?amplitude:-amplitude);
test('actual microphone RMS, not random animation, controls speaking height',()=>{
 assert.equal(microphoneLevel(samples(0)),0);assert.equal(microphoneLevel(samples(.002)),0);
 const quiet=microphoneLevel(samples(.04)),loud=microphoneLevel(samples(.12));assert(quiet>0&&loud>quiet);
 assert(Math.max(...waveformBars(loud,1,false))>Math.max(...waveformBars(quiet,1,false)));
 assert.equal(microphoneLevel(samples(2)),1);
});
test('idle ripple remains near baseline; reduced motion is static',()=>{
 const a=waveformBars(0,0,false),b=waveformBars(0,1,false);
 assert.notDeepEqual(a,b);assert(a.every(h=>h>=2.3&&h<=3.7));assert(b.every(h=>h>=2.3&&h<=3.7));
 assert.deepEqual(waveformBars(0,0,true),waveformBars(0,100,true));assert(waveformBars(0,0,true).every(h=>h===3));
});
function fixture(capture){let stopped=0,closed=0,disconnected=0,resumed=0,signal=.04,connections=[];
 const stream={getTracks:()=>[{stop(){stopped++;}}]},analyser={fftSize:0,getFloatTimeDomainData(a){a.set(samples(signal));},disconnect(){disconnected++;}};
 class Context{state='running';createAnalyser(){return analyser;}createMediaStreamSource(s){assert.equal(s,stream);return{connect(node){connections.push(node);},disconnect(){disconnected++;}};}resume(){resumed++;return Promise.resolve();}close(){closed++;return Promise.resolve();}}
 return{meter:createMicrophoneMeter({capture:capture??(async()=>stream),Context}),stream,analyser,stats:()=>({stopped,closed,disconnected,resumed,connections}),setSignal:n=>signal=n};
}
test('visual meter reads live amplitude and cleans up its own stream/context without playback',async()=>{
 const f=fixture();await f.meter.start();const quiet=f.meter.level();f.setSignal(.12);assert(f.meter.level()>quiet);
 assert.deepEqual(f.stats().connections,[f.analyser]);f.meter.dispose();f.meter.dispose();
 assert.equal(f.stats().stopped,1);assert.equal(f.stats().closed,1);assert.equal(f.stats().disconnected,2);assert.equal(f.meter.level(),0);
});
test('late microphone permission resolution after stop immediately releases tracks',async()=>{
 let resolve;const waiting=new Promise(r=>resolve=r),f=fixture(()=>waiting),start=f.meter.start();f.meter.dispose();resolve(f.stream);await start;
 assert.equal(f.stats().stopped,1);assert.equal(f.stats().closed,0);assert.equal(f.meter.level(),0);
});
test('visual-meter permission/device failure degrades to baseline without throwing',async()=>{
 const f=fixture(async()=>{throw Error('denied');});await f.meter.start();assert.equal(f.meter.level(),0);f.meter.dispose();assert.equal(f.stats().closed,0);
});
test('approved welcome copy and all four questions stay centralized and exact',()=>{
 const {assistantContent:c,assistantWelcome}=loadScoutModule('src/content/assistant.ts');
 assert.equal(c.subtitle,'Your AI website guide');assert.deepEqual(assistantWelcome.map(m=>m.content),["Hi, I'm Scout. Welcome!",'I can help you explore our services, answer questions about what we build, and find the right solution for your business.',"When you're ready, I can also schedule, reschedule, or cancel your free 30-minute consultation.",'Just ask me anything.']);
 assert.deepEqual(c.starters.map(s=>s.label),['What can you build for my business?','Tell me about your AI solutions','How do you modernize Salesforce?','Book a free consultation']);
 assert(c.starters.every(s=>s.message===s.label));
});
