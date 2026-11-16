import test from 'node:test';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import { loadScoutModule } from './helpers/scout-loader.mjs';

test('official Agents SDK consumes mocked Responses API streaming with bounded execution and no tools/tracing', async () => {
  const requests=[];
  const text='Implementations start at $10,000 for a defined scope, including one customer-facing AI assistant with real appointment scheduling. Additional agents and advanced workflows are scoped separately.';
  const message={id:'msg_mock',type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text,annotations:[]}]};
  const response={id:'resp_mock',object:'response',created_at:1,status:'completed',model:'mock-scout-model',output:[message],usage:{input_tokens:20,output_tokens:15,total_tokens:35}};
  const streamEvents=[
    {type:'response.created',response:{...response,status:'in_progress',output:[]}},
    {type:'response.output_item.added',output_index:0,item:{...message,status:'in_progress',content:[]}},
    {type:'response.content_part.added',item_id:message.id,output_index:0,content_index:0,part:{type:'output_text',text:'',annotations:[]}},
    {type:'response.output_text.delta',item_id:message.id,output_index:0,content_index:0,delta:text.slice(0,30)},
    {type:'response.output_text.delta',item_id:message.id,output_index:0,content_index:0,delta:text.slice(30)},
    {type:'response.output_text.done',item_id:message.id,output_index:0,content_index:0,text},
    {type:'response.content_part.done',item_id:message.id,output_index:0,content_index:0,part:message.content[0]},
    {type:'response.output_item.done',output_index:0,item:message},
    {type:'response.completed',response},
  ];
  const client=new OpenAI({apiKey:'test-only',maxRetries:0,fetch:async(url,options)=>{
    requests.push({path:new URL(url).pathname,body:options.body?JSON.parse(options.body):null});
    if(String(url).includes('/models/'))return Response.json({id:'mock-scout-model',object:'model',created:1,owned_by:'test'});
    const encoded=streamEvents.map((event,i)=>`event: ${event.type}\ndata: ${JSON.stringify({...event,sequence_number:i})}\n\n`).join('');
    return new Response(encoded,{headers:{'content-type':'text/event-stream'}});
  }});
  const {createScoutModel}=loadScoutModule('src/lib/scout/agent.ts',{'./config':{scoutConfig:()=>({apiKey:'test-only',model:'mock-scout-model'})}});
  const model=createScoutModel(client);await model.verify();await model.verify();const chunks=[];
  const reply=await model.reply([{id:'1',role:'user',content:'What is the starting cost?'}],new AbortController().signal,s=>chunks.push(s));
  assert.equal(chunks.join(''),text);assert.equal(reply.text,text);assert.equal(reply.usage.input_tokens,20);
  assert.equal(requests.filter(r=>r.path.includes('/models/')).length,1);
  const body=requests.find(r=>r.path.endsWith('/responses')).body;
  assert.equal(body.store,false);assert.equal(body.max_output_tokens,700);assert.equal(body.model,'mock-scout-model');assert.deepEqual(body.tools,[]);
  assert.match(body.instructions,/Politely redirect unrelated/);assert.match(body.instructions,/\$10,000/);
  assert.equal(requests.some(r=>r.path.includes('traces')),false);
});
