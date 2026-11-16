// Optional test-only engine; install outside the website dependencies.
const {PGlite}=await import(process.env.BOOKING_PGLITE_MODULE ?? '@electric-sql/pglite');
import fs from 'node:fs';
const db=new PGlite();await db.waitReady;
try{
 await db.exec('create role anon; create role authenticated; create role service_role bypassrls; create role supabase_admin superuser; grant usage on schema public to anon,authenticated,service_role;');
 for(const name of ['20261115003408_scout_foundation.sql','20261115014548_scout_request_limits.sql'])await db.exec(fs.readFileSync('supabase/migrations/'+name,'utf8'));
 await db.exec(fs.readFileSync('supabase/migrations/20261115230214_consultation_booking.sql','utf8'));
 console.log('PASS booking migration parsed and applied on isolated PostgreSQL.');
 await db.exec(fs.readFileSync('supabase/tests/consultation_booking.sql','utf8'));console.log('PASS RLS/grants, legacy guard, idempotency, ownership, buffers, leases, confirmation and rollback assertions.');
 await db.exec(fs.readFileSync('supabase/tests/scout_foundation.sql','utf8'));console.log('PASS existing Scout foundation SQL assertions.');
 await db.exec(fs.readFileSync('supabase/tests/scout_request_limits.sql','utf8'));console.log('PASS existing Scout request-limit SQL assertions.');
 if(process.argv.includes('--scheduling')) {
  await db.exec(fs.readFileSync('supabase/migrations/20261116041634_scout_scheduling.sql','utf8'));
  await db.exec(fs.readFileSync('supabase/tests/scout_scheduling.sql','utf8'));
  console.log('PASS scheduling RLS, fixed windows, daily cap, ownership, immutable reservation guard, reschedule and cancellation assertions.');
 }
 const {rows}=await db.query('select (select count(*) from public.scout_conversations) conversations,(select count(*) from public.scout_leads) leads,(select count(*) from public.scout_consultation_requests) requests');
 if(Object.values(rows[0]).some(n=>Number(n)!==0))throw Error('Verification fixtures did not roll back');console.log('PASS no synthetic records remain.');
}catch(e){console.error(JSON.stringify({code:e.code??null,message:e.message,detail:e.detail??null}));process.exitCode=1;}finally{await db.close();}
