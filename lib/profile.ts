import { supabase } from "./supabase";
import { tierFor } from "./elo";

export interface ProfileState {
  streak: number;
  tier: string;
  lastActive: string | null; // YYYY-MM-DD
}

const DEFAULT_PROFILE: ProfileState = { streak: 0, tier: "Rookie", lastActive: null };

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// Loads the pseudonymous user's streak/tier from `profiles`. Returns defaults
// (streak 0 / Rookie) if no row exists yet — we deliberately do NOT create the
// row here. The row is created lazily by saveStreak() (an upsert) the first
// time there's actually a streak to persist; a brand-new visitor with no row
// reads as streak 0, and cast_vote treats a missing profile the same way. This
// avoids an eager insert racing the just-established auth session.
export async function loadProfile(userId: string): Promise<ProfileState> {
  if (!supabase) return DEFAULT_PROFILE;

  const { data, error } = await supabase
    .from("profiles")
    .select("streak, tier, last_active_date")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Profile load failed:", error.message);
    return DEFAULT_PROFILE;
  }
  return data
    ? { streak: data.streak, tier: data.tier, lastActive: data.last_active_date }
    : DEFAULT_PROFILE;
}

// Persists a streak change (keeps tier + last_active_date in sync). Derives the
// tier from the streak via the same pure lib/elo helper the UI uses.
export async function saveStreak(userId: string, streak: number): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("profiles").upsert({
    id: userId,
    streak,
    tier: tierFor(streak).name,
    last_active_date: today(),
  });
  if (error) console.error("Streak save failed:", error.message);
}
