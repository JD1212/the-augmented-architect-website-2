-- Scout Phase 0. Apply only to the dedicated Website 2.0 project.
-- Visitors never access these tables directly. The future backend must verify
-- the session token and scope every operation to its conversation ownership.
create table public.scout_conversations (
  id uuid primary key default gen_random_uuid(),
  session_token_hash text not null unique
    check (session_token_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'active'
    check (status in ('active', 'closed', 'expired')),
  created_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  expires_at timestamptz not null,
  check (last_activity_at >= created_at),
  check (expires_at > created_at)
);
create index scout_conversations_expires_at_idx on public.scout_conversations (expires_at);
comment on column public.scout_conversations.session_token_hash is
  'SHA-256 digest of a high-entropy server-issued session token. Never store the raw token. Backend must verify ownership and expiration before every operation.';

create table public.scout_conversation_turns (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.scout_conversations (id) on delete cascade,
  turn_number integer not null check (turn_number > 0),
  client_turn_id uuid not null,
  user_message text not null check (char_length(btrim(user_message)) between 1 and 20000),
  assistant_message text check (char_length(assistant_message) <= 40000),
  agent_state jsonb not null default '{}'::jsonb check (jsonb_typeof(agent_state) = 'object'),
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  model text,
  model_usage jsonb check (jsonb_typeof(model_usage) = 'object'),
  diagnostic_metadata jsonb check (jsonb_typeof(diagnostic_metadata) = 'object'),
  unique (conversation_id, turn_number),
  unique (conversation_id, client_turn_id),
  check (started_at is null or started_at >= created_at),
  check (completed_at is null or completed_at >= coalesce(started_at, created_at)),
  check ((status in ('completed', 'failed')) = (completed_at is not null)),
  check (status <> 'running' or started_at is not null),
  check (status <> 'completed' or (started_at is not null and assistant_message is not null))
);
comment on table public.scout_conversation_turns is
  'One ordered user/assistant exchange per turn; retry protection is scoped to the owning conversation. Do not store secrets in agent state or diagnostics.';

create table public.scout_leads (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.scout_conversations (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 200),
  email text not null check (char_length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  created_at timestamptz not null default now(),
  unique (id, conversation_id)
);
create index scout_leads_conversation_id_idx on public.scout_leads (conversation_id);

create table public.scout_consultation_requests (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.scout_conversations (id) on delete cascade,
  lead_id uuid not null,
  submission_reference uuid not null unique,
  project_summary text not null check (char_length(btrim(project_summary)) between 1 and 4000),
  service_interest text check (char_length(btrim(service_interest)) between 1 and 200),
  requested_start_at timestamptz not null,
  timezone text not null,
  status text not null default 'pending_confirmation'
    check (status in ('pending_confirmation', 'confirmed', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  foreign key (lead_id, conversation_id) references public.scout_leads (id, conversation_id) on delete cascade,
  check (reviewed_at is null or reviewed_at >= created_at),
  check ((status = 'pending_confirmation') = (reviewed_at is null))
);
create index scout_consultation_requests_conversation_id_idx on public.scout_consultation_requests (conversation_id);
create index scout_consultation_requests_lead_conversation_idx on public.scout_consultation_requests (lead_id, conversation_id);
comment on table public.scout_consultation_requests is
  'Requests only: no appointment guarantee, calendar event, or automatic confirmation. A lead must belong to the same conversation.';

-- Keep trigger code outside exposed schemas. No SECURITY DEFINER or public RPC.
create schema scout_private;
revoke all on schema scout_private from public, anon, authenticated, service_role;
create function scout_private.validate_consultation_request()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1 from pg_catalog.pg_timezone_names
    where name = new.timezone
      and (name = 'UTC' or (position('/' in name) > 0 and name not like 'posix/%' and name not like 'right/%'))
  ) then
    raise exception 'An explicit IANA timezone is required' using errcode = '23514';
  end if;
  if tg_op = 'INSERT' and new.status <> 'pending_confirmation' then
    raise exception 'New consultation requests must be pending_confirmation' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and (new.status is distinct from old.status or new.reviewed_at is distinct from old.reviewed_at)
    and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'Consultation review requires a database administrator' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function scout_private.validate_consultation_request() from public, anon, authenticated, service_role;
create trigger scout_consultation_request_guard
  before insert or update on public.scout_consultation_requests
  for each row execute function scout_private.validate_consultation_request();

alter table public.scout_conversations enable row level security;
alter table public.scout_conversations force row level security;
alter table public.scout_conversation_turns enable row level security;
alter table public.scout_conversation_turns force row level security;
alter table public.scout_leads enable row level security;
alter table public.scout_leads force row level security;
alter table public.scout_consultation_requests enable row level security;
alter table public.scout_consultation_requests force row level security;

-- No visitor policies: fail closed even if a future grant is accidentally added.
revoke all on table public.scout_conversations, public.scout_conversation_turns,
  public.scout_leads, public.scout_consultation_requests from public, anon, authenticated, service_role;
grant select, insert, update on table public.scout_conversations, public.scout_conversation_turns to service_role;
grant select, insert on table public.scout_leads, public.scout_consultation_requests to service_role;
-- No server DELETE, TRUNCATE, REFERENCES, TRIGGER, or consultation-review grant.
