create table public.veyra_cases (
  id uuid primary key,
  org_id text not null,
  scenario text not null check (scenario in ('supplier', 'shipment', 'registration')),
  mode text not null check (mode in ('fixture', 'test', 'live')),
  state text not null,
  external_ref text,
  idempotency_key text,
  request_hash text not null,
  record jsonb not null check (jsonb_typeof(record) = 'object'),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique (org_id, idempotency_key),
  unique (org_id, external_ref)
);

create index veyra_cases_org_created on public.veyra_cases (org_id, created_at desc);
create index veyra_cases_org_scenario_state on public.veyra_cases (org_id, scenario, state);

create table public.veyra_events (
  id uuid primary key,
  org_id text not null,
  case_id uuid not null references public.veyra_cases(id) on delete cascade,
  event_type text not null,
  mode text not null check (mode in ('fixture', 'test', 'live')),
  actor_type text not null,
  payload_redacted jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null
);

create index veyra_events_org_case_time on public.veyra_events (org_id, case_id, occurred_at desc);
create index veyra_events_org_time on public.veyra_events (org_id, occurred_at desc);

alter table public.veyra_cases enable row level security;
alter table public.veyra_cases force row level security;
alter table public.veyra_events enable row level security;
alter table public.veyra_events force row level security;

revoke all on table public.veyra_cases, public.veyra_events from public, anon, authenticated;
grant select, insert, update on table public.veyra_cases to service_role;
grant select, insert on table public.veyra_events to service_role;

create or replace function public.veyra_create_case(
  p_id uuid,
  p_org_id text,
  p_scenario text,
  p_mode text,
  p_external_ref text,
  p_idempotency_key text,
  p_request_hash text,
  p_record jsonb,
  p_event_id uuid,
  p_event_at timestamptz
) returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_case public.veyra_cases;
begin
  insert into public.veyra_cases (id, org_id, scenario, mode, state, external_ref, idempotency_key, request_hash, record, created_at, updated_at)
  values (p_id, p_org_id, p_scenario, p_mode, p_record->>'state', p_external_ref, p_idempotency_key, p_request_hash, p_record, p_event_at, p_event_at)
  returning * into v_case;

  insert into public.veyra_events (id, org_id, case_id, event_type, mode, actor_type, payload_redacted, occurred_at)
  values (p_event_id, p_org_id, p_id, 'case.created', p_mode, 'user', jsonb_build_object('scenario', p_scenario, 'mode', p_mode), p_event_at);

  return jsonb_build_object('ok', true, 'record', v_case.record);
end;
$$;

create or replace function public.veyra_mutate_case(
  p_org_id text,
  p_case_id uuid,
  p_action text,
  p_payload jsonb,
  p_event_id uuid,
  p_event_at timestamptz
) returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_case public.veyra_cases;
  v_record jsonb;
  v_action text := p_action;
  v_mode text;
begin
  select * into v_case
  from public.veyra_cases
  where id = p_case_id and org_id = p_org_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'status', 404, 'code', 'CASE_NOT_FOUND', 'message', 'The case was not found.');
  end if;

  if v_action = 'save_plan' then
    v_record := v_case.record || (p_payload->'patch') || jsonb_build_object('updatedAt', p_event_at);
    update public.veyra_cases set record = v_record, state = 'planned', updated_at = p_event_at where id = p_case_id returning * into v_case;
    insert into public.veyra_events (id, org_id, case_id, event_type, mode, actor_type, payload_redacted, occurred_at)
    values (p_event_id, p_org_id, p_case_id, 'plan.validated', v_case.mode, 'user', jsonb_build_object('reasoningMode', p_payload->>'reasoningMode', 'requestId', p_payload->'requestId', 'model', p_payload->'model'), p_event_at);

  elsif v_action = 'fixture_evidence' then
    if v_case.record->>'evidence' is not null then
      return jsonb_build_object('ok', true, 'record', v_case.record, 'claimed', false);
    end if;
    if v_case.mode <> 'fixture' then
      return jsonb_build_object('ok', false, 'status', 403, 'code', 'MODE_BLOCKED', 'message', 'This operation requires a configured live evidence adapter.');
    end if;
    if v_case.record->>'plan' is null then
      return jsonb_build_object('ok', false, 'status', 409, 'code', 'PLAN_REQUIRED', 'message', 'Create and validate an evidence plan before retrieving evidence.');
    end if;
    v_record := v_case.record || (p_payload->'patch') || jsonb_build_object('updatedAt', p_event_at);
    update public.veyra_cases set record = v_record, state = v_record->>'state', updated_at = p_event_at where id = p_case_id returning * into v_case;
    insert into public.veyra_events (id, org_id, case_id, event_type, mode, actor_type, payload_redacted, occurred_at)
    values (p_event_id, p_org_id, p_case_id, 'fixture.evidence_returned', v_case.mode, 'user', p_payload->'eventPayload', p_event_at);

  elsif v_action = 'save_passport_session' then
    if v_case.mode <> 'live' then
      return jsonb_build_object('ok', false, 'status', 409, 'code', 'LIVE_MODE_REQUIRED', 'message', 'Passport sessions are available only for live cases.');
    end if;
    if v_case.record->>'evidence' is not null or v_case.record->>'operationId' is not null then
      return jsonb_build_object('ok', false, 'status', 409, 'code', 'OPERATION_ALREADY_STARTED', 'message', 'This case already has an evidence operation.');
    end if;
    v_record := v_case.record || (p_payload->'patch') || jsonb_build_object('updatedAt', p_event_at);
    update public.veyra_cases set record = v_record, updated_at = p_event_at where id = p_case_id returning * into v_case;
    insert into public.veyra_events (id, org_id, case_id, event_type, mode, actor_type, payload_redacted, occurred_at)
    values (p_event_id, p_org_id, p_case_id, 'passport.session_requested', v_case.mode, 'user', p_payload->'eventPayload', p_event_at);

  elsif v_action = 'update_passport_session' then
    if v_case.record->>'passportSession' is null then
      return jsonb_build_object('ok', false, 'status', 404, 'code', 'SESSION_NOT_FOUND', 'message', 'This case has no Passport session request.');
    end if;
    v_record := jsonb_set(v_case.record, '{passportSession}', p_payload->'session', true) || jsonb_build_object('updatedAt', p_event_at);
    update public.veyra_cases set record = v_record, updated_at = p_event_at where id = p_case_id returning * into v_case;
    insert into public.veyra_events (id, org_id, case_id, event_type, mode, actor_type, payload_redacted, occurred_at)
    values (p_event_id, p_org_id, p_case_id, 'passport.session_status', v_case.mode, 'user', p_payload->'eventPayload', p_event_at);

  elsif v_action = 'claim_provider_operation' then
    v_mode := p_payload->>'mode';
    if v_case.mode <> v_mode then
      return jsonb_build_object('ok', false, 'status', 409, 'code', 'MODE_REQUIRED', 'message', format('This case is not in %s mode.', v_mode));
    end if;
    if v_case.record->>'plan' is null or v_case.record->>'planMode' <> 'serv' then
      return jsonb_build_object('ok', false, 'status', 409, 'code', 'SERV_PLAN_REQUIRED', 'message', 'Create a validated SERV plan before retrieving provider evidence.');
    end if;
    if v_case.record->>'evidence' is not null then
      return jsonb_build_object('ok', true, 'record', v_case.record, 'claimed', false);
    end if;
    if v_case.scenario <> 'shipment' and (v_case.record->'passportSession'->>'state' <> 'active' or v_case.record->'passportSession'->>'sessionId' is null) then
      return jsonb_build_object('ok', false, 'status', 409, 'code', 'ACTIVE_SESSION_REQUIRED', 'message', 'Approve an active task-specific Passport session before running this paid request.');
    end if;
    if v_case.record->>'operationId' is not null then
      return jsonb_build_object('ok', false, 'status', 409, 'code', 'OPERATION_ALREADY_STARTED', 'message', 'A live request has already started for this case. Check its status before taking further action.');
    end if;
    v_record := v_case.record || (p_payload->'patch') || jsonb_build_object('updatedAt', p_event_at);
    update public.veyra_cases set record = v_record, state = 'in_progress', updated_at = p_event_at where id = p_case_id returning * into v_case;
    insert into public.veyra_events (id, org_id, case_id, event_type, mode, actor_type, payload_redacted, occurred_at)
    values (p_event_id, p_org_id, p_case_id, v_mode || '.operation_started', v_mode, 'user', p_payload->'eventPayload', p_event_at);
    return jsonb_build_object('ok', true, 'record', v_case.record, 'claimed', true);

  elsif v_action = 'mark_operation_unknown' then
    v_mode := v_case.mode;
    if v_case.record->>'operationId' <> p_payload->>'operationId' then
      return jsonb_build_object('ok', false, 'status', 409, 'code', 'OPERATION_NOT_ACTIVE', 'message', 'The live operation is not in a state that can accept a result.');
    end if;
    v_record := v_case.record || (p_payload->'patch') || jsonb_build_object('updatedAt', p_event_at);
    update public.veyra_cases set record = v_record, state = 'blocked', updated_at = p_event_at where id = p_case_id returning * into v_case;
    insert into public.veyra_events (id, org_id, case_id, event_type, mode, actor_type, payload_redacted, occurred_at)
    values (p_event_id, p_org_id, p_case_id, v_mode || '.operation_result_unknown', v_mode, 'user', p_payload->'eventPayload', p_event_at);

  elsif v_action = 'complete_provider_operation' then
    v_mode := p_payload->>'mode';
    if v_case.mode <> v_mode then
      return jsonb_build_object('ok', false, 'status', 409, 'code', 'MODE_REQUIRED', 'message', format('This case is not in %s mode.', v_mode));
    end if;
    if v_case.record->>'evidence' is not null then
      return jsonb_build_object('ok', true, 'record', v_case.record);
    end if;
    if v_case.record->>'operationId' <> p_payload->>'operationId' or v_case.record->>'operationState' <> 'in_progress' then
      return jsonb_build_object('ok', false, 'status', 409, 'code', 'OPERATION_NOT_ACTIVE', 'message', 'The live operation is not in a state that can accept a result.');
    end if;
    v_record := v_case.record || (p_payload->'patch') || jsonb_build_object('updatedAt', p_event_at);
    update public.veyra_cases set record = v_record, state = 'needs_review', updated_at = p_event_at where id = p_case_id returning * into v_case;
    insert into public.veyra_events (id, org_id, case_id, event_type, mode, actor_type, payload_redacted, occurred_at)
    values (p_event_id, p_org_id, p_case_id, v_mode || '.evidence_returned', v_mode, 'user', p_payload->'eventPayload', p_event_at);

  elsif v_action = 'record_review' then
    if p_payload->>'action' not in ('request_more_evidence', 'keep_on_hold', 'close_review') then
      return jsonb_build_object('ok', false, 'status', 422, 'code', 'INVALID_REVIEW_ACTION', 'message', 'Choose a supported review action.');
    end if;
    v_record := v_case.record || (p_payload->'patch') || jsonb_build_object('updatedAt', p_event_at);
    update public.veyra_cases set record = v_record, updated_at = p_event_at where id = p_case_id returning * into v_case;
    insert into public.veyra_events (id, org_id, case_id, event_type, mode, actor_type, payload_redacted, occurred_at)
    values (p_event_id, p_org_id, p_case_id, 'human.review_recorded', v_case.mode, 'user', p_payload->'eventPayload', p_event_at);

  else
    return jsonb_build_object('ok', false, 'status', 400, 'code', 'INVALID_STORE_ACTION', 'message', 'The requested storage action is not supported.');
  end if;

  return jsonb_build_object('ok', true, 'record', v_case.record);
end;
$$;

revoke all on function public.veyra_create_case(uuid, text, text, text, text, text, text, jsonb, uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.veyra_mutate_case(text, uuid, text, jsonb, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.veyra_create_case(uuid, text, text, text, text, text, text, jsonb, uuid, timestamptz) to service_role;
grant execute on function public.veyra_mutate_case(text, uuid, text, jsonb, uuid, timestamptz) to service_role;
