-- Dedicated website database only. All fixtures are rolled back, including Auth records.
begin;
insert into auth.users(id,aud,role,email,email_confirmed_at,created_at,updated_at)
values('a7777777-7777-4777-8777-777777777777','authenticated','authenticated','marketing-rls@example.invalid',now(),now(),now());
insert into auth.sessions(id,user_id,created_at,updated_at,aal,not_after)
values('f7777777-7777-4777-8777-777777777777','a7777777-7777-4777-8777-777777777777',now(),now(),'aal2',now()+interval '1 hour');
insert into public.marketing_memberships(tenant_id,user_id) values('b329164a-f981-4acc-befc-2f0c70f8af10','a7777777-7777-4777-8777-777777777777');
insert into public.marketing_tenants(id,name) values('b7777777-7777-4777-8777-777777777777','RLS test, rolled back');
insert into public.marketing_reports(tenant_id,source,property_id,start_date,end_date,payload)
values('b329164a-f981-4acc-befc-2f0c70f8af10','ga4','rls-fixture','2026-11-10','2026-11-16','{}'),
('b7777777-7777-4777-8777-777777777777','ga4','rls-fixture','2026-11-10','2026-11-16','{}');
set local role anon;
do $$ begin
  begin perform * from public.marketing_reports; raise exception 'FAIL: anonymous read'; exception when insufficient_privilege then null; end;
  begin perform public.marketing_authorized('b329164a-f981-4acc-befc-2f0c70f8af10'); raise exception 'FAIL: anonymous RPC'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"b7777777-7777-4777-8777-777777777777","aal":"aal2","session_id":"f7777777-7777-4777-8777-777777777777","role":"authenticated"}',true);
set local role authenticated;
do $$ begin if exists(select 1 from public.marketing_reports) then raise exception 'FAIL: non-owner AAL2 read'; end if; end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"a7777777-7777-4777-8777-777777777777","aal":"aal1","session_id":"f7777777-7777-4777-8777-777777777777","role":"authenticated"}',true);
set local role authenticated;
do $$ begin if exists(select 1 from public.marketing_reports) then raise exception 'FAIL: AAL1 read'; end if; end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"a7777777-7777-4777-8777-777777777777","aal":"aal2","session_id":"f7777777-7777-4777-8777-777777777777","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  if (select count(*) from public.marketing_reports where property_id='rls-fixture')<>1 then raise exception 'FAIL: tenant isolation'; end if;
  if not public.marketing_authorized('b329164a-f981-4acc-befc-2f0c70f8af10') then raise exception 'FAIL: MFA owner denied'; end if;
  begin
    insert into public.marketing_memberships(tenant_id,user_id) values('b7777777-7777-4777-8777-777777777777','a7777777-7777-4777-8777-777777777777');
    raise exception 'FAIL: self authorization'; exception when insufficient_privilege then null;
  end;
  begin
    insert into public.marketing_reports(tenant_id,source,property_id,start_date,end_date,payload) values('b7777777-7777-4777-8777-777777777777','ga4','bad','2026-11-10','2026-11-16','{}');
    raise exception 'FAIL: cross tenant insert'; exception when insufficient_privilege then null;
  end;
  begin
    update public.marketing_reports set payload='{}'; raise exception 'FAIL: report mutation'; exception when insufficient_privilege then null;
  end;
  begin
    insert into public.marketing_agents(tenant_id,name,version,instructions_version) values('b329164a-f981-4acc-befc-2f0c70f8af10','bad','1','1');
    raise exception 'FAIL: agent write'; exception when insufficient_privilege then null;
  end;
end $$;
reset role;
update public.marketing_memberships set active=false where user_id='a7777777-7777-4777-8777-777777777777';
set local role authenticated;
do $$ begin if exists(select 1 from public.marketing_reports) then raise exception 'FAIL: inactive owner'; end if; end $$;
reset role;
update public.marketing_memberships set active=true where user_id='a7777777-7777-4777-8777-777777777777';
delete from auth.sessions where id='f7777777-7777-4777-8777-777777777777';
set local role authenticated;
do $$ begin if exists(select 1 from public.marketing_reports) then raise exception 'FAIL: revoked session'; end if; end $$;
reset role;
rollback;
select 'PASS: anonymous access, non-owner AAL2, owner AAL1, tenant isolation, owner+MFA access, self-authorization, cross-tenant insertion, snapshot mutation, agent writes, inactive membership, revoked session. All fixtures rolled back.' as verification;
