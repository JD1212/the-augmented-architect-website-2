-- Scheduling Phase 2 only. Pending local validation and Gmail authorization.
-- Dedicated Website 2.0 database; unrelated authentication proposal is excluded.
create table public.scout_scheduling_state (
  key text primary key check(length(key) between 1 and 200),
  owner_hash text not null check(owner_hash ~ '^[0-9a-f]{64}$'),
  kind text not null check(kind in ('proposal','verification','identity','rate')),
  payload jsonb not null check(jsonb_typeof(payload)='object'),
  version integer not null default 0,
  expires_at timestamptz not null
);
alter table public.scout_scheduling_state enable row level security;
alter table public.scout_scheduling_state force row level security;
revoke all on public.scout_scheduling_state from public, anon, authenticated;
grant select,insert,update,delete on public.scout_scheduling_state to service_role;
create index scout_scheduling_state_owner on public.scout_scheduling_state(owner_hash,kind,expires_at);

create table public.scout_scheduling_operations (
  id uuid primary key, owner_hash text not null check(owner_hash ~ '^[0-9a-f]{64}$'),
  booking_id uuid not null references public.scout_consultation_requests(id),
  calendar_id text not null, kind text not null check(kind in ('cancel','reschedule')),
  target_start timestamptz, state text not null default 'prepared' check(state in ('prepared','pending','completed','failed')),
  lease uuid, lease_until timestamptz,
  check((kind='reschedule')=(target_start is not null))
);
alter table public.scout_scheduling_operations enable row level security;
alter table public.scout_scheduling_operations force row level security;
revoke all on public.scout_scheduling_operations from public,anon,authenticated;
grant select,insert,update on public.scout_scheduling_operations to service_role;
create unique index scout_scheduling_one_operation on public.scout_scheduling_operations(booking_id) where state in ('prepared','pending');

create function public.consultation_daily_count(p_date date,p_timezone text,p_calendar text)
returns integer language sql stable security invoker set search_path='' as $$
  select (select count(*) from public.scout_consultation_requests b where b.calendar_id=p_calendar
    and b.booking_state in ('confirmed','reserved','reconciliation_required')
    and (b.requested_start_at at time zone p_timezone)::date=p_date)
    + (select count(*) from public.scout_scheduling_operations o join public.scout_consultation_requests b on b.id=o.booking_id
      where o.calendar_id=p_calendar and o.kind='reschedule' and o.state in ('prepared','pending')
      and (o.target_start at time zone p_timezone)::date=p_date
      and (b.requested_start_at at time zone p_timezone)::date<>p_date);
$$;
create or replace function public.consultation_reserve(
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
  if (p_start at time zone 'America/Costa_Rica')::time not in ('10:00'::time,'11:30'::time,'13:30'::time,'15:00'::time)
    or extract(isodow from p_start at time zone 'America/Costa_Rica') not between 1 and 5 then
    raise exception 'Invalid consultation window' using errcode = '23P01';
  end if;
  if public.consultation_daily_count((p_start at time zone 'America/Costa_Rica')::date,'America/Costa_Rica',p_calendar) >= 3 then
    raise exception 'Consultation day is full' using errcode = '23P01';
  end if;
  if exists(select 1 from public.scout_scheduling_operations o where o.calendar_id=p_calendar
    and o.state in ('prepared','pending') and o.kind='reschedule'
    and o.target_start < p_end + interval '15 minutes' and o.target_start + interval '45 minutes' > p_start) then
    raise exception 'Appointment is reserved' using errcode = '23P01';
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

create function public.consultation_prepare_management(p_id uuid,p_owner text,p_booking uuid,p_email text,p_kind text,p_start timestamptz)
returns public.scout_scheduling_operations language plpgsql security invoker set search_path='' as $$
declare b public.scout_consultation_requests; o public.scout_scheduling_operations;
begin
  select * into b from public.scout_consultation_requests where id=p_booking;
  if not found then raise exception 'Appointment unavailable' using errcode='42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('website-consultation:'||b.calendar_id,0));
  select * into o from public.scout_scheduling_operations where id=p_id;
  if found then
    if o.owner_hash<>p_owner or o.booking_id<>p_booking or o.kind<>p_kind or o.target_start is distinct from p_start then
      raise exception 'Operation mismatch' using errcode='42501';
    end if;
    return o;
  end if;
  if b.booking_state<>'confirmed' or b.requested_start_at<=statement_timestamp() or not exists(
    select 1 from public.scout_leads l where l.id=b.lead_id and lower(l.email)=lower(p_email)) then
    raise exception 'Appointment unavailable' using errcode='42501';
  end if;
  if p_kind='reschedule' then
    if p_start<statement_timestamp()+interval '2 hours' or p_start>statement_timestamp()+interval '30 days'
      or (p_start at time zone 'America/Costa_Rica')::time not in ('10:00'::time,'11:30'::time,'13:30'::time,'15:00'::time)
      or extract(isodow from p_start at time zone 'America/Costa_Rica') not between 1 and 5 then
      raise exception 'Invalid window' using errcode='23P01';
    end if;
    if (b.requested_start_at at time zone 'America/Costa_Rica')::date<>(p_start at time zone 'America/Costa_Rica')::date
      and public.consultation_daily_count((p_start at time zone 'America/Costa_Rica')::date,'America/Costa_Rica',b.calendar_id)>=3 then
      raise exception 'Consultation day is full' using errcode='23P01';
    end if;
    if exists(select 1 from public.scout_consultation_requests r where r.id<>b.id and r.calendar_id=b.calendar_id
      and r.booking_state in ('confirmed','reserved','reconciliation_required')
      and r.requested_start_at<p_start+interval '45 minutes' and r.booking_end_at>p_start-interval '15 minutes')
      or exists(select 1 from public.scout_scheduling_operations r where r.calendar_id=b.calendar_id and r.state in ('prepared','pending')
        and r.kind='reschedule' and r.target_start<p_start+interval '45 minutes' and r.target_start+interval '45 minutes'>p_start) then
      raise exception 'Appointment conflict' using errcode='23P01';
    end if;
  end if;
  insert into public.scout_scheduling_operations(id,owner_hash,booking_id,calendar_id,kind,target_start)
    values(p_id,p_owner,p_booking,b.calendar_id,p_kind,p_start) returning * into o;
  return o;
end;
$$;

create function public.consultation_finish_management(p_id uuid,p_owner text,p_lease uuid,p_state text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare o public.scout_scheduling_operations;
begin
  select * into o from public.scout_scheduling_operations where id=p_id and owner_hash=p_owner for update;
  if not found or o.lease is distinct from p_lease or p_state not in ('pending','completed','failed') then return false; end if;
  if p_state='completed' then
    if o.kind='cancel' then
      update public.scout_consultation_requests set booking_state='cancelled',status='cancelled',reviewed_at=statement_timestamp() where id=o.booking_id;
    else
      update public.scout_consultation_requests set requested_start_at=o.target_start,booking_end_at=o.target_start+interval '30 minutes',reviewed_at=statement_timestamp() where id=o.booking_id;
    end if;
  end if;
  update public.scout_scheduling_operations set state=p_state,lease=null,lease_until=null where id=o.id;
  return true;
end;
$$;
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
      if not (row(new.id,new.submission_reference,new.booking_owner_hash,new.booking_payload_hash,new.lead_id,new.calendar_id,new.calendar_event_id,new.timezone,new.project_summary)
        is not distinct from row(old.id,old.submission_reference,old.booking_owner_hash,old.booking_payload_hash,old.lead_id,old.calendar_id,old.calendar_event_id,old.timezone,old.project_summary)
        and exists(select 1 from public.scout_scheduling_operations o where o.booking_id=old.id and o.kind='reschedule'
          and o.state in ('prepared','pending') and o.lease is not null and o.target_start=new.requested_start_at
          and new.booking_end_at=new.requested_start_at+interval '30 minutes')) then
      raise exception 'Reservation ownership and details are immutable' using errcode = '23514';
      end if;
    end if;
  end if;
  return new;
end;
$$;


grant update(requested_start_at,booking_end_at) on public.scout_consultation_requests to service_role;
revoke all on function public.consultation_daily_count(date,text,text),public.consultation_prepare_management(uuid,text,uuid,text,text,timestamptz),public.consultation_finish_management(uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function public.consultation_daily_count(date,text,text),public.consultation_prepare_management(uuid,text,uuid,text,text,timestamptz),public.consultation_finish_management(uuid,text,uuid,text) to service_role;
