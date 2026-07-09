-- Server-authoritative company submission handler.
--
-- Clients call this via supabase.rpc('submit_company', {...}). It runs as
-- SECURITY DEFINER so it can insert into `companies` / `ratings` (which clients
-- cannot write directly under RLS). The company lands as status='pending' and
-- only appears in the app once an admin flips it to 'live' — moderation happens
-- in the Supabase dashboard for now (there is no in-app admin role yet).
--
-- Ratings are seeded at 1500 across all three dimensions, so an approved company
-- enters the arena Provisional, exactly like the seed set.
--
-- Apply with:  npm run db:apply-sql -- supabase/submit_company.sql

-- Track who submitted each company — used for light anti-spam (per-user daily
-- cap) and moderation context. Nullable so the seed companies (no submitter)
-- are unaffected.
alter table companies
  add column if not exists submitted_by uuid references auth.users(id);

create or replace function submit_company(
  p_name     text,
  p_website  text,
  p_category text,
  p_region   text,
  p_blurb    text default null,
  p_logo_url text default null
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_id   bigint;
  v_name text := btrim(p_name);
  v_site text := btrim(p_website);
begin
  -- ---- validation ----
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if v_name = '' or char_length(v_name) > 80 then
    raise exception 'name must be 1–80 characters';
  end if;
  if v_site = '' or char_length(v_site) > 200 then
    raise exception 'a website is required';
  end if;
  if coalesce(btrim(p_category), '') = '' or coalesce(btrim(p_region), '') = '' then
    raise exception 'category and region are required';
  end if;

  -- ---- light anti-spam: cap pending submissions per user per day ----
  if (
    select count(*) from companies
    where submitted_by = v_user
      and status = 'pending'
      and created_at >= date_trunc('day', now())
  ) >= 5 then
    raise exception 'daily submission limit reached — try again tomorrow'
      using errcode = 'P0001';
  end if;

  -- ---- reject an obvious duplicate (same name, case-insensitive) ----
  -- Keeps the moderation queue clean; covers live, pending and graduated.
  if exists (select 1 from companies where lower(name) = lower(v_name)) then
    raise exception 'a company named "%" is already in the system', v_name
      using errcode = 'P0001';
  end if;

  -- ---- insert as pending + seed the three ratings rows ----
  insert into companies (name, website, category, region, stage, blurb, logo_url, status, submitted_by)
    values (
      v_name,
      v_site,
      btrim(p_category),
      btrim(p_region),
      'Growth',
      nullif(btrim(coalesce(p_blurb, '')), ''),
      nullif(btrim(coalesce(p_logo_url, '')), ''),
      'pending',
      v_user
    )
    returning id into v_id;

  insert into ratings (company_id, dimension)
    values (v_id, 'V'), (v_id, 'G'), (v_id, 'D');

  return v_id;
end;
$$;

-- Only signed-in (incl. anonymous) users may submit; nobody writes companies or
-- ratings directly under RLS. Submissions flow exclusively through this function.
revoke all on function submit_company(text, text, text, text, text, text) from public;
grant execute on function submit_company(text, text, text, text, text, text) to authenticated;
