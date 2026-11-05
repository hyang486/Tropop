-- J2: make janitor run failures detectable. NOT YET APPLIED (waiting for supervisor review).
-- invoke_janitor records each pg_net request id; private.janitor_health() joins them with net._http_response.
-- A run has failed when its response has a status other than 200, a transport error, or no response 5 minutes after the request.
-- J1 (stuck jobs) is handled in the function: claim order is attempts, then created_at; jobs with attempts >= 5 are counted as stuck.

create table if not exists private.janitor_runs (
  request_id bigint primary key,
  requested_at timestamptz not null default now()
);
alter table private.janitor_runs enable row level security;
revoke all on private.janitor_runs from public, anon, authenticated;

create or replace function private.invoke_janitor()
returns bigint language plpgsql security definer
set search_path = ''
as $$
declare
  v_secret text;
  v_id bigint;
begin
  select secret into v_secret from private.janitor_config where id = 1;
  v_id := net.http_post(
    url := 'https://wuhkyjksiiqzoxvonfuy.supabase.co/functions/v1/room-janitor',
    headers := jsonb_build_object('content-type', 'application/json', 'x-janitor-secret', v_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  insert into private.janitor_runs (request_id) values (v_id);
  delete from private.janitor_runs where requested_at < now() - interval '14 days';
  return v_id;
end;
$$;
revoke execute on function private.invoke_janitor() from public, anon, authenticated;

-- One row per recent run with a derived state: ok | failed | pending | missing_response.
create or replace function private.janitor_health()
returns table (request_id bigint, requested_at timestamptz, state text, status_code int, error_msg text, stuck_jobs bigint)
language sql stable security definer
set search_path = ''
as $$
  select r.request_id, r.requested_at,
    case
      when h.id is null and r.requested_at < now() - interval '5 minutes' then 'missing_response'
      when h.id is null then 'pending'
      when h.status_code = 200 and h.error_msg is null then 'ok'
      else 'failed'
    end,
    h.status_code, h.error_msg,
    (select count(*) from public.cleanup_jobs j where j.verified_empty_at is null and j.attempts >= 5)
  from private.janitor_runs r
  left join net._http_response h on h.id = r.request_id
  order by r.requested_at desc
  limit 20
$$;
revoke execute on function private.janitor_health() from public, anon, authenticated;
