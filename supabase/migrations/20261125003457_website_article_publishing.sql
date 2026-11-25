begin;
-- No tables, grants on marketing records, policies or existing rows are changed.
-- The caller is the trusted website backend AFTER live owner/session authorization.
create function public.marketing_article_transition(p_command jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
 t uuid:=(p_command->>'tenantId')::uuid; actor uuid:=(p_command->>'actorId')::uuid;
 scope text:=p_command->>'environment'; slug text:=p_command->>'slug';
 request_id uuid:=(p_command->>'requestId')::uuid; phase text:=p_command->>'phase'; action text:=p_command->>'action';
 pointer_id uuid; event_id uuid; pointer public.marketing_artifacts%rowtype; operation public.marketing_artifacts%rowtype;
 revision public.marketing_artifacts%rowtype; approval public.marketing_artifacts%rowtype;
 old jsonb; next jsonb; result_payload jsonb; v integer; opportunity uuid; initial_date text;
begin
 if current_user <> 'service_role' then raise exception 'PUBLICATION_FORBIDDEN' using errcode='42501'; end if;
 if not exists(select 1 from public.marketing_memberships where tenant_id=t and user_id=actor and role='owner' and active) then raise exception 'PUBLICATION_OWNER_REQUIRED' using errcode='42501'; end if;
 if t is null or actor is null or request_id is null or phase is null or action is null or scope is null or scope !~ '^(production|development|preview:[a-f0-9]{16})$' or slug is null or slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(slug)>150 or action not in ('publish','unpublish') or phase not in ('begin','verified','failed') then raise exception 'PUBLICATION_INVALID_COMMAND'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(t::text||':'||scope||':'||slug,0));
 pointer_id:=md5(t::text||':website-pointer:'||scope||':'||slug)::uuid;
 select * into pointer from public.marketing_artifacts where tenant_id=t and id=pointer_id;
 select * into operation from public.marketing_artifacts where id=request_id;
 if operation.id is not null then
  if operation.tenant_id<>t or operation.payload->>'workflow'<>'website-publication-operation/v1' or operation.actor_id<>actor or operation.payload->>'environment'<>scope or operation.payload->>'slug'<>slug or operation.payload->>'action'<>action or operation.payload->>'revisionId' is distinct from p_command->>'revisionId' or operation.payload->>'revisionHash' is distinct from p_command->>'revisionHash' then raise exception 'PUBLICATION_REQUEST_CONFLICT' using errcode='23505'; end if;
  if phase='begin' or operation.payload->>'status'<>'verifying' then return operation.payload||jsonb_build_object('reused',true); end if;
 else
  if phase<>'begin' then raise exception 'PUBLICATION_OPERATION_NOT_FOUND'; end if;
 end if;
 if pointer.id is not null and (pointer.kind<>'measurement' or pointer.payload->>'workflow'<>'website-publication-pointer/v1') then raise exception 'PUBLICATION_POINTER_CONFLICT'; end if;
 v:=coalesce((pointer.payload->>'version')::integer,0);
 if phase='begin' then
  if v<>(p_command->>'expectedVersion')::integer then raise exception 'PUBLICATION_STALE_VERSION' using errcode='40001'; end if;
  if pointer.payload->>'status'='verifying' then raise exception 'PUBLICATION_VERIFICATION_PENDING' using errcode='40001'; end if;
  if action='publish' and pointer.payload->>'status'='live' and pointer.payload->>'revisionId'=p_command->>'revisionId' and pointer.payload->>'revisionHash'=p_command->>'revisionHash' and pointer.payload->>'publicHash'=p_command->>'publicHash' then return jsonb_build_object('status','live','reused',true); end if;
  select * into revision from public.marketing_artifacts where tenant_id=t and id=(p_command->>'revisionId')::uuid and kind='content_draft' and payload->>'workflow'='content-revision/v1';
  if revision.id is null or revision.payload->>'revisionHash'<>p_command->>'revisionHash' then raise exception 'PUBLICATION_REVISION_MISMATCH'; end if;
  opportunity:=revision.parent_id;
  if pointer.id is not null and pointer.parent_id<>opportunity then raise exception 'PUBLICATION_SLUG_CONFLICT' using errcode='23505'; end if;
  if action='publish' then
   select * into approval from public.marketing_artifacts where tenant_id=t and id=(p_command->>'approvalId')::uuid and kind='approval' and parent_id=revision.id and payload->>'workflow'='content-publication-approval/v1' and payload->>'channel'='website' and payload->>'revisionHash'=revision.payload->>'revisionHash';
   if approval.id is null then raise exception 'PUBLICATION_EXACT_APPROVAL_REQUIRED' using errcode='42501'; end if;
   if exists(select 1 from public.marketing_artifacts where tenant_id=t and kind='content_draft' and payload->>'workflow'='content-revision/v1' and payload->>'parentRevisionId'=revision.id::text) then raise exception 'PUBLICATION_REVISION_SUPERSEDED' using errcode='40001'; end if;
   if p_command->'article'->>'status'<>'published' or p_command->'article'->>'slug'<>slug or p_command->>'publicHash' !~ '^[a-f0-9]{64}$' or p_command->'article'->>'publishedDate' !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'PUBLICATION_INVALID_SNAPSHOT'; end if;
   initial_date:=coalesce(pointer.payload->>'firstPublicationDate',p_command->'article'->>'publishedDate');
   if initial_date<>p_command->'article'->>'publishedDate' then raise exception 'PUBLICATION_DATE_CHANGED'; end if;
  else
   if pointer.id is null or not coalesce((pointer.payload->>'active')::boolean,false) or pointer.payload->>'revisionId'<>revision.id::text then raise exception 'PUBLICATION_NOT_ACTIVE'; end if;
   initial_date:=pointer.payload->>'firstPublicationDate';
  end if;
  old:=pointer.payload;
  result_payload:=p_command - 'phase' - 'expectedVersion' || jsonb_build_object('domain','content-workflow','workflow','website-publication-operation/v1','status','verifying','previousPointer',old,'startedAt',clock_timestamp());
  insert into public.marketing_artifacts(id,tenant_id,kind,title,parent_id,actor_id,payload) values(request_id,t,'measurement','Website publication request',opportunity,actor,result_payload);
  next:=coalesce(old,'{}'::jsonb)||jsonb_build_object('domain','content-workflow','workflow','website-publication-pointer/v1','environment',scope,'slug',slug,'version',v+1,'status','verifying','active',action='publish','requestId',request_id,'revisionId',revision.id,'revisionHash',revision.payload->>'revisionHash','firstPublicationDate',initial_date,'canonicalUrl',p_command->>'canonicalUrl','publicHash',case when action='publish' then p_command->>'publicHash' else null end,'article',case when action='publish' then p_command->'article' else old->'article' end);
  insert into public.marketing_artifacts(id,tenant_id,kind,title,parent_id,actor_id,payload) values(pointer_id,t,'measurement','Website publication state',opportunity,actor,next)
  on conflict(id) do update set payload=excluded.payload,actor_id=excluded.actor_id;
  return result_payload - 'previousPointer';
 end if;
 if pointer.payload->>'requestId'<>request_id::text or pointer.payload->>'status'<>'verifying' then raise exception 'PUBLICATION_OPERATION_SUPERSEDED' using errcode='40001'; end if;
 opportunity:=operation.parent_id;
 if phase='verified' then
  if coalesce(p_command->'verificationReceipt'->>'listStatus','')<>'200' or coalesce(p_command->'verificationReceipt'->>'sitemapStatus','')<>'200' or (action='publish' and (coalesce(p_command->'verificationReceipt'->>'pageStatus','')<>'200' or coalesce(p_command->'verificationReceipt'->>'versionMatched','')<>'true' or coalesce(p_command->'verificationReceipt'->>'canonicalMatched','')<>'true')) or (action='unpublish' and (coalesce(p_command->'verificationReceipt'->>'pageStatus','') not in ('404','410') or coalesce(p_command->'verificationReceipt'->>'withdrawalVerified','')<>'true')) then raise exception 'PUBLICATION_VERIFICATION_RECEIPT_REQUIRED'; end if;
  next:=pointer.payload||jsonb_build_object('status',case when action='publish' then 'live' else 'unpublished' end,'version',v+1,'verifiedAt',clock_timestamp());
  event_id:=md5(request_id::text||':verified-publication')::uuid;
  result_payload:=(operation.payload - 'previousPointer' - 'article')||jsonb_build_object('domain','content-workflow','workflow','content-publication/v2','channel','website','status',next->>'status','verification','http_verified','verificationReceipt',p_command->'verificationReceipt','verifiedAt',clock_timestamp(),'publicationDate',next->>'firstPublicationDate','url',next->>'canonicalUrl','publicHash',next->>'publicHash');
  insert into public.marketing_artifacts(id,tenant_id,kind,title,parent_id,actor_id,payload) values(event_id,t,'published_change',case when action='publish' then 'Verified website publication' else 'Verified website withdrawal' end,opportunity,actor,result_payload);
 else
  next:=coalesce(operation.payload->'previousPointer','{}'::jsonb);
  if next='null'::jsonb or next='{}'::jsonb then next:=pointer.payload||jsonb_build_object('active',false,'status','verification_failed'); end if;
  next:=next||jsonb_build_object('version',v+1,'lastFailedRequestId',request_id);
 end if;
 update public.marketing_artifacts set payload=next where tenant_id=t and id=pointer_id;
 result_payload:=operation.payload||jsonb_build_object('status',case when phase='verified' then next->>'status' else 'verification_failed' end,'finishedAt',clock_timestamp(),'failureCode',case when phase='failed' then 'PUBLICATION_HTTP_VERIFICATION_FAILED' else null end);
 update public.marketing_artifacts a set payload=result_payload where a.tenant_id=t and a.id=request_id;
 return result_payload - 'previousPointer';
end;
$$;
revoke all on function public.marketing_article_transition(jsonb) from public,anon,authenticated;
grant execute on function public.marketing_article_transition(jsonb) to service_role;
comment on function public.marketing_article_transition(jsonb) is 'Service-only atomic article state/history transitions. The website must verify the live owner session and construct a validated public snapshot. No RLS or public grants are changed.';
commit;
