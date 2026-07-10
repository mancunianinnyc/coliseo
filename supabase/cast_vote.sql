-- Server-authoritative vote handler.
--
-- Clients call this via supabase.rpc('cast_vote', {...}). It runs as
-- SECURITY DEFINER so it can update `ratings` (which clients cannot write
-- directly under RLS). It validates the vote, enforces one pick per dimension
-- per day, applies the Elo change atomically, and appends to the votes log.
--
-- ⚠️  KEEP THE ELO CONSTANTS BELOW IN SYNC WITH lib/elo.ts (K-factors,
--     confidence thresholds, and the streak→tier→weight ladder). The formula
--     is intentionally small and stable; if you change it in one place, change
--     it in the other.
--
-- Apply with:  npm run db:apply-sql -- supabase/cast_vote.sql

create or replace function cast_vote(
  p_company_a bigint,
  p_company_b bigint,
  p_dimension text,
  p_winner    bigint,
  p_tz_offset int default 0
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_voter  uuid := auth.uid();
  v_loser  bigint;
  v_streak int;
  v_weight numeric;
  v_tier   text;
  w_elo int; w_games int; w_stage text;
  l_elo int; l_games int; l_stage text;
  v_ew numeric; v_kw numeric; v_kl numeric;
  v_dw int; v_dl int;
begin
  -- ---- validation ----
  if v_voter is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  -- Light anti-abuse guard. The helper/table are created by
  -- supabase/launch_hardening.sql.
  perform private.check_rpc_rate_limit('cast_vote', 12, 60, interval '10 minutes');

  if p_dimension not in ('V','G','D') then
    raise exception 'invalid dimension: %', p_dimension;
  end if;
  if p_company_a = p_company_b then
    raise exception 'companies must differ';
  end if;
  if p_winner <> p_company_a and p_winner <> p_company_b then
    raise exception 'winner must be one of the two companies';
  end if;

  v_loser := case when p_winner = p_company_a then p_company_b else p_company_a end;

  -- ---- daily limit: 3 picks per LOCAL calendar day (any dimension) ----
  -- The game asks one question per day and runs a 3-round "king of the hill"
  -- gauntlet on it, so all 3 of a day's votes share the same dimension. Reset on
  -- the voter's LOCAL midnight, not UTC — otherwise UTC midnight (e.g. 7pm in
  -- Colombia) rolls someone's evening play into "today" and locks them out the
  -- next morning. p_tz_offset is the browser's getTimezoneOffset (minutes behind
  -- UTC; 300 for UTC-5), so local time = UTC - offset.
  if (
    select count(*) from votes
    where voter_id = v_voter
      and ((created_at at time zone 'UTC') - make_interval(mins => p_tz_offset))::date
        = ((now()      at time zone 'UTC') - make_interval(mins => p_tz_offset))::date
  ) >= 3 then
    raise exception 'already voted 3 times today'
      using errcode = 'P0001';
  end if;

  -- ---- voter credibility weight (KEEP IN SYNC WITH lib/elo.ts TIERS) ----
  select coalesce(streak, 0) into v_streak from profiles where id = v_voter;
  v_streak := coalesce(v_streak, 0);
  if    v_streak >= 30 then v_weight := 1.35; v_tier := 'Legend';
  elsif v_streak >= 14 then v_weight := 1.28; v_tier := 'Oracle';
  elsif v_streak >= 7  then v_weight := 1.22; v_tier := 'Analyst';
  elsif v_streak >= 4  then v_weight := 1.15; v_tier := 'Sharp';
  elsif v_streak >= 2  then v_weight := 1.08; v_tier := 'Regular';
  else                      v_weight := 1.00; v_tier := 'Rookie';
  end if;

  -- ---- lock both ratings rows for this dimension (atomic, race-safe) ----
  select r.elo, r.games, c.stage into w_elo, w_games, w_stage
    from ratings r join companies c on c.id = r.company_id
    where r.company_id = p_winner and r.dimension = p_dimension
    for update;
  select r.elo, r.games, c.stage into l_elo, l_games, l_stage
    from ratings r join companies c on c.id = r.company_id
    where r.company_id = v_loser and r.dimension = p_dimension
    for update;

  if w_elo is null or l_elo is null then
    raise exception 'ratings not found for one of the companies';
  end if;

  -- ---- Elo (KEEP FORMULA IN SYNC WITH lib/elo.ts) ----
  -- expected = 1 / (1 + 10^((eb - ea)/400))
  v_ew := 1.0 / (1.0 + power(10.0, (l_elo - w_elo) / 400.0));
  -- K = 48 while provisional (<10 games), else 20 Late-stage / 32 Growth-stage
  v_kw := case when w_games < 10 then 48 when w_stage = 'Late' then 20 else 32 end;
  v_kl := case when l_games < 10 then 48 when l_stage = 'Late' then 20 else 32 end;
  v_dw := round(v_kw * (1 - v_ew) * v_weight);
  v_dl := round(v_kl * (0 - (1 - v_ew)) * v_weight);

  update ratings
     set elo = elo + v_dw, games = games + 1, week_movement = week_movement + v_dw
   where company_id = p_winner and dimension = p_dimension;
  update ratings
     set elo = elo + v_dl, games = games + 1, week_movement = week_movement + v_dl
   where company_id = v_loser and dimension = p_dimension;

  -- ---- append to the immutable comparison log ----
  insert into votes (voter_id, company_a, company_b, dimension, winner, voter_tier)
    values (v_voter, p_company_a, p_company_b, p_dimension, p_winner, v_tier);

  return jsonb_build_object(
    'winner',    p_winner,
    'loser',     v_loser,
    'dimension', p_dimension,
    'dw',        v_dw,
    'dl',        v_dl,
    'winnerElo', w_elo + v_dw,
    'loserElo',  l_elo + v_dl
  );
end;
$$;

-- Only signed-in (incl. anonymous) users may call it; nobody may write ratings
-- directly. Votes now flow exclusively through this function, so remove the
-- old client-side direct-insert policy.
-- Drop the old timezone-naive 4-arg signature so only the local-day-aware
-- version remains (avoids overload ambiguity).
drop function if exists cast_vote(bigint, bigint, text, bigint);
revoke all on function cast_vote(bigint, bigint, text, bigint, int) from public, anon;
grant execute on function cast_vote(bigint, bigint, text, bigint, int) to authenticated;
drop policy if exists "insert own votes" on votes;
