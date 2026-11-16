-- Dedicated website booking verification. No Google requests. All synthetic rows
-- and role changes roll back. Run as administrator after the booking migration.
begin;
do $verify$
declare
  t text; visitor text; col text; fn text;
  ca uuid; la uuid; legacy uuid;
  owner_a text := md5(gen_random_uuid()::text)||md5(gen_random_uuid()::text);
  owner_b text := md5(gen_random_uuid()::text)||md5(gen_random_uuid()::text);
  fp text := repeat('f',64); reference uuid := gen_random_uuid();
  calendar text := 'booking-validation-'||gen_random_uuid()::text;
  starts timestamptz := date_trunc('hour',statement_timestamp())+interval '10 days';
  a public.scout_consultation_requests; b public.scout_consultation_requests;
  lease_a uuid := gen_random_uuid(); lease_b uuid := gen_random_uuid(); n integer;
begin
  foreach t in array array['scout_leads','scout_consultation_requests'] loop
    if not exists(select 1 from pg_class where oid=('public.'||t)::regclass and relrowsecurity and relforcerowsecurity) then raise exception 'RLS not forced: %',t; end if;
    if exists(select 1 from pg_policies where schemaname='public' and tablename=t) then raise exception 'Unexpected public booking policies'; end if;
    foreach visitor in array array['anon','authenticated'] loop
      if has_table_privilege(visitor,'public.'||t,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
        or has_any_column_privilege(visitor,'public.'||t,'SELECT,INSERT,UPDATE,REFERENCES') then raise exception 'Visitor grant on %',t; end if;
    end loop;
    if has_table_privilege('service_role','public.'||t,'DELETE,TRUNCATE') then raise exception 'Server can delete history'; end if;
  end loop;
  if has_table_privilege('service_role','public.scout_consultation_requests','UPDATE') then raise exception 'Unexpected table-wide update grant'; end if;
  foreach col in array array['booking_state','calendar_meet_url','booking_lease','booking_lease_until','status','reviewed_at'] loop
    if not has_column_privilege('service_role','public.scout_consultation_requests',col,'UPDATE') then raise exception 'Missing narrow update grant: %',col; end if;
  end loop;
  foreach col in array array['id','lead_id','conversation_id','booking_owner_hash','booking_payload_hash','submission_reference','calendar_id','calendar_event_id','requested_start_at','booking_end_at','timezone','project_summary','booking_buffer_minutes'] loop
    if has_column_privilege('service_role','public.scout_consultation_requests',col,'UPDATE') then raise exception 'Mutable identity/detail grant: %',col; end if;
  end loop;
  foreach fn in array array[
    'public.consultation_reserve(uuid,text,text,text,text,text,timestamptz,timestamptz,text,text,text,integer)',
    'public.consultation_claim(uuid,text,uuid)'
  ] loop
    if exists(select 1 from pg_proc where oid=fn::regprocedure and prosecdef) then raise exception 'Security-definer RPC'; end if;
    if not has_function_privilege('service_role',fn,'EXECUTE') then raise exception 'Missing server RPC access'; end if;
    foreach visitor in array array['anon','authenticated'] loop
      if has_function_privilege(visitor,fn,'EXECUTE') then raise exception 'Public RPC access'; end if;
    end loop;
  end loop;

  -- The original Scout-linked request must retain its administrator-only guard.
  insert into public.scout_conversations(session_token_hash,expires_at) values(md5(gen_random_uuid()::text)||md5(gen_random_uuid()::text),now()+interval '1 day') returning id into ca;
  insert into public.scout_leads(conversation_id,name,email) values(ca,'BOOKING VALIDATION LEGACY','legacy@example.invalid') returning id into la;
  insert into public.scout_consultation_requests(conversation_id,lead_id,submission_reference,project_summary,requested_start_at,timezone)
    values(ca,la,gen_random_uuid(),'BOOKING VALIDATION ONLY',starts,'America/Costa_Rica') returning id into legacy;
  execute 'set local role service_role';
  begin
    update public.scout_consultation_requests set status='confirmed',reviewed_at=statement_timestamp() where id=legacy;
    raise exception 'Legacy administrator review guard bypassed';
  exception when insufficient_privilege then null; end;

  a := public.consultation_reserve(reference,owner_a,fp,'BOOKING VALIDATION','booking@example.invalid','',starts,starts+interval '30 minutes','America/Costa_Rica',calendar,repeat('a',64),15);
  if a.conversation_id is not null or a.booking_state<>'reserved' or a.status<>'pending_confirmation' then raise exception 'Wrong standalone initial state'; end if;
  b := public.consultation_reserve(reference,owner_a,fp,'BOOKING VALIDATION','booking@example.invalid','',starts,starts+interval '30 minutes','America/Costa_Rica',calendar,repeat('a',64),15);
  if a.id<>b.id or a.lead_id<>b.lead_id then raise exception 'Retry created duplicate'; end if;
  select count(*) into n from public.scout_leads where booking_owner_hash=owner_a;
  if n<>1 then raise exception 'Duplicate lead'; end if;
  begin
    perform public.consultation_reserve(reference,owner_b,fp,'BOOKING VALIDATION','booking@example.invalid','',starts,starts+interval '30 minutes','America/Costa_Rica',calendar,repeat('b',64),15);
    raise exception 'Foreign owner replay accepted';
  exception when unique_violation then null; end;
  begin
    perform public.consultation_reserve(reference,owner_a,repeat('e',64),'BOOKING VALIDATION','booking@example.invalid','',starts,starts+interval '30 minutes','America/Costa_Rica',calendar,repeat('b',64),15);
    raise exception 'Changed payload accepted';
  exception when unique_violation then null; end;
  begin
    perform public.consultation_reserve(gen_random_uuid(),owner_b,fp,'BOOKING VALIDATION','booking@example.invalid','',starts+interval '15 minutes',starts+interval '45 minutes','America/Costa_Rica',calendar,repeat('b',64),15);
    raise exception 'Overlapping reservation accepted';
  exception when exclusion_violation then null; end;
  begin
    perform public.consultation_reserve(gen_random_uuid(),owner_b,fp,'BOOKING VALIDATION','booking@example.invalid','',starts+interval '44 minutes',starts+interval '74 minutes','America/Costa_Rica',calendar,repeat('b',64),15);
    raise exception 'Insufficient buffer accepted';
  exception when exclusion_violation then null; end;
  b := public.consultation_reserve(gen_random_uuid(),owner_a,fp,'BOOKING VALIDATION','BOOKING@example.invalid','',starts+interval '45 minutes',starts+interval '75 minutes','America/Costa_Rica',calendar,repeat('b',64),15);
  if b.lead_id<>a.lead_id then raise exception 'Normalized owner-email not deduplicated'; end if;
  if public.consultation_claim(a.id,owner_b,lease_b) then raise exception 'Foreign owner acquired lease'; end if;
  if not public.consultation_claim(a.id,owner_a,lease_a) then raise exception 'Owner could not claim'; end if;
  if public.consultation_claim(a.id,owner_a,lease_b) then raise exception 'Concurrent lease accepted'; end if;
  update public.scout_consultation_requests set booking_lease_until=statement_timestamp()-interval '1 second' where id=a.id;
  if not public.consultation_claim(a.id,owner_a,lease_b) then raise exception 'Expired lease not recoverable'; end if;
  update public.scout_consultation_requests set booking_state='reconciliation_required' where id=a.id and booking_lease=lease_a;
  get diagnostics n=row_count;
  if n<>0 then raise exception 'Stale execution could update reservation'; end if;
  begin
    update public.scout_consultation_requests set booking_state='confirmed',status='confirmed',reviewed_at=statement_timestamp() where id=a.id;
    raise exception 'Confirmation without Meet accepted';
  exception when check_violation then null; end;
  begin
    update public.scout_consultation_requests set booking_state='confirmed',status='confirmed',reviewed_at=statement_timestamp(),calendar_meet_url='https://example.invalid/fake' where id=a.id;
    raise exception 'Non-Meet confirmation accepted';
  exception when check_violation then null; end;
  update public.scout_consultation_requests set booking_state='confirmed',status='confirmed',reviewed_at=statement_timestamp(),calendar_meet_url='https://meet.google.com/abc-defg-hij',booking_lease=null,booking_lease_until=null where id=a.id and booking_owner_hash=owner_a and booking_lease=lease_b;
  get diagnostics n=row_count;
  if n<>1 then raise exception 'Valid server confirmation rejected'; end if;
  if public.consultation_claim(a.id,owner_a,lease_a) then raise exception 'Confirmed booking re-executed'; end if;
  execute 'reset role';

  -- Even an administrator cannot link a website booking to a foreign lead.
  begin
    update public.scout_consultation_requests set lead_id=la where id=a.id;
    raise exception 'Foreign lead ownership accepted';
  exception when check_violation then null; end;

  foreach visitor in array array['anon','authenticated'] loop
    execute format('set local role %I',visitor);
    begin
      perform 1 from public.scout_leads limit 1;
      raise exception 'Visitor read lead details';
    exception when insufficient_privilege then null; end;
    begin
      perform 1 from public.scout_consultation_requests limit 1;
      raise exception 'Visitor read appointment details';
    exception when insufficient_privilege then null; end;
    begin
      perform public.consultation_claim(a.id,owner_a,lease_a);
      raise exception 'Visitor invoked booking RPC';
    exception when insufficient_privilege then null; end;
    execute 'reset role';
  end loop;
end;
$verify$;
rollback;
