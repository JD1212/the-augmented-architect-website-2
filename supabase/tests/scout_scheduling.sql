begin;
do $$
declare b public.scout_consultation_requests; b2 public.scout_consultation_requests; r uuid; o public.scout_scheduling_operations; t timestamptz; i integer; lease uuid:=gen_random_uuid();
begin
 t:=((current_date+7)::text||' 10:00 America/Costa_Rica')::timestamptz;
 while extract(isodow from t at time zone 'America/Costa_Rica')>5 loop t:=t+interval '1 day'; end loop;

 if exists(select 1 from pg_policies where tablename in ('scout_scheduling_state','scout_scheduling_operations')) then raise exception 'Unexpected public policies'; end if;
 if exists(select 1 from pg_class where oid in ('public.scout_scheduling_state'::regclass,'public.scout_scheduling_operations'::regclass) and (not relrowsecurity or not relforcerowsecurity)) then raise exception 'RLS missing'; end if;
 if has_table_privilege('anon','public.scout_scheduling_state','SELECT,INSERT,UPDATE,DELETE') or has_table_privilege('authenticated','public.scout_scheduling_operations','SELECT,INSERT,UPDATE,DELETE') then raise exception 'Public access'; end if;
 execute 'set local role service_role';
 for i in 0..2 loop
  b:=public.consultation_reserve(gen_random_uuid(),repeat('a',64),repeat('b',64),'FIXTURE','fixture@example.invalid','',t+make_interval(mins=>case i when 0 then 0 when 1 then 90 else 210 end),t+make_interval(mins=>case i when 0 then 30 when 1 then 120 else 240 end),'America/Costa_Rica','fixture-calendar',md5(i::text)||md5(i::text),15);
  if i=0 then b2:=b; end if;
 end loop;
 if public.consultation_daily_count((t at time zone 'America/Costa_Rica')::date,'America/Costa_Rica','fixture-calendar')<>3 then raise exception 'Wrong daily count'; end if;
 begin
   perform public.consultation_reserve(gen_random_uuid(),repeat('c',64),repeat('b',64),'FIXTURE','fixture@example.invalid','',t+interval '5 hours',t+interval '5 hours 30 minutes','America/Costa_Rica','fixture-calendar',repeat('c',64),15);
   raise exception 'Fourth booking accepted';
 exception when exclusion_violation then null; end;
 begin
   perform public.consultation_reserve(gen_random_uuid(),repeat('c',64),repeat('b',64),'FIXTURE','fixture@example.invalid','',t+interval '7 days 15 minutes',t+interval '7 days 45 minutes','America/Costa_Rica','fixture-calendar',repeat('d',64),15);
   raise exception 'Invalid fixed time accepted';
 exception when exclusion_violation then null; end;
 update public.scout_consultation_requests set reviewed_at=statement_timestamp(),booking_state='confirmed',status='confirmed',calendar_meet_url='https://meet.google.com/abc-defg-hij' where id=b2.id;
 begin
   perform public.consultation_prepare_management(gen_random_uuid(),repeat('d',64),b2.id,'wrong@example.invalid','cancel',null);
   raise exception 'Wrong email accepted';
 exception when insufficient_privilege then null; end;
 r:=gen_random_uuid();
 o:=public.consultation_prepare_management(r,repeat('a',64),b2.id,'fixture@example.invalid','reschedule',t+interval '7 days');

 -- Use an explicit lease value to avoid PL/pgSQL variable/column ambiguity.
 update public.scout_scheduling_operations set lease='00000000-0000-4000-8000-000000000001' where id=r;
 if not public.consultation_finish_management(r,repeat('a',64),'00000000-0000-4000-8000-000000000001','completed') then raise exception 'Reschedule failed'; end if;
 if not exists(select 1 from public.scout_consultation_requests where id=b2.id and requested_start_at=t+interval '7 days' and booking_state='confirmed') then raise exception 'Wrong reschedule state'; end if;
 begin
   update public.scout_consultation_requests set requested_start_at=t+interval '8 days',booking_end_at=t+interval '8 days 30 minutes' where id=b2.id;
   raise exception 'Direct arbitrary reschedule accepted';
 exception when check_violation then null; end;
 r:=gen_random_uuid();
 o:=public.consultation_prepare_management(r,repeat('a',64),b2.id,'fixture@example.invalid','cancel',null);
 update public.scout_scheduling_operations set lease='00000000-0000-4000-8000-000000000001' where id=r;
 perform public.consultation_finish_management(r,repeat('a',64),'00000000-0000-4000-8000-000000000001','completed');
 if not exists(select 1 from public.scout_consultation_requests where id=b2.id and booking_state='cancelled' and status='cancelled') then raise exception 'Cancellation did not persist'; end if;
end $$;
rollback;
