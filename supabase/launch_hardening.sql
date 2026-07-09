-- Launch hardening for ConvictionELO.
--
-- Applied to production on 2026-07-09. Keep this checked in so the live
-- Supabase state is reproducible from the repo.
--
-- Apply with:
--   npm run db:apply-sql -- supabase/launch_hardening.sql

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_tables
    where schemaname = 'private' and tablename = 'rpc_rate_limits'
  ) then
    create table private.rpc_rate_limits (
      id bigserial primary key,
      action text not null,
      user_id uuid,
      ip inet,
      request_at timestamptz not null default now()
    );
  end if;
end $$;

create index if not exists rpc_rate_limits_action_user_time_idx
  on private.rpc_rate_limits (action, user_id, request_at desc);
create index if not exists rpc_rate_limits_action_ip_time_idx
  on private.rpc_rate_limits (action, ip, request_at desc);

create or replace function private.check_rpc_rate_limit(
  p_action text,
  p_user_limit integer,
  p_ip_limit integer,
  p_window interval
) returns void
language plpgsql
security definer
set search_path = private, public
as $$
declare
  v_user uuid := auth.uid();
  v_headers jsonb := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  v_ip_text text := nullif(split_part(coalesce(v_headers->>'x-forwarded-for', ''), ',', 1), '');
  v_ip inet;
  v_user_count integer;
  v_ip_count integer;
begin
  begin
    v_ip := v_ip_text::inet;
  exception when others then
    v_ip := null;
  end;

  if v_user is not null then
    select count(*) into v_user_count
    from private.rpc_rate_limits
    where action = p_action
      and user_id = v_user
      and request_at >= now() - p_window;

    if v_user_count >= p_user_limit then
      raise exception 'rate limit exceeded - try again shortly' using errcode = 'P0001';
    end if;
  end if;

  if v_ip is not null then
    select count(*) into v_ip_count
    from private.rpc_rate_limits
    where action = p_action
      and ip = v_ip
      and request_at >= now() - p_window;

    if v_ip_count >= p_ip_limit then
      raise exception 'rate limit exceeded - try again shortly' using errcode = 'P0001';
    end if;
  end if;

  insert into private.rpc_rate_limits(action, user_id, ip)
  values (p_action, v_user, v_ip);
end;
$$;

revoke all on function private.check_rpc_rate_limit(text, integer, integer, interval)
  from public, anon, authenticated;

create index if not exists companies_submitted_by_idx on public.companies (submitted_by);
create index if not exists companies_status_created_at_idx on public.companies (status, created_at desc);
create index if not exists company_unknowns_voter_id_idx on public.company_unknowns (voter_id);
create index if not exists company_unknowns_voter_company_dimension_idx
  on public.company_unknowns (voter_id, company_id, dimension);
create index if not exists revisions_company_id_idx on public.revisions (company_id);
create index if not exists revisions_author_id_idx on public.revisions (author_id);
create index if not exists revisions_reviewer_id_idx on public.revisions (reviewer_id);
create index if not exists revisions_status_created_at_idx on public.revisions (status, created_at desc);
create index if not exists votes_voter_id_idx on public.votes (voter_id);
create index if not exists votes_voter_created_at_idx on public.votes (voter_id, created_at desc);
create index if not exists votes_company_a_idx on public.votes (company_a);
create index if not exists votes_company_b_idx on public.votes (company_b);
create index if not exists votes_winner_idx on public.votes (winner);

alter table public.votes
  add column if not exists vote_day date;

update public.votes
set vote_day = (created_at at time zone 'UTC')::date
where vote_day is null;

alter table public.votes
  alter column vote_day set default ((now() at time zone 'UTC')::date),
  alter column vote_day set not null;

create unique index if not exists votes_one_dimension_per_day_uidx
  on public.votes (voter_id, dimension, vote_day);

drop policy if exists "read own votes" on public.votes;
create policy "read own votes" on public.votes
  for select to authenticated
  using ((select auth.uid()) = voter_id);

drop policy if exists "insert own unknowns" on public.company_unknowns;
create policy "insert own unknowns" on public.company_unknowns
  for insert to authenticated
  with check ((select auth.uid()) = voter_id);

drop policy if exists "insert own revisions" on public.revisions;
create policy "insert own revisions" on public.revisions
  for insert to authenticated
  with check ((select auth.uid()) = author_id);

drop policy if exists "upsert own profile" on public.profiles;
drop policy if exists "insert own profile" on public.profiles;
drop policy if exists "update own profile" on public.profiles;
create policy "insert own profile" on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = id);
create policy "update own profile" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

revoke all on function public.cast_vote(bigint, bigint, text, bigint) from public, anon;
revoke all on function public.submit_company(text, text, text, text, text, text) from public, anon;
grant execute on function public.cast_vote(bigint, bigint, text, bigint) to authenticated;
grant execute on function public.submit_company(text, text, text, text, text, text) to authenticated;

alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated, service_role, public;
alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated, service_role;
