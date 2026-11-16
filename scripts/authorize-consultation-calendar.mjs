// Local, owner-run authorization helper. Never runs in Vercel or exposes tokens.
import {createServer} from 'node:http';
import {randomBytes,createHash} from 'node:crypto';
import {readFile,writeFile,chmod} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
require('@next/env').loadEnvConfig(process.cwd(),false,{info(){},error(){}});
const file='.env.local';
execFileSync('git',['check-ignore',file],{stdio:'ignore'});
if(execFileSync('git',['ls-files',file],{encoding:'utf8'}).trim())throw Error('Refusing to store credentials in a tracked file.');
const {GOOGLE_CALENDAR_CLIENT_ID:clientId,GOOGLE_CALENDAR_CLIENT_SECRET:clientSecret}=process.env;
if(!clientId||!clientSecret)throw Error('Configure GOOGLE_CALENDAR_CLIENT_ID and GOOGLE_CALENDAR_CLIENT_SECRET in ignored .env.local first.');
const redirect='http://127.0.0.1:39391/oauth/callback',state=randomBytes(32).toString('base64url'),verifier=randomBytes(48).toString('base64url');
const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');
url.search=new URLSearchParams({client_id:clientId,redirect_uri:redirect,response_type:'code',scope:'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.freebusy https://www.googleapis.com/auth/calendar.calendars.readonly',access_type:'offline',prompt:'consent',state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'}).toString();
let handling=false;
const server=createServer(async(req,res)=>{
 const target=new URL(req.url,redirect);
 if(target.pathname!=='/oauth/callback'){res.writeHead(404);res.end();return;}
 if(handling||target.searchParams.get('state')!==state){res.writeHead(400);res.end('Invalid authorization state. Restart the local helper.');return;}
 handling=true;
 try{
  const code=target.searchParams.get('code');if(!code||target.searchParams.has('error'))throw Error('Authorization not granted.');
  const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,redirect_uri:redirect,grant_type:'authorization_code',code,code_verifier:verifier})});
  if(!response.ok)throw Error('Authorization exchange failed.');const data=await response.json();
  if(typeof data.refresh_token!=='string'||!data.refresh_token||!/^[A-Za-z0-9_./~+=-]+$/.test(data.refresh_token))throw Error('No usable offline refresh token was returned.');
  const granted=new Set((data.scope??'').split(' '));if(!['https://www.googleapis.com/auth/calendar.events','https://www.googleapis.com/auth/calendar.freebusy','https://www.googleapis.com/auth/calendar.calendars.readonly'].every(s=>granted.has(s)))throw Error('Required Calendar permissions were not granted.');
  const existing=await readFile(file,'utf8');const line='GOOGLE_CALENDAR_REFRESH_TOKEN='+data.refresh_token;
  const next=/^GOOGLE_CALENDAR_REFRESH_TOKEN=.*$/m.test(existing)?existing.replace(/^GOOGLE_CALENDAR_REFRESH_TOKEN=.*$/m,()=>line):existing+(existing.endsWith('\n')?'':'\n')+line+'\n';
  await writeFile(file,next,{mode:0o600});await chmod(file,0o600);
  res.writeHead(200,{'Content-Type':'text/plain','Cache-Control':'no-store'});res.end('Calendar authorization saved locally. You may close this tab. Booking remains disabled until configuration and verification are complete.');
  console.log('Offline authorization saved in ignored .env.local. No token values were printed.');
 }catch{res.writeHead(400,{'Content-Type':'text/plain'});res.end('Calendar authorization did not complete. No credentials were displayed. Restart the helper and try again.');console.error('Authorization failed; credential values withheld.');}
 finally{clearTimeout(timer);server.close();}
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(39391,'127.0.0.1',resolve);});
const timer=setTimeout(()=>{console.error('Authorization window expired. Restart the helper.');server.close();},10*60*1000);
console.log('Open this owner-only authorization link in your browser. Sign in as the consultation calendar owner:');console.log(url.href);
