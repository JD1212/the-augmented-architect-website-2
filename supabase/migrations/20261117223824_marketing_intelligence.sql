-- Isolated marketing records. Existing Scout tables, policies and functions are unchanged.
begin;
create schema if not exists private;
create table public.marketing_tenants (
  id uuid primary key default gen_random_uuid(), name text not null,
  created_at timestamptz not null default now()
);
create table public.marketing_memberships (
  tenant_id uuid not null references public.marketing_tenants(id),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role = 'owner'), active boolean not null default true,
  created_at timestamptz not null default now(), primary key (tenant_id,user_id)
);
create index marketing_membership_user on public.marketing_memberships(user_id,tenant_id) where active;

-- Private, fixed-search-path lookup prevents recursive membership policies and validates
-- revocation against the live Auth session. User-editable metadata is never used.
create function private.marketing_owner(p_tenant uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select auth.jwt()->>'aal') = 'aal2',false) and exists (
    select 1 from public.marketing_memberships m join auth.sessions s on s.user_id=m.user_id
    where m.tenant_id=p_tenant and m.user_id=(select auth.uid()) and m.active and m.role='owner'
      and s.id=((select auth.jwt())->>'session_id')::uuid
      and (s.not_after is null or s.not_after>now())
  );
$$;
revoke all on function private.marketing_owner(uuid) from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.marketing_owner(uuid) to authenticated;
create function public.marketing_authorized(p_tenant uuid) returns boolean
language sql stable security invoker set search_path = '' as $$ select private.marketing_owner(p_tenant); $$;
revoke all on function public.marketing_authorized(uuid) from public,anon;
grant execute on function public.marketing_authorized(uuid) to authenticated;

create table public.marketing_reports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.marketing_tenants(id),
  source text not null check(source in ('ga4','search_console')),
  property_id text not null, start_date date not null, end_date date not null,
  extracted_at timestamptz not null default now(),
  payload jsonb not null check(jsonb_typeof(payload)='object' and pg_column_size(payload)<1048576),
  check (end_date>=start_date), unique(tenant_id,id)
);
create index marketing_reports_cache on public.marketing_reports(tenant_id,source,property_id,start_date,end_date,extracted_at desc);
create table public.marketing_agents (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.marketing_tenants(id),
  name text not null, version text not null, instructions_version text not null,
  enabled boolean not null default false, config jsonb not null default '{}',
  created_at timestamptz not null default now(), unique(tenant_id,id), unique(tenant_id,name,version)
);
create table public.marketing_executions (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.marketing_tenants(id),
  agent_id uuid not null, state text not null check(state in ('queued','running','completed','failed')),
  started_at timestamptz, finished_at timestamptz, usage jsonb not null default '{}',
  diagnostics jsonb not null default '{}', created_at timestamptz not null default now(),
  foreign key(tenant_id,agent_id) references public.marketing_agents(tenant_id,id), unique(tenant_id,id)
);
create index marketing_executions_agent on public.marketing_executions(tenant_id,agent_id,created_at desc);
-- Versioned append-only artifacts cover opportunities, recommendations, drafts,
-- approvals, publications and outcomes without prebuilding separate product systems.
create table public.marketing_artifacts (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.marketing_tenants(id),
  kind text not null check(kind in ('opportunity','recommendation','content_draft','approval','published_change','measurement','outcome')),
  title text not null, payload jsonb not null check(jsonb_typeof(payload)='object' and pg_column_size(payload)<1048576),
  execution_id uuid, parent_id uuid, actor_id uuid references auth.users(id),
  created_at timestamptz not null default now(), unique(tenant_id,id),
  foreign key(tenant_id,execution_id) references public.marketing_executions(tenant_id,id),
  foreign key(tenant_id,parent_id) references public.marketing_artifacts(tenant_id,id),
  check(kind<>'approval' or actor_id is not null)
);
create index marketing_artifacts_history on public.marketing_artifacts(tenant_id,kind,created_at desc);
create index marketing_artifacts_execution on public.marketing_artifacts(tenant_id,execution_id);
create index marketing_artifacts_parent on public.marketing_artifacts(tenant_id,parent_id);
create table public.marketing_evidence (
  tenant_id uuid not null, artifact_id uuid not null, report_id uuid not null,
  observation jsonb not null check(jsonb_typeof(observation)='object'),
  created_at timestamptz not null default now(), primary key(tenant_id,artifact_id,report_id),
  foreign key(tenant_id,artifact_id) references public.marketing_artifacts(tenant_id,id),
  foreign key(tenant_id,report_id) references public.marketing_reports(tenant_id,id)
);
create index marketing_evidence_report on public.marketing_evidence(tenant_id,report_id);

alter table public.marketing_tenants enable row level security;
create policy marketing_tenant_read on public.marketing_tenants for select to authenticated using(private.marketing_owner(id));
do $$ declare t text; begin
  foreach t in array array['marketing_memberships','marketing_reports','marketing_agents','marketing_executions','marketing_artifacts','marketing_evidence'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('create policy owner_read on public.%I for select to authenticated using(private.marketing_owner(tenant_id))',t);
  end loop;
end $$;
revoke all on public.marketing_tenants,public.marketing_memberships,public.marketing_reports,public.marketing_agents,public.marketing_executions,public.marketing_artifacts,public.marketing_evidence from anon,authenticated;
grant select on public.marketing_tenants,public.marketing_memberships,public.marketing_reports,public.marketing_agents,public.marketing_executions,public.marketing_artifacts,public.marketing_evidence to authenticated;
grant all on public.marketing_tenants,public.marketing_memberships,public.marketing_reports,public.marketing_agents,public.marketing_executions,public.marketing_artifacts,public.marketing_evidence to service_role;
-- Only report snapshots are written by this release. No browser can create owners,
-- run agents, approve recommendations or publish changes via the Data API.
grant insert on public.marketing_reports to authenticated;
create policy owner_report_insert on public.marketing_reports for insert to authenticated with check(private.marketing_owner(tenant_id));
insert into public.marketing_tenants(id,name) values('b329164a-f981-4acc-befc-2f0c70f8af10','The Augmented Architect');
commit;
