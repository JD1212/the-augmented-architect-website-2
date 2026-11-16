-- Promoted to 20261115230214_consultation_booking.sql and applied only to cjldcaiybqguklzqtdjj.
-- Reference copy only: do not apply again. Authentication proposal remains separate.
begin;

-- Website bookings do not create or alter Scout conversations.
alter table public.scout_leads alter column conversation_id drop not null;
alter table public.scout_leads add column booking_owner_hash text
  check (booking_owner_hash is null or booking_owner_hash ~ '^[0-9a-f]{64}$');
create unique index scout_website_lead_owner_email
  on public.scout_leads (booking_owner_hash, lower(email)) where conversation_id is null;
alter table public.scout_leads add constraint scout_website_lead_owner_required
  check (conversation_id is not null or booking_owner_hash is not null);

alter table public.scout_consultation_requests alter column conversation_id drop not null;
alter table public.scout_consultation_requests
  add column booking_owner_hash text,
  add column booking_payload_hash text,
  add column booking_state text,
  add column booking_end_at timestamptz,
  add column booking_buffer_minutes integer,
  add column calendar_id text,
  add column calendar_event_id text,
  add column calendar_meet_url text,
  add column booking_lease uuid,
  add column booking_lease_until timestamptz,
  add constraint scout_website_booking_lead foreign key (lead_id) references public.scout_leads(id),
  add constraint scout_website_booking_fields check ((
    (booking_owner_hash is null and conversation_id is not null and booking_state is null)
    or (booking_owner_hash ~ '^[0-9a-f]{64}$' and booking_payload_hash ~ '^[0-9a-f]{64}$'
      and conversation_id is null and calendar_id is not null and calendar_event_id ~ '^[0-9a-f]{64}$'
      and booking_state in ('reserved','reconciliation_required','confirmed','failed','cancelled')
      and booking_end_at = requested_start_at + interval '30 minutes'
      and booking_buffer_minutes between 0 and 120)
  ) is true),
  add constraint scout_website_booking_confirmation check ((
    booking_owner_hash is null or
    ((booking_state = 'confirmed') = (status = 'confirmed') and
      (booking_state <> 'confirmed' or calendar_meet_url ~ '^https://meet[.]google[.]com/[a-z0-9-]+$'))
  ) is true);
create unique index scout_website_booking_event on public.scout_consultation_requests(calendar_id,calendar_event_id)
  where booking_owner_hash is not null;
create index scout_website_booking_window on public.scout_consultation_requests(calendar_id,requested_start_at,booking_end_at)
  where booking_state in ('reserved','reconciliation_required','confirmed');

-- Preserve the existing guard for conversation-linked requests. The server may
-- transition only website-owned reservations; visitors still have no grants.
create or replace function scout_private.validate_consultation_request()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone
    and (name = 'UTC' or (position('/' in name) > 0 and name not like 'posix/%' and name not like 'right/%'))) then
    raise exception 'An explicit IANA timezone is required' using errcode = '23514';
  end if;
  if tg_op = 'INSERT' and new.status <> 'pending_confirmation' then
    raise exception 'New requests must be pending' using errcode = '23514';
  end if;
  if new.booking_owner_hash is null then
    if tg_op = 'UPDATE' and (new.status is distinct from old.status or new.reviewed_at is distinct from old.reviewed_at)
      and current_user not in ('postgres','supabase_admin') then
      raise exception 'Consultation review requires an administrator' using errcode = '42501';
    end if;
  else
    if current_user not in ('service_role','postgres','supabase_admin') then
      raise exception 'Website bookings are server-only' using errcode = '42501';
    end if;
    if not exists (select 1 from public.scout_leads l where l.id = new.lead_id
      and l.conversation_id is null and l.booking_owner_hash = new.booking_owner_hash) then
      raise exception 'Booking lead ownership mismatch' using errcode = '23514';
    end if;
    if tg_op = 'UPDATE' and row(new.id,new.submission_reference,new.booking_owner_hash,new.booking_payload_hash,new.lead_id,
      new.requested_start_at,new.booking_end_at,new.calendar_id,new.calendar_event_id,new.timezone,new.project_summary)
      is distinct from row(old.id,old.submission_reference,old.booking_owner_hash,old.booking_payload_hash,old.lead_id,
      old.requested_start_at,old.booking_end_at,old.calendar_id,old.calendar_event_id,old.timezone,old.project_summary) then
      raise exception 'Reservation ownership and details are immutable' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

-- A calendar-scoped transaction lock serializes this website's reservations.
-- Existing Google events are checked again by the server before events.insert.
create function public.consultation_reserve(
  p_reference uuid,p_owner text,p_fingerprint text,p_name text,p_email text,p_summary text,
  p_start timestamptz,p_end timestamptz,p_timezone text,p_calendar text,p_event text,p_buffer integer
) returns public.scout_consultation_requests
language plpgsql security invoker set search_path = '' as $$
declare r public.scout_consultation_requests; selected_lead uuid;
begin
  if p_owner !~ '^[0-9a-f]{64}$' or p_fingerprint !~ '^[0-9a-f]{64}$' or p_start <= statement_timestamp()
    or p_end <> p_start + interval '30 minutes' or p_buffer not between 0 and 120 then
    raise exception 'Invalid reservation' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('website-consultation:' || p_calendar,0));
  select * into r from public.scout_consultation_requests where submission_reference = p_reference;
  if found then
    if r.booking_owner_hash is distinct from p_owner or r.booking_payload_hash is distinct from p_fingerprint then
      raise exception 'Reservation reference conflict' using errcode = '23505';
    end if;
    return r;
  end if;
  if exists (select 1 from public.scout_consultation_requests b where b.calendar_id = p_calendar
    and b.booking_state in ('reserved','reconciliation_required','confirmed')
    and b.requested_start_at < p_end + make_interval(mins => greatest(p_buffer,b.booking_buffer_minutes))
    and b.booking_end_at > p_start - make_interval(mins => greatest(p_buffer,b.booking_buffer_minutes))) then
    raise exception 'Appointment conflict' using errcode = '23P01';
  end if;
  insert into public.scout_leads(conversation_id,booking_owner_hash,name,email)
    values(null,p_owner,p_name,lower(p_email))
    on conflict (booking_owner_hash,lower(email)) where conversation_id is null do nothing;
  select id into strict selected_lead from public.scout_leads
    where conversation_id is null and booking_owner_hash = p_owner and lower(email) = lower(p_email);
  insert into public.scout_consultation_requests(conversation_id,lead_id,submission_reference,project_summary,
    requested_start_at,timezone,booking_owner_hash,booking_payload_hash,booking_state,booking_end_at,
    booking_buffer_minutes,calendar_id,calendar_event_id)
    values(null,selected_lead,p_reference,coalesce(nullif(btrim(p_summary),''),'No project description supplied.'),
      p_start,p_timezone,p_owner,p_fingerprint,'reserved',p_end,p_buffer,p_calendar,p_event) returning * into r;
  return r;
end;
$$;
create function public.consultation_claim(p_id uuid,p_owner text,p_lease uuid)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare claimed uuid;
begin
  update public.scout_consultation_requests set booking_lease = p_lease,booking_lease_until = statement_timestamp() + interval '90 seconds'
    where id = p_id and booking_owner_hash = p_owner and booking_state in ('reserved','reconciliation_required')
      and (booking_lease_until is null or booking_lease_until < statement_timestamp()) returning id into claimed;
  return claimed is not null;
end;
$$;

-- RLS remains forced, with no anon/authenticated policies or grants.
revoke all on function public.consultation_reserve(uuid,text,text,text,text,text,timestamptz,timestamptz,text,text,text,integer),
  public.consultation_claim(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.consultation_reserve(uuid,text,text,text,text,text,timestamptz,timestamptz,text,text,text,integer),
  public.consultation_claim(uuid,text,uuid) to service_role;
grant update (booking_state,calendar_meet_url,booking_lease,booking_lease_until,status,reviewed_at)
  on public.scout_consultation_requests to service_role;
comment on table public.scout_consultation_requests is
  'Legacy conversation requests and isolated website calendar reservations. Only persisted confirmed calendar events with Meet links may be reported as booked. Uncertain outcomes retain their slot until reconciliation.';
commit;
