-- Owner-approved password login. All table grants and tenant RLS stay in place.
begin;
alter table public.marketing_memberships add column require_mfa boolean not null default false;
comment on column public.marketing_memberships.require_mfa is 'Administrator-controlled, explicit MFA opt-in. Password login remains restricted to active owner memberships and live sessions.';

create function private.marketing_owner_status(p_tenant uuid) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce((
    select case when m.require_mfa and ((select auth.jwt())->>'aal')<>'aal2' then 'mfa_required' else 'allowed' end
    from public.marketing_memberships m join auth.sessions s on s.user_id=m.user_id
    where m.tenant_id=p_tenant and m.user_id=(select auth.uid()) and m.active and m.role='owner'
      and ((select auth.jwt())->>'aal') in ('aal1','aal2')
      and s.id=((select auth.jwt())->>'session_id')::uuid
      and (s.not_after is null or s.not_after>now())
    limit 1
  ),'denied');
$$;
revoke all on function private.marketing_owner_status(uuid) from public,anon;
grant execute on function private.marketing_owner_status(uuid) to authenticated;
create or replace function private.marketing_owner(p_tenant uuid) returns boolean
language sql stable security invoker set search_path = '' as $$
  select private.marketing_owner_status(p_tenant)='allowed';
$$;
create function public.marketing_owner_status(p_tenant uuid) returns text
language sql stable security invoker set search_path = '' as $$
  select private.marketing_owner_status(p_tenant);
$$;
revoke all on function public.marketing_owner_status(uuid) from public,anon;
grant execute on function public.marketing_owner_status(uuid) to authenticated;
commit;
