-- Run only against the dedicated Scout project, as a database administrator.
-- All synthetic records and temporary privilege grants roll back together.
begin;

do $$
declare
  table_name text;
  visitor_role text;
  privilege_name text;
begin
  foreach table_name in array array['scout_conversations', 'scout_conversation_turns', 'scout_leads', 'scout_consultation_requests'] loop
    if not exists (
      select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = table_name and c.relrowsecurity and c.relforcerowsecurity
    ) then raise exception 'RLS missing on %', table_name; end if;
    if exists (select 1 from pg_policies where schemaname = 'public' and tablename = table_name) then
      raise exception 'Unexpected visitor policy on %', table_name;
    end if;
    foreach visitor_role in array array['anon', 'authenticated'] loop
      foreach privilege_name in array array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] loop
        if has_table_privilege(visitor_role, 'public.' || table_name, privilege_name) then
          raise exception 'Unexpected % grant for % on %', privilege_name, visitor_role, table_name;
        end if;
      end loop;
    end loop;
    if has_table_privilege('service_role', 'public.' || table_name, 'DELETE')
      or has_table_privilege('service_role', 'public.' || table_name, 'TRUNCATE') then
      raise exception 'Excessive server grant on %', table_name;
    end if;
  end loop;
  if has_table_privilege('service_role', 'public.scout_consultation_requests', 'UPDATE') then
    raise exception 'Server must not review consultation requests';
  end if;
  if has_schema_privilege('anon', 'scout_private', 'USAGE')
    or has_schema_privilege('authenticated', 'scout_private', 'USAGE')
    or has_function_privilege('anon', 'scout_private.validate_consultation_request()', 'EXECUTE')
    or has_function_privilege('authenticated', 'scout_private.validate_consultation_request()', 'EXECUTE') then
    raise exception 'Trigger implementation exposed to visitors';
  end if;
end;
$$;

do $$
declare
  conversation_a uuid;
  conversation_b uuid;
  lead_a uuid;
  turn_id uuid := gen_random_uuid();
  submission_id uuid := gen_random_uuid();
  request_id uuid;
begin
  insert into public.scout_conversations (session_token_hash, expires_at)
    values (replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), now() + interval '1 hour') returning id into conversation_a;
  insert into public.scout_conversations (session_token_hash, expires_at)
    values (replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), now() + interval '1 hour') returning id into conversation_b;
  insert into public.scout_leads (conversation_id, name, email)
    values (conversation_a, 'Synthetic Phase 0 Test', 'scout-phase0@example.invalid') returning id into lead_a;
  insert into public.scout_conversation_turns (conversation_id, turn_number, client_turn_id, user_message)
    values (conversation_a, 1, turn_id, 'Synthetic test message');

  begin
    insert into public.scout_conversation_turns (conversation_id, turn_number, client_turn_id, user_message)
      values (conversation_a, 2, turn_id, 'Synthetic duplicate retry');
    raise exception 'Duplicate client turn accepted';
  exception when unique_violation then null; end;
  begin
    insert into public.scout_conversation_turns (conversation_id, turn_number, client_turn_id, user_message)
      values (conversation_a, 1, gen_random_uuid(), 'Synthetic duplicate order');
    raise exception 'Duplicate turn order accepted';
  exception when unique_violation then null; end;
  -- The same client key is harmless in a different, independently owned conversation.
  insert into public.scout_conversation_turns (conversation_id, turn_number, client_turn_id, user_message)
    values (conversation_b, 1, turn_id, 'Synthetic independent turn');
  begin
    insert into public.scout_conversations (session_token_hash, expires_at) values ('raw-token-not-a-hash', now() + interval '1 hour');
    raise exception 'Raw session token accepted';
  exception when check_violation then null; end;
  begin
    insert into public.scout_conversations (session_token_hash, expires_at)
      select session_token_hash, expires_at from public.scout_conversations where id = conversation_a;
    raise exception 'Duplicate session ownership accepted';
  exception when unique_violation then null; end;
  begin
    insert into public.scout_conversations (session_token_hash, expires_at)
      values (replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), now() - interval '1 hour');
    raise exception 'Invalid expiration accepted';
  exception when check_violation then null; end;
  begin
    insert into public.scout_conversation_turns (conversation_id, turn_number, client_turn_id, user_message)
      values (gen_random_uuid(), 1, gen_random_uuid(), 'Synthetic orphan');
    raise exception 'Orphan turn accepted';
  exception when foreign_key_violation then null; end;
  begin
    update public.scout_conversation_turns set status = 'completed' where conversation_id = conversation_a;
    raise exception 'Completed turn without execution timestamps accepted';
  exception when check_violation then null; end;
  update public.scout_conversation_turns set status = 'completed', started_at = now(), completed_at = now(), assistant_message = 'Synthetic response', model_usage = '{"input_tokens":1,"output_tokens":1}'
    where conversation_id = conversation_a;

  insert into public.scout_consultation_requests (conversation_id, lead_id, submission_reference, project_summary, requested_start_at, timezone)
    values (conversation_a, lead_a, submission_id, 'Synthetic test request', now() + interval '1 day', 'America/New_York') returning id into request_id;
  if (select status from public.scout_consultation_requests where id = request_id) <> 'pending_confirmation' then
    raise exception 'Request did not default to pending_confirmation';
  end if;
  begin
    insert into public.scout_consultation_requests (conversation_id, lead_id, submission_reference, project_summary, requested_start_at, timezone)
      values (conversation_a, lead_a, submission_id, 'Synthetic duplicate', now() + interval '1 day', 'UTC');
    raise exception 'Duplicate consultation accepted';
  exception when unique_violation then null; end;
  begin
    insert into public.scout_consultation_requests (conversation_id, lead_id, submission_reference, project_summary, requested_start_at, timezone)
      values (conversation_b, lead_a, gen_random_uuid(), 'Synthetic ownership mismatch', now() + interval '1 day', 'UTC');
    raise exception 'Cross-conversation lead accepted';
  exception when foreign_key_violation then null; end;
  begin
    insert into public.scout_consultation_requests (conversation_id, lead_id, submission_reference, project_summary, requested_start_at, timezone)
      values (conversation_a, lead_a, gen_random_uuid(), 'Synthetic invalid timezone', now() + interval '1 day', 'EST');
    raise exception 'Ambiguous timezone abbreviation accepted';
  exception when check_violation then null; end;
  begin
    insert into public.scout_consultation_requests (conversation_id, lead_id, submission_reference, project_summary, requested_start_at, timezone, status, reviewed_at)
      values (conversation_a, lead_a, gen_random_uuid(), 'Synthetic premature confirmation', now() + interval '1 day', 'UTC', 'confirmed', now());
    raise exception 'New request created as confirmed';
  exception when check_violation then null; end;
  -- Future reviews can be performed by the database administrator, not the runtime role.
  update public.scout_consultation_requests set status = 'confirmed', reviewed_at = now() where id = request_id;
end;
$$;

set local role service_role;
do $$
declare
  conversation_id uuid;
  lead_id uuid;
  table_name text;
begin
  insert into public.scout_conversations (session_token_hash, expires_at)
    values (replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), now() + interval '1 hour') returning id into conversation_id;
  insert into public.scout_conversation_turns (conversation_id, turn_number, client_turn_id, user_message)
    values (conversation_id, 1, gen_random_uuid(), 'Synthetic server turn');
  insert into public.scout_leads (conversation_id, name, email)
    values (conversation_id, 'Synthetic Server Test', 'server-phase0@example.invalid') returning id into lead_id;
  insert into public.scout_consultation_requests (conversation_id, lead_id, submission_reference, project_summary, requested_start_at, timezone)
    values (conversation_id, lead_id, gen_random_uuid(), 'Synthetic server request', now() + interval '1 day', 'America/New_York');
  begin
    update public.scout_consultation_requests set status = 'confirmed', reviewed_at = now();
    raise exception 'Runtime can confirm consultations';
  exception when insufficient_privilege then null; end;
  foreach table_name in array array['scout_conversations', 'scout_conversation_turns', 'scout_leads', 'scout_consultation_requests'] loop
    begin
      execute format('delete from public.%I', table_name);
      raise exception 'Runtime can delete records';
    exception when insufficient_privilege then null; end;
  end loop;
end;
$$;
reset role;

set local role anon;
do $$
declare table_name text;
begin
  foreach table_name in array array['scout_conversations', 'scout_conversation_turns', 'scout_leads', 'scout_consultation_requests'] loop
    begin
      execute format('select * from public.%I', table_name);
      raise exception 'Anonymous visitor can read records';
    exception when insufficient_privilege then null; end;
  end loop;
end;
$$;
reset role;

set local role authenticated;
do $$
declare table_name text;
begin
  foreach table_name in array array['scout_conversations', 'scout_conversation_turns', 'scout_leads', 'scout_consultation_requests'] loop
    begin
      execute format('select * from public.%I', table_name);
      raise exception 'Authenticated visitor can read records';
    exception when insufficient_privilege then null; end;
  end loop;
end;
$$;
reset role;

-- Defense in depth: even an accidental SELECT grant must reveal no rows.
-- Other sessions cannot observe these uncommitted grants; ROLLBACK removes them.
grant select on public.scout_conversations, public.scout_conversation_turns, public.scout_leads, public.scout_consultation_requests to anon, authenticated;
set local role anon;
do $$
declare table_name text; row_count bigint;
begin
  foreach table_name in array array['scout_conversations', 'scout_conversation_turns', 'scout_leads', 'scout_consultation_requests'] loop
    execute format('select count(*) from public.%I', table_name) into row_count;
    if row_count <> 0 then raise exception 'RLS leaked rows to anon'; end if;
  end loop;
end;
$$;
reset role;
set local role authenticated;
do $$
declare table_name text; row_count bigint;
begin
  foreach table_name in array array['scout_conversations', 'scout_conversation_turns', 'scout_leads', 'scout_consultation_requests'] loop
    execute format('select count(*) from public.%I', table_name) into row_count;
    if row_count <> 0 then raise exception 'RLS leaked rows to authenticated'; end if;
  end loop;
end;
$$;
reset role;
rollback;
select 'Scout schema, constraints, server permissions, visitor denial, and RLS checks passed; synthetic records and temporary grants rolled back.' as verification;
